import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  createContext,
  useContext,
} from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Award } from 'lucide-react-native';

const { height: SCREEN_H } = Dimensions.get('window');

export const BP_MILESTONES = [10, 50, 100, 200, 500, 1000] as const;

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
}

const BPEarnedContext = createContext<BPEarnedContextValue | null>(null);

export function useBPEarned(): BPEarnedContextValue {
  const ctx = useContext(BPEarnedContext);
  if (!ctx) throw new Error('useBPEarned must be used within BPEarnedProvider');
  return ctx;
}

// ─── Animation Components ─────────────────────────────────────────────────────

function BPNormalEffect({ amount, onDone }: { amount: number; onDone: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      ]),
      Animated.delay(1300),
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.5, duration: 260, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -36, duration: 260, useNativeDriver: true }),
      ]),
    ]).start(onDone);
  }, []);

  return (
    <Animated.View style={[s.normalWrap, { opacity, transform: [{ scale }, { translateY }] }]}>
      <View style={s.normalGlow} />
      <View style={s.normalCard}>
        <View style={s.normalIconRing}>
          <View style={s.normalIconInner}>
            <Image source={require('@/assets/images/bp-logo.png')} style={s.bpLogo} resizeMode="contain" />
          </View>
        </View>
        <Text style={s.normalTitle}>BP獲得!</Text>
        <Text style={s.normalAmount}>+{amount} BP</Text>
      </View>
    </Animated.View>
  );
}

function BPMilestoneEffect({ amount, milestone, onDone }: { amount: number; milestone: number; onDone: () => void }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const starScale = useRef(new Animated.Value(0)).current;
  const starOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop1 = Animated.loop(Animated.timing(ring1, { toValue: 1, duration: 4000, useNativeDriver: true }));
    const loop2 = Animated.loop(Animated.timing(ring2, { toValue: 1, duration: 3000, useNativeDriver: true }));
    loop1.start();
    loop2.start();

    Animated.sequence([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(starScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(starOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.delay(350),
      Animated.parallel([
        Animated.spring(textScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(2200),
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(starOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]).start(() => {
      loop1.stop();
      loop2.stop();
      onDone();
    });
  }, []);

  const spin1 = ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spin2 = ring2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, s.mOverlay, { opacity: overlayOpacity }]} />
      <Animated.View style={[s.mCenter, { opacity: starOpacity, transform: [{ scale: starScale }] }]}>
        <Animated.View style={[s.mRing1, { transform: [{ rotate: spin1 }] }]}>
          <View style={s.mDot} /><View style={[s.mDot, s.mDotBtm]} /><View style={[s.mDot, s.mDotLft]} /><View style={[s.mDot, s.mDotRgt]} />
        </Animated.View>
        <Animated.View style={[s.mRing2, { transform: [{ rotate: spin2 }] }]}>
          <View style={s.mSpark} /><View style={[s.mSpark, s.mSpark2]} /><View style={[s.mSpark, s.mSpark3]} />
        </Animated.View>
        <View style={s.mBadge}>
          <Award size={52} color="#D4AF37" />
        </View>
      </Animated.View>
      <Animated.View style={[s.mTextWrap, { opacity: textOpacity, transform: [{ scale: textScale }] }]}>
        <Text style={s.mLabel}>実績解除!</Text>
        <Text style={s.mValue}>{milestone} BP 達成!</Text>
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

  const triggerEarned = useCallback((amount: number, totalBP: number) => {
    const prev = totalBP - amount;
    const milestone = checkMilestoneCrossed(prev, totalBP);

    if (milestone !== null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queueRef.current.push({ _id: ++_eventId, amount, type: 'milestone', milestoneValue: milestone });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    queueRef.current.push({ _id: ++_eventId, amount, type: 'normal' });

    if (!processingRef.current) {
      processingRef.current = true;
      processNext();
    }
  }, [processNext]);

  const triggerPreview = useCallback((milestone: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
  }, [processNext]);

  const ctxValue = useMemo(
    () => ({ triggerEarned, triggerPreview }),
    [triggerEarned, triggerPreview],
  );

  return (
    <BPEarnedContext.Provider value={ctxValue}>
      {children}
      {current && current.type === 'milestone' ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BPMilestoneEffect amount={current.amount} milestone={current.milestoneValue ?? 0} onDone={handleDone} />
        </View>
      ) : current && current.type === 'normal' ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BPNormalEffect amount={current.amount} onDone={handleDone} />
        </View>
      ) : null}
    </BPEarnedContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Normal (quick pop)
  normalWrap: {
    position: 'absolute',
    top: SCREEN_H * 0.32,
    alignSelf: 'center',
    alignItems: 'center',
  },
  normalGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#D4AF3733',
    top: -20,
  },
  normalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 36,
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
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
  mCenter: {
    position: 'absolute',
    top: SCREEN_H * 0.28,
    alignSelf: 'center',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mRing1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#D4AF3750',
    borderStyle: 'dashed' as const,
  },
  mDot: {
    position: 'absolute',
    top: -6,
    left: '48%' as any,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D4AF37',
  },
  mDotBtm: { top: 'auto' as any, bottom: -6 },
  mDotLft: { top: '48%' as any, left: -6 },
  mDotRgt: { top: '48%' as any, left: 'auto' as any, right: -6, backgroundColor: '#FFD700' },
  mRing2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: '#FFD70035',
    borderStyle: 'dashed' as const,
  },
  mSpark: {
    position: 'absolute',
    top: -5,
    left: '46%' as any,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF8DC',
  },
  mSpark2: { top: 'auto' as any, bottom: '46%' as any, right: -5, left: 'auto' as any },
  mSpark3: { top: 'auto' as any, bottom: -5, left: '46%' as any },
  mBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
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
