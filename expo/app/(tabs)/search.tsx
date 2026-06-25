import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Alert, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, User } from '@/providers/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search as SearchIcon, MapPin, Star, Navigation, Award, Map as MapIcon, Calendar, Clock, FileText, CheckCircle, X, Bell } from 'lucide-react-native';
import AdBanner from '@/components/AdBanner';
import WalletBalanceHeader from '@/components/WalletBalanceHeader';
import { WebView as ExpoWebView } from 'react-native-webview';
import { useFavorites } from '@/providers/FavoriteProvider';
import * as Haptics from 'expo-haptics';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { router } from 'expo-router';
import { getDb } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';


const MAP_HEIGHT = 300;

const WebView = Platform.OS === 'web' 
  ? ({ source, style, ...props }: any) => {
      const html = typeof source?.html === 'string' ? source.html : '';
      const encodedHtml = encodeURIComponent(html);
      return (
        <iframe
          srcDoc={html}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 16,
          }}
          {...props}
        />
      );
    }
  : ExpoWebView;

interface Hairdresser {
  id: string;
  name: string;
  salonName: string;
  address: string;
  latitude: number;
  longitude: number;
  btBalance: number;
  specialties: string[];
  rating: number;
  totalReviews: number;
}

export default function SearchScreen() {
  const { user } = useAuth();
  const { isFavorite, addFavorite, removeFavorite, scoutRequests, getScoutRequestsForCustomer, acceptScoutRequest, rejectScoutRequest } = useFavorites();
  const { highlightStatus } = useSubscription();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 35.6812, lon: 139.7671 });
  const [mapZoom, setMapZoom] = useState(13);
  const [showMap, setShowMap] = useState(true);
  const [selectedHairdresserIndex, setSelectedHairdresserIndex] = useState<number | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [showScoutRequestsModal, setShowScoutRequestsModal] = useState(false);
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [isLoadingHairdressers, setIsLoadingHairdressers] = useState(true);

  useEffect(() => {

    const db = getDb();
    const usersRef = collection(db, 'users');
    const hairdressersQuery = query(usersRef, where('role', '==', 'hairdresser'));

    const unsubscribe = onSnapshot(hairdressersQuery, (snapshot) => {
      const hairdressersData: Hairdresser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

        
        if (data.latitude && data.longitude) {
          hairdressersData.push({
            id: doc.id,
            name: data.name || '名前未設定',
            salonName: data.workplaceName || data.workplace || '勤務先未設定',
            address: data.address || '住所未設定',
            latitude: data.latitude,
            longitude: data.longitude,
            btBalance: data.btBalance || 0,
            specialties: data.recommendations || [],
            rating: 4.5,
            totalReviews: 0,
          });
        } else {

        }
      });
      

      setHairdressers(hairdressersData);
      setIsLoadingHairdressers(false);
    }, (error) => {

      setIsLoadingHairdressers(false);
    });

    return () => {

      unsubscribe();
    };
  }, []);

  const regions = useMemo(() => [
    { id: 'shibuya', name: '渋谷区', lat: 35.6628, lon: 139.7038 },
    { id: 'shinjuku', name: '新宿区', lat: 35.6812, lon: 139.7671 },
    { id: 'minato', name: '港区', lat: 35.6640, lon: 139.7137 },
  ], []);

  useEffect(() => {
    if (selectedRegion) {
      const region = regions.find(r => r.id === selectedRegion);
      if (region) {

        setMapCenter({ lat: region.lat, lon: region.lon });
        setMapZoom(13);
        setSelectedHairdresserIndex(null);
        setMapKey(prev => prev + 1);
      }
    } else {
      setMapCenter({ lat: 35.6812, lon: 139.7671 });
      setMapZoom(13);
      setSelectedHairdresserIndex(null);
      setMapKey(prev => prev + 1);
    }
  }, [selectedRegion, regions]);

  useEffect(() => {

  }, [mapCenter]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredHairdressers = useMemo(() => {
    let filtered = hairdressers;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        h =>
          h.name.toLowerCase().includes(query) ||
          h.salonName.toLowerCase().includes(query) ||
          h.address.toLowerCase().includes(query) ||
          h.specialties.some(s => s.toLowerCase().includes(query))
      );
    }

    if (selectedRegion) {
      const region = regions.find(r => r.id === selectedRegion);
      if (region) {
        filtered = filtered.filter(h => {
          const distance = calculateDistance(region.lat, region.lon, h.latitude, h.longitude);
          return distance < 5;
        });
      }
    }

    return filtered.sort((a, b) => {
      const aIsHighlighted = highlightStatus.isActive;
      const bIsHighlighted = highlightStatus.isActive;
      
      if (aIsHighlighted && !bIsHighlighted) return -1;
      if (!aIsHighlighted && bIsHighlighted) return 1;
      
      if (selectedRegion) {
        const region = regions.find(r => r.id === selectedRegion);
        if (region) {
          const distA = calculateDistance(region.lat, region.lon, a.latitude, a.longitude);
          const distB = calculateDistance(region.lat, region.lon, b.latitude, b.longitude);
          return distA - distB;
        }
      }
      return 0;
    });
  }, [hairdressers, searchQuery, selectedRegion, regions, highlightStatus.isActive]);

  const generateMapHTML = () => {
    const hairdressers = filteredHairdressers.slice(0, 10);
    const markersData = hairdressers.map((h, index) => ({
      lat: h.latitude,
      lon: h.longitude,
      index: index + 1,
      name: h.name,
      salon: h.salonName
    }));



    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    try {
      const map = L.map('map', {
        center: [${mapCenter.lat}, ${mapCenter.lon}],
        zoom: ${mapZoom},
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        tap: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
        minZoom: 10
      }).addTo(map);

      const markers = ${JSON.stringify(markersData)};

      const customIcon = (number) => L.divIcon({
        html: '<div style="position:relative;display:flex;flex-direction:column;align-items:center;"><div style="width:30px;height:30px;border-radius:50%;background:#FF0000;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.3);font-weight:bold;color:white;font-size:12px;">' + number + '</div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #FF0000;margin-top:-1px;"></div></div>',
        className: '',
        iconSize: [36, 44],
        iconAnchor: [18, 44]
      });

      markers.forEach(marker => {
        const markerInstance = L.marker([marker.lat, marker.lon], {
          icon: customIcon(marker.index)
        })
        .bindPopup('<div style="font-family:sans-serif;"><strong style="font-size:14px;">' + marker.name + '</strong><br/><span style="font-size:12px;color:#666;">' + marker.salon + '</span></div>')
        .addTo(map);
      });

      if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lon], 15);
      } else if (markers.length > 1 && ${mapZoom} === 13) {
        const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lon]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    } catch (error) {

      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:sans-serif;color:#999;">地図の読み込みに失敗しました</div>';
    }
  <\/script>
