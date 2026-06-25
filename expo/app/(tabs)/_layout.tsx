import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Home, Star, User, FileText, Users, Search, Award } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import WalletBalanceHeader from '@/components/WalletBalanceHeader';

export default function TabLayout() {

  const { user, isLoading } = useAuth();


  if (isLoading || !user) {

    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }



  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF69B4',
        tabBarInactiveTintColor: '#7F8C8D',
        headerShown: true,
        headerStyle: {
          backgroundColor: 'white',
        },
        headerShadowVisible: true,
        headerRight: () => (
          <View style={{ marginRight: 12 }}>
            <WalletBalanceHeader />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'ホーム',
          headerShown: false,
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />

      {user.role === 'hairdresser' && (
        <Tabs.Screen
          name="requests"
          options={{
            title: 'カルテ',
            headerShown: false,
            tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
          }}
        />
      )}

      {user.role === 'customer' && (
        <Tabs.Screen
          name="search"
          options={{
            title: '探す',
            headerShown: false,
            tabBarIcon: ({ color }) => <Search size={24} color={color} />,
          }}
        />
      )}

      {user.role === 'customer' && (
        <Tabs.Screen
          name="rating"
          options={{
            title: '評価',
            headerTitle: '評価',
            tabBarIcon: ({ color }) => <Star size={24} color={color} />,
          }}
        />
      )}

      <Tabs.Screen
        name="matching"
        options={{
          title: 'マッチング',
          headerShown: false,
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />

      {user.role === 'hairdresser' && (
        <Tabs.Screen
          name="assistant-bt"
          options={{
            title: 'アシスタントBT',
            headerShown: false,
            tabBarIcon: ({ color }) => <Award size={24} color={color} />,
          }}
        />
      )}

      <Tabs.Screen
        name="wallet"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'プロフィール',
          headerTitle: 'プロフィール',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />



      {user.role === 'customer' && (
        <Tabs.Screen
          name="requests"
          options={{
            href: null,
          }}
        />
      )}

      {user.role === 'hairdresser' && (
        <Tabs.Screen
          name="rating"
          options={{
            href: null,
          }}
        />
      )}

      {user.role === 'hairdresser' && (
        <Tabs.Screen
          name="search"
          options={{
            href: null,
          }}
        />
      )}

      {user.role === 'customer' && (
        <Tabs.Screen
          name="assistant-bt"
          options={{
            href: null,
          }}
        />
      )}

      <Tabs.Screen
        name="assistant"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="referrals"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="jpyc-test"
        options={{
          href: null,
        }}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});