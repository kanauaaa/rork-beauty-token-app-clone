import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { useReferral } from '@/providers/ReferralProvider';
import { UserPlus, TrendingUp, Award, Users, Gift } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReferralsScreen() {
  const { user } = useAuth();
  const { referralData } = useReferral();
  const insets = useSafeAreaInsets();

  if (!user || user.role !== 'customer') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>顧客アカウントのみ閲覧可能です</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '紹介管理',
          headerStyle: { backgroundColor: '#FFE5F1' },
          headerTitleStyle: { fontWeight: 'bold', color: '#2C3E50' },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Gift size={32} color="#FF69B4" />
            <Text style={styles.summaryTitle}>紹介サマリー</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Users size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{referralData?.referredCustomers.length || 0}</Text>
              <Text style={styles.statLabel}>紹介した顧客</Text>
            </View>

            <View style={styles.statCard}>
              <UserPlus size={24} color="#FF69B4" />
              <Text style={styles.statValue}>{referralData?.referredHairdressers.length || 0}</Text>
              <Text style={styles.statLabel}>招待した美容師</Text>
            </View>

            <View style={styles.statCard}>
              <Award size={24} color="#D4AF37" />
              <Text style={styles.statValue}>{referralData?.totalBonusEarned.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>獲得ボーナスBT</Text>
            </View>
          </View>

          <View style={styles.inviteSlotCard}>
            <Text style={styles.inviteSlotLabel}>美容師招待可能枠</Text>
            <Text style={styles.inviteSlotValue}>{referralData?.hairdresserInviteCount || 0}人</Text>
            <Text style={styles.inviteSlotDescription}>
              顧客を紹介すると+1枠、プレミアムプランで+3枠獲得できます
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <UserPlus size={24} color="#FF69B4" />
            <Text style={styles.sectionTitle}>招待した美容師</Text>
          </View>

          {referralData?.referredHairdressers && referralData.referredHairdressers.length > 0 ? (
            <View style={styles.list}>
              {referralData.referredHairdressers.map((hairdresser, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <View style={styles.listItemIcon}>
                      <UserPlus size={20} color="#FF69B4" />
                    </View>
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemName}>{hairdresser.hairdresserName}</Text>
                      <Text style={styles.listItemDate}>
                        {new Date(hairdresser.referredAt).toLocaleDateString('ja-JP')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.listItemStats}>
                    <View style={styles.listItemStat}>
                      <TrendingUp size={16} color="#4CAF50" />
                      <Text style={styles.listItemStatLabel}>獲得BT:</Text>
                      <Text style={styles.listItemStatValue}>{hairdresser.totalBTEarned.toFixed(1)}</Text>
                    </View>
                    <View style={styles.listItemStat}>
                      <Award size={16} color="#D4AF37" />
                      <Text style={styles.listItemStatLabel}>ボーナス:</Text>
                      <Text style={styles.listItemStatValue}>{hairdresser.bonusReceived.toFixed(1)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <UserPlus size={48} color="#BDC3C7" />
              <Text style={styles.emptyStateTitle}>招待した美容師はいません</Text>
              <Text style={styles.emptyStateText}>
                美容師を招待して、彼らが獲得したBTに応じてボーナスを受け取りましょう
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>💡 リファラルシステムについて</Text>
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardText}>
              • 顧客を紹介すると、美容師招待枠が+1人増えます{'\n'}
              • 美容師を招待すると、招待枠を1人消費します{'\n'}
              • 招待した美容師が獲得したBTに応じて、あなたにボーナスが付与されます{'\n'}
              • プレミアムプランに入会すると、招待枠が+3人増えます
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  inviteSlotCard: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
    alignItems: 'center',
  },
  inviteSlotLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  inviteSlotValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 8,
  },
  inviteSlotDescription: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  list: {
    gap: 12,
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  listItemDate: {
    fontSize: 12,
    color: '#95A5A6',
  },
  listItemStats: {
    flexDirection: 'row',
    gap: 16,
  },
  listItemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listItemStatLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  listItemStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#87CEEB',
    marginBottom: 12,
  },
  infoCardContent: {
    gap: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 50,
  },
});