</body>
</html>`;
  };

  const handleMarkerClick = (index: number) => {
    const item = filteredHairdressers[index];


    
    setSelectedHairdresserIndex(index);
    setMapCenter({ lat: item.latitude, lon: item.longitude });
    setMapZoom(16);
    setShowMap(true);
    setMapKey(prev => prev + 1);
  };

  const customerScoutRequests = user && user.role === 'customer' ? getScoutRequestsForCustomer(user.id) : [];

  const handleAcceptScoutRequest = async (requestId: string, hairdresserName: string) => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      await acceptScoutRequest(requestId);
      
      Alert.alert(
        'スカウト承認完了',
        `${hairdresserName}さんからのスカウトを承認しました。\n\n予約が成立しました。`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.push('/(tabs)/matching' as any);
            }
          }
        ]
      );
    } catch (error) {

      Alert.alert('エラー', 'スカウトの承認に失敗しました');
    }
  };

  const handleRejectScoutRequest = async (requestId: string) => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      Alert.alert(
        'スカウト辞退の確認',
        'このスカウトを辞退しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '辞退する',
            style: 'destructive',
            onPress: async () => {
              await rejectScoutRequest(requestId);
              Alert.alert('辞退完了', 'スカウトを辞退しました');
            }
          }
        ]
      );
    } catch (error) {

      Alert.alert('エラー', 'スカウトの辞退に失敗しました');
    }
  };

  const handleToggleFavorite = async (hairdresserId: string, hairdresserName: string) => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      if (isFavorite(hairdresserId)) {
        await removeFavorite(hairdresserId);
      } else {
        await addFavorite(hairdresserId, hairdresserName);
      }
    } catch (error) {

    }
  };

  const renderHairdresserCard = ({ item, index }: { item: Hairdresser; index: number }) => {
    const userDistance = user?.latitude && user?.longitude
      ? calculateDistance(user.latitude, user.longitude, item.latitude, item.longitude)
      : null;
    const isFav = isFavorite(item.id);
    const isHighlighted = highlightStatus.isActive && user?.role === 'hairdresser' && user.id === item.id;

    return (
      <View style={[styles.hairdresserCard, isHighlighted && styles.highlightedCard]}>
        {isHighlighted && (
          <View style={styles.highlightBadge}>
            <Text style={styles.highlightBadgeText}>✨ おすすめ</Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <View style={styles.cardTopRow}>
            <Text style={styles.hairdresserName}>{item.name}</Text>
            <View style={styles.cardHeaderButtons}>
              <TouchableOpacity 
                style={[styles.favoriteButton, isFav && styles.favoriteButtonActive]}
                onPress={() => handleToggleFavorite(item.id, item.name)}
              >
                <Star 
                  size={20} 
                  color={isFav ? '#FFD700' : '#BDC3C7'} 
                  fill={isFav ? '#FFD700' : 'none'}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.markerNumberBadge}
                onPress={() => handleMarkerClick(index)}
              >
                <Text style={styles.markerNumberText}>{index + 1}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {userDistance !== null && (
            <View style={styles.distanceInfo}>
              <MapPin size={12} color="#FF69B4" />
              <Text style={styles.distanceText}>{userDistance.toFixed(1)}km</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MapPin size={16} color="#7F8C8D" />
            <View style={styles.infoContent}>
              <Text style={styles.salonName}>{item.salonName}</Text>
              <Text style={styles.address}>{item.address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Award size={16} color="#D4AF37" />
            <View style={styles.infoContent}>
              <Text style={styles.btLabel}>保有BT</Text>
              <Text style={styles.btValue}>{item.btBalance} BT</Text>
            </View>
          </View>

          <View style={styles.specialtiesSection}>
            <Text style={styles.specialtiesLabel}>得意な技術</Text>
            <View style={styles.specialtiesContainer}>
              {item.specialties.map((specialty, index) => (
                <View key={index} style={styles.specialtyChip}>
                  <Text style={styles.specialtyText}>{specialty}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>


      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
      <View style={[styles.floatingBalance, { top: insets.top + 8 }]}>
        <WalletBalanceHeader />
      </View>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 100 }} />
        {user?.role === 'customer' && customerScoutRequests.length > 0 && (
          <View style={styles.notificationButtonWrapper}>
            <TouchableOpacity
              style={styles.scoutNotificationButton}
              onPress={() => setShowScoutRequestsModal(true)}
            >
              <Bell size={24} color="#FF69B4" fill="#FF69B4" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{customerScoutRequests.length}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color="#7F8C8D" />
          <TextInput
            style={styles.searchInput}
            placeholder="名前、サロン名、住所、技術で検索"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#95A5A6"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.regionScroll}
          contentContainerStyle={styles.regionScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.regionChip,
              !selectedRegion && styles.regionChipActive,
            ]}
            onPress={() => setSelectedRegion(null)}
          >
            <Navigation size={16} color={!selectedRegion ? '#FF69B4' : '#7F8C8D'} />
            <Text style={[styles.regionChipText, !selectedRegion && styles.regionChipTextActive]}>
              すべて
            </Text>
          </TouchableOpacity>
          {regions.map((region) => (
            <TouchableOpacity
              key={region.id}
              style={[
                styles.regionChip,
                selectedRegion === region.id && styles.regionChipActive,
              ]}
              onPress={() => setSelectedRegion(region.id)}
            >
              <MapPin size={16} color={selectedRegion === region.id ? '#FF69B4' : '#7F8C8D'} />
              <Text
                style={[
                  styles.regionChipText,
                  selectedRegion === region.id && styles.regionChipTextActive,
                ]}
              >
                {region.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

        {showMap && filteredHairdressers.length > 0 && (
          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <MapIcon size={20} color="#FF69B4" />
              <Text style={styles.mapHeaderText}>地図で確認</Text>
              <TouchableOpacity 
                style={styles.mapToggleButton}
                onPress={() => setShowMap(false)}
              >
                <Text style={styles.mapToggleText}>非表示</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mapContainer}>
              <WebView
                key={mapKey}
                source={{ html: generateMapHTML() }}
                style={styles.mapWebView}
                {...(Platform.OS !== 'web' && {
                  scrollEnabled: false,
                  bounces: false,
                  javaScriptEnabled: true,
                  domStorageEnabled: true,
                  startInLoadingState: true,
                  scalesPageToFit: true,
                  onError: (syntheticEvent: any) => {
                    const { nativeEvent } = syntheticEvent;

                  },
                  onLoad: () => {

                  }
                })}
              />
            </View>
            <View style={styles.mapLegendContainer}>
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={styles.legendMarker} />
                  <Text style={styles.legendText}>美容師の位置（赤い番号をタップで追跡）</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {!showMap && filteredHairdressers.length > 0 && (
          <TouchableOpacity 
            style={styles.showMapButton}
            onPress={() => setShowMap(true)}
          >
            <MapIcon size={20} color="#FF69B4" />
            <Text style={styles.showMapButtonText}>地図を表示</Text>
          </TouchableOpacity>
        )}

        <View style={styles.resultHeader}>
          <Text style={styles.resultCount}>
            {isLoadingHairdressers ? '読み込み中...' : `${filteredHairdressers.length}件の美容師が見つかりました`}
          </Text>
          <Text style={styles.bookingNotice}>
            ※予約時は別の予約媒体をご利用ください
          </Text>
        </View>

        {isLoadingHairdressers ? (
          <View style={styles.emptyState}>
            <SearchIcon size={64} color="#BDC3C7" />
            <Text style={styles.emptyStateTitle}>美容師データを読み込んでいます...</Text>
          </View>
        ) : filteredHairdressers.length === 0 ? (
          <View style={styles.emptyState}>
            <SearchIcon size={64} color="#BDC3C7" />
            <Text style={styles.emptyStateTitle}>美容師が見つかりませんでした</Text>
            <Text style={styles.emptyStateText}>
              検索条件を変更してもう一度お試しください
            </Text>
          </View>
        ) : (
          <View style={styles.hairdresserList}>
            {filteredHairdressers.map((item, index) => (
              <View key={item.id}>
                {renderHairdresserCard({ item, index })}
              </View>
            ))}
            <View style={styles.adSection}>
              <AdBanner />
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showScoutRequestsModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowScoutRequestsModal(false)}
      >
        <LinearGradient
          colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
          style={styles.modalContainer}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowScoutRequestsModal(false)}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>スカウト申請</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.scoutRequestsList}
            showsVerticalScrollIndicator={false}
          >
            {customerScoutRequests.length === 0 ? (
              <View style={styles.emptyScoutState}>
                <Bell size={64} color="#BDC3C7" />
                <Text style={styles.emptyScoutTitle}>スカウト申請はありません</Text>
                <Text style={styles.emptyScoutText}>
                  美容師からスカウト申請が届くとここに表示されます
                </Text>
              </View>
            ) : (
              customerScoutRequests.map((request) => (
                <View key={request.id} style={styles.scoutRequestCard}>
                  <View style={styles.scoutRequestHeader}>
                    <View style={styles.scoutRequestHeaderLeft}>
                      <View style={styles.scoutBadgeSmall}>
                        <Star size={16} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.scoutBadgeSmallText}>呼び込み</Text>
                      </View>
                      <Text style={styles.scoutRequestHairdresserName}>{request.hairdresserName}</Text>
                    </View>
                    <Text style={styles.scoutRequestDate}>
                      {new Date(request.createdAt).toLocaleDateString('ja-JP')}
                    </Text>
                  </View>

                  <View style={styles.scoutRequestBody}>
                    {request.desiredDate && (
                      <View style={styles.scoutInfoRow}>
                        <Calendar size={16} color="#FF69B4" />
                        <Text style={styles.scoutInfoLabel}>日時:</Text>
                        <Text style={styles.scoutInfoValue}>
                          {request.desiredDate} {request.desiredTime}
                        </Text>
                      </View>
                    )}

                    {request.menu && request.menu.length > 0 && (
                      <View style={styles.scoutInfoRow}>
                        <FileText size={16} color="#4CAF50" />
                        <Text style={styles.scoutInfoLabel}>メニュー:</Text>
                        <Text style={styles.scoutInfoValue}>{request.menu.join(', ')}</Text>
                      </View>
                    )}

                    <View style={styles.scoutInfoRow}>
                      <MapPin size={16} color="#D4AF37" />
                      <Text style={styles.scoutInfoLabel}>場所:</Text>
                      <Text style={styles.scoutInfoValue}>{request.address}</Text>
                    </View>

                    <View style={styles.scoutMessageBox}>
                      <Text style={styles.scoutMessageText}>
                        💡 {request.hairdresserName}さんから急遽予約枠の呼び込みがありました。承認すると予約が成立します。
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scoutRequestActions}>
                    <TouchableOpacity
                      style={styles.scoutRejectBtn}
                      onPress={() => handleRejectScoutRequest(request.id)}
                    >
                      <X size={18} color="#E74C3C" />
                      <Text style={styles.scoutRejectBtnText}>辞退</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.scoutAcceptBtn}
                      onPress={() => handleAcceptScoutRequest(request.id, request.hairdresserName)}
                    >
                      <CheckCircle size={18} color="white" />
                      <Text style={styles.scoutAcceptBtnText}>承認する</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingBalance: {
    position: 'absolute' as const,
    right: 16,
    zIndex: 100,
  },
  content: {
    flex: 1,
  },
  notificationButtonWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },
  scoutNotificationButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative' as const,
  },
  notificationBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: '#FF0000',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  searchSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  regionScroll: {
    maxHeight: 50,
  },
  regionScrollContent: {
    gap: 8,
    paddingRight: 24,
  },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  regionChipActive: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderColor: '#FF69B4',
  },
  regionChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  regionChipTextActive: {
    color: '#FF69B4',
  },
  resultHeader: {
    paddingHorizontal: 24,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  bookingNotice: {
    fontSize: 11,
    color: '#95A5A6',
    fontStyle: 'italic' as const,
  },
  hairdresserList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  hairdresserCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hairdresserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  cardHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: '#FFD700',
  },

  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF69B4',
  },
  cardBody: {
    gap: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoContent: {
    flex: 1,
  },
  salonName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  address: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  btLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  btValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  specialtiesSection: {
    marginTop: 4,
  },
  specialtiesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specialtyChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  mapSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  mapHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  mapToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
  },
  mapToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF69B4',
  },
  mapContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    height: MAP_HEIGHT,
  },
  mapWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mapLegendContainer: {
    marginTop: 8,
  },
  mapLegend: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF0000',
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2C3E50',
  },
  showMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  showMapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF69B4',
  },
  markerNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },

  adSection: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  highlightedCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  highlightBadge: {
    position: 'absolute' as const,
    top: -8,
    left: 12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  highlightBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
  },
  scoutRequestsList: {
    padding: 24,
    gap: 16,
  },
  emptyScoutState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyScoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyScoutText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center' as const,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  scoutRequestCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  scoutRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scoutRequestHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  scoutBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  scoutBadgeSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4AF37',
  },
  scoutRequestHairdresserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scoutRequestDate: {
    fontSize: 12,
    color: '#95A5A6',
  },
  scoutRequestBody: {
    gap: 12,
    marginBottom: 16,
  },
  scoutInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoutInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  scoutInfoValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
  },
  scoutMessageBox: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  scoutMessageText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 20,
  },
  scoutRequestActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  scoutRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  scoutRejectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
  },
  scoutAcceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scoutAcceptBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});
