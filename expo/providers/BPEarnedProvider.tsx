import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  createContext,
  useContext,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Award } from 'lucide-react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const BP_MILESTONES = [10, 50, 100, 200, 500, 1000] as const;

// ─── Audio (R2-hosted generated assets) ───────────────────────────────────────
const SOUND_NORMAL_URL =
  'https://r2-pub.rork.com/generated-audio/s1cjlqro1lgbsgyghi4tu/7a271305-34ea-471e-898f-c40e797b4813.mp3';
const SOUND_MILESTONE_URL =
  'https://r2-pub.rork.com/generated-audio/s1cjlqro1lgbsgyghi4tu/daf07af8-e3bf-46c4-bdf5-db2be233dd05.mp3';

let normalSound: Audio.Sound | null = null;
let milestoneSound: Audio.Sound | null = null;
let preloadPromise: Promise<void> | null = null;

async function preloadSounds(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadPromise = (async () => {
    try {
      const a = await Audio.Sound.createAsync(
        { uri: SOUND_NORMAL_URL },
        { shouldPlay: false, volume: 0.9 },
      );
      normalSound = a.sound;
      const b = await Audio.Sound.createAsync(
        { uri: SOUND_MILESTONE_URL },
        { shouldPlay: false, volume: 1.0 },
      );
      milestoneSound = b.sound;
    } catch {
      // Sound is optional — effects still play silently.
    }
  })();
  return preloadPromise;
}

async function playNormalSound(): Promise<void> {
  try {
    await preloadSounds();
    if (normalSound) {
      await normalSound.setPositionAsync(0);
      await normalSound.playAsync();
    }
  } catch {
    // ignore
  }
}

async function playMilestoneSound(): Promise<void> {
  try {
    await preloadSounds();
    if (milestoneSound) {
      await milestoneSound.setPositionAsync(0);
      await milestoneSound.playAsync();
    }
  } catch {
    // ignore
  }
}

let _eventId = 0;

// ─── Types ────────────────────────────────────────────────────────────────────

interface BPEvent {
  _id: number;
  amount: number;
  type: 'normal' | 'milestone';
  milestoneValue?: number;
}

interface BPEarnedContextValue {
  triggerEarned: (amount: number, totalBP: number) => void;
  /** Force-play a milestone celebration for preview (no normal popup). */
  triggerPreview: (milestone: number) => void;
  /** Force-play a normal BP-earned popup for preview. */
  triggerNormalPreview: (amount?: number) => void;
}

const BPEarnedContext = createContext<BPEarnedContextValue | null>(null);

export function useBPEarned(): BPEarnedContextValue {
  const ctx = useContext(BPEarnedContext);
  if (!ctx) throw new Error('useBPEarned must be used within BPEarnedProvider');
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface SparkleConfig {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  rise: number;
}

const SPARKLE_COLORS_GOLD = ['#D4AF37', '#FFD700', '#FFF8DC', '#FFE4B5'];
const SPARKLE_COLORS_LUX = ['#D4AF37', '#FFD700', '#FFF8DC', '#4FC3F7', '#FFFFFF', '#FFC0CB'];

function makeSparkles(count: number, colors: string[]): SparkleConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 240,
    y: (Math.random() - 0.5) * 200,
    size: 4 + Math.random() * 7,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 500,
    duration: 1100 + Math.random() * 900,
    drift: (Math.random() - 0.5) * 70,
    rise: 30 + Math.random() * 50,
  }));
}

interface ConfettiConfig {
  id: number;
  x: number;
  color: string;
  w: number;
  h: number;
  rotation: number;
  fallDuration: number;
  delay: number;
  drift: number;
}

const CONFETTI_COLORS = ['#FFD700', '#D4AF37', '#4FC3F7', '#FF69B4', '#FF8C42', '#9B59B6', '#2ECC71', '#FFFFFF'];

function makeConfetti(count: number): ConfettiConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_W,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    w: 7 + Math.random() * 7,
    h: 4 + Math.random() * 6,
    rotation: (Math.random() - 0.5) * 720,
    fallDuration: 2200 + Math.random() * 1600,
    delay: Math.random() * 700,
    drift: (Math.random() - 0.5) * 140,
  }));
}

