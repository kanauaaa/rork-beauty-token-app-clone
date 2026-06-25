import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>アシスタント管理</Text>
        <Text style={styles.subtitle}>BP割り振りシステム</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingTop: 200 }} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Settings size={48} color="#FF69B4" />
          <Text style={styles.infoTitle}>アシスタント管理</Text>
          <Text style={styles.infoText}>
            アシスタントへのBP割り振り機能は準備中です
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});