/** Count-up hook: animates an integer from 0 → toValue and exposes display value. */
function useCountUp(toValue: number, durationMs: number, delayMs: number): number {
  const [display, setDisplay] = useState(0);
  const animRef = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setDisplay(0);
    animRef.setValue(0);
    const listener = animRef.addListener(({ value }: { value: number }) => {
      setDisplay(Math.floor(value));
    });
    const timer = setTimeout(() => {
      Animated.timing(animRef, {
        toValue,
        duration: durationMs,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }).start(() => {
        animRef.removeListener(listener);
        setDisplay(toValue);
      });
    }, delayMs);
    return () => {
      clearTimeout(timer);
      animRef.removeListener(listener);
    };
  }, [toValue, durationMs, delayMs, animRef]);

  return display;
}

// ─── Sparkles ─────────────────────────────────────────────────────────────────

function Sparkles({ particles }: { particles: SparkleConfig[] }) {
  const anims = useRef(
    particles.map(() => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    const all: Animated.CompositeAnimation[] = [];
    particles.forEach((p, i) => {
      const a = anims[i];
      a.opacity.setValue(0);
      a.scale.setValue(0);
      a.translateY.setValue(0);
      a.translateX.setValue(0);
      const anim = Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(a.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(a.opacity, { toValue: 0, duration: p.duration, useNativeDriver: true }),
          ]),
          Animated.spring(a.scale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
          Animated.timing(a.translateY, { toValue: -p.rise, duration: p.duration, useNativeDriver: true }),
          Animated.timing(a.translateX, { toValue: p.drift, duration: p.duration, useNativeDriver: true }),
        ]),
      ]);
      anim.start();
      all.push(anim);
    });
    return () => all.forEach((a) => a.stop());
  }, [anims, particles]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => {
        const a = anims[i];
        return (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: p.x - p.size / 2,
              marginTop: p.y - p.size / 2,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              opacity: a.opacity,
              transform: [
                { translateX: a.translateX },
                { translateY: a.translateY },
                { scale: a.scale },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function Confetti({ pieces }: { pieces: ConfettiConfig[] }) {
  const anims = useRef(
    pieces.map(() => ({
      translateY: new Animated.Value(-30),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    })),
  ).current;

  useEffect(() => {
    const all: Animated.CompositeAnimation[] = [];
    pieces.forEach((p, i) => {
      const a = anims[i];
      a.translateY.setValue(-30);
      a.translateX.setValue(0);
      a.rotate.setValue(0);
      a.opacity.setValue(1);
      const anim = Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(a.translateY, { toValue: SCREEN_H + 60, duration: p.fallDuration, useNativeDriver: true }),
          Animated.timing(a.translateX, { toValue: p.drift, duration: p.fallDuration, useNativeDriver: true }),
          Animated.timing(a.rotate, { toValue: 1, duration: p.fallDuration, useNativeDriver: true }),
          Animated.timing(a.opacity, {
            toValue: 0,
            duration: 500,
            delay: Math.max(0, p.fallDuration - 500),
            useNativeDriver: true,
          }),
        ]),
      ]);
      anim.start();
      all.push(anim);
    });
    return () => all.forEach((a) => a.stop());
  }, [anims, pieces]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        const a = anims[i];
        const rotate = a.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.rotation}deg`],
        });
        return (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: -30,
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              opacity: a.opacity,
              transform: [
                { translateX: a.translateX },
                { translateY: a.translateY },
                { rotate },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Normal Effect ────────────────────────────────────────────────────────────

function BPNormalEffect({ amount, onDone }: { amount: number; onDone: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const blueRing = useRef(new Animated.Value(0)).current;
  const count = useCountUp(amount, 700, 280);
  const sparkles = useMemo(() => makeSparkles(8, SPARKLE_COLORS_GOLD), []);

  useEffect(() => {
    void playNormalSound();
    Animated.timing(blueRing, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.3, duration: 550, useNativeDriver: true }),
      ]),
    );
    loop.start();

    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      ]),
      Animated.delay(1500),
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.5, duration: 280, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -40, duration: 280, useNativeDriver: true }),
      ]),
    ]).start(() => {
      loop.stop();
      onDone();
    });
  }, [blueRing, glowPulse, opacity, scale, translateY, onDone]);

  const ringScale = blueRing.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.6] });
  const ringOpacity = blueRing.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.6, 0] });
  const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] });
  const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Blue light expanding */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.32 + 36,
          left: SCREEN_W / 2 - 90,
          width: 180,
          height: 180,
          borderRadius: 90,
          borderWidth: 3,
          borderColor: '#4FC3F7',
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />

      <Animated.View style={[s.normalWrap, { opacity, transform: [{ scale }, { translateY }] }]}>
        {/* Pulsing gold glow behind icon */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -6,
            width: 78,
            height: 78,
            borderRadius: 39,
            backgroundColor: '#D4AF37',
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
            shadowColor: '#D4AF37',
            shadowOpacity: 0.7,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
        <View style={s.normalCard}>
          <View style={s.normalIconRing}>
            <View style={s.normalIconInner}>
              <Image source={require('@/assets/images/bp-logo.png')} style={s.bpLogo} resizeMode="contain" />
            </View>
          </View>
          <Text style={s.normalTitle}>BP獲得!</Text>
          <Text style={s.normalAmount}>+{count} BP</Text>
        </View>
      </Animated.View>

      {/* Sparkles around the card */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.32 - 60,
          left: SCREEN_W / 2 - 160,
          width: 320,
          height: 320,
        }}
      >
        <Sparkles particles={sparkles} />
      </View>
    </View>
  );
}

// ─── Milestone Effect ─────────────────────────────────────────────────────────

function BPMilestoneEffect({
  amount,
  milestone,
  onDone,
}: {
  amount: number;
  milestone: number;
  onDone: () => void;
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const blueBurst = useRef(new Animated.Value(0)).current;
  const goldPulse = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeRotateY = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const absorbY = useRef(new Animated.Value(0)).current;
  const absorbScale = useRef(new Animated.Value(1)).current;
  const absorbOpacity = useRef(new Animated.Value(1)).current;
  const count = useCountUp(milestone, 1200, 600);
  const sparkles = useMemo(() => makeSparkles(16, SPARKLE_COLORS_LUX), []);
  const confetti = useMemo(() => makeConfetti(32), []);

  useEffect(() => {
    void playMilestoneSound();
    Animated.timing(blueBurst, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
    const goldLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(goldPulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(goldPulse, { toValue: 0.3, duration: 650, useNativeDriver: true }),
      ]),
    );
    goldLoop.start();

    Animated.sequence([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      // Badge rotating appearance
      Animated.parallel([
        Animated.spring(badgeScale, { toValue: 1, friction: 3, tension: 50, useNativeDriver: true }),
        Animated.timing(badgeRotateY, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(textScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(2300),
      // Absorb into profile: fly up + shrink + fade
      Animated.parallel([
        Animated.timing(absorbY, {
          toValue: -SCREEN_H * 0.24,
          duration: 750,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(absorbScale, { toValue: 0.12, duration: 750, useNativeDriver: true }),
        Animated.timing(absorbOpacity, { toValue: 0, duration: 750, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(textScale, { toValue: 0.6, duration: 350, useNativeDriver: true }),
      ]),
      Animated.delay(120),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      goldLoop.stop();
      onDone();
    });
  }, [
    absorbOpacity,
    absorbScale,
    absorbY,
    badgeOpacity,
    badgeRotateY,
    badgeScale,
    blueBurst,
    goldPulse,
    onDone,
    overlayOpacity,
    textOpacity,
    textScale,
  ]);

  const burstScale = blueBurst.interpolate({ inputRange: [0, 1], outputRange: [0, 3.6] });
  const burstOpacity = blueBurst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.7, 0] });
  const goldOverlayOpacity = goldPulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.3] });
  const badgeSpin = badgeRotateY.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const badgeFinalOpacity = Animated.multiply(badgeOpacity, absorbOpacity);
  const badgeFinalScale = Animated.multiply(badgeScale, absorbScale);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, s.mOverlay, { opacity: overlayOpacity }]} />

      {/* Gold luxury overlay */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#D4AF37', opacity: goldOverlayOpacity }]}
      />

      {/* Blue light burst */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.28 + 90,
          left: SCREEN_W / 2 - 130,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: '#4FC3F7',
          opacity: burstOpacity,
          transform: [{ scale: burstScale }],
        }}
      />

      {/* Confetti */}
      <Confetti pieces={confetti} />

      {/* Sparkles around badge */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.28 - 50,
          left: SCREEN_W / 2 - 150,
          width: 300,
          height: 300,
        }}
      >
        <Sparkles particles={sparkles} />
      </View>

      {/* Badge (rotating appearance → absorbing to profile) */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.28,
          left: SCREEN_W / 2 - 100,
          width: 200,
          height: 200,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: badgeFinalOpacity,
          transform: [
            { scale: badgeFinalScale },
            { translateY: absorbY },
            { rotateY: badgeSpin },
          ],
        }}
      >
        <View style={s.mBadge}>
          <Award size={52} color="#D4AF37" />
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View style={[s.mTextWrap, { opacity: textOpacity, transform: [{ scale: textScale }] }]}>
        <Text style={s.mLabel}>実績解除!</Text>
        <Text style={s.mValue}>{count} BP 達成!</Text>
        {amount > 0 && <Text style={s.mSub}>+{amount} BP</Text>}
      </Animated.View>
    </View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

function checkMilestoneCrossed(prev: number, next: number): number | null {
  for (const m of BP_MILESTONES) {
    if (prev < m && next >= m) return m;
  }
  return null;
}

export function BPEarnedProvider({ children }: { children: React.ReactNode }) {
  const queueRef = useRef<BPEvent[]>([]);
  const processingRef = useRef(false);
  const [current, setCurrent] = useState<BPEvent | null>(null);

  useEffect(() => {
    void preloadSounds();
  }, []);

  const processNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      setCurrent(next);
    } else {
      processingRef.current = false;
    }
  }, []);

  const handleDone = useCallback(() => {
    setCurrent(null);
    setTimeout(processNext, 200);
  }, [processNext]);

  const triggerEarned = useCallback(
    (amount: number, totalBP: number) => {
      const prev = totalBP - amount;
      const milestone = checkMilestoneCrossed(prev, totalBP);

      if (milestone !== null) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        queueRef.current.push({ _id: ++_eventId, amount, type: 'milestone', milestoneValue: milestone });
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      queueRef.current.push({ _id: ++_eventId, amount, type: 'normal' });

      if (!processingRef.current) {
        processingRef.current = true;
        processNext();
      }
    },
    [processNext],
  );

  const triggerPreview = useCallback(
    (milestone: number) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      queueRef.current.push({
        _id: ++_eventId,
        amount: 0,
        type: 'milestone',
        milestoneValue: milestone,
      });

      if (!processingRef.current) {
        processingRef.current = true;
        processNext();
      }
    },
    [processNext],
  );

  const triggerNormalPreview = useCallback(
    (amount = 5) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      queueRef.current.push({
        _id: ++_eventId,
        amount,
        type: 'normal',
      });

      if (!processingRef.current) {
        processingRef.current = true;
        processNext();
      }
    },
    [processNext],
  );

  const ctxValue = useMemo(
    () => ({ triggerEarned, triggerPreview, triggerNormalPreview }),
    [triggerEarned, triggerPreview, triggerNormalPreview],
  );

  return (
    <BPEarnedContext.Provider value={ctxValue}>
      {children}
      {current && current.type === 'milestone' ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BPMilestoneEffect
            key={current._id}
            amount={current.amount}
            milestone={current.milestoneValue ?? 0}
            onDone={handleDone}
          />
        </View>
      ) : current && current.type === 'normal' ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BPNormalEffect key={current._id} amount={current.amount} onDone={handleDone} />
        </View>
      ) : null}
    </BPEarnedContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Normal
  normalWrap: {
    position: 'absolute',
    top: SCREEN_H * 0.32,
    alignSelf: 'center',
    alignItems: 'center',
  },
  normalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 36,
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF3760',
  },
  normalIconRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#D4AF3718',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  normalIconInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bpLogo: {
    width: 30,
    height: 30,
  },
  normalTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#B8860B',
    marginBottom: 4,
    letterSpacing: 1,
  },
  normalAmount: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#2C3E50',
  },
  // Milestone
  mOverlay: { backgroundColor: 'rgba(0,0,0,0.55)' },
  mBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 24,
    borderWidth: 3,
    borderColor: '#D4AF37',
  },
  mTextWrap: {
    position: 'absolute',
    top: SCREEN_H * 0.28 + 220,
    alignSelf: 'center',
    alignItems: 'center',
  },
  mLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  mValue: {
    fontSize: 36,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  mSub: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#D4AF37',
  },
});
