import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RootIndex() {


  
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();


  useEffect(() => {

    const timeoutDuration = 5000;
    const timeout = setTimeout(() => {


      if (isLoading) {

        setInitializationError('timeout');
      }
    }, timeoutDuration);

    return () => {

      clearTimeout(timeout);
    };
  }, [isLoading]);

  if (initializationError === 'timeout') {

    return <Redirect href={"/(auth)/welcome" as any} />;
  }

  if (isLoading) {

    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (user) {

    return <Redirect href={"/(tabs)/home" as any} />;
  }


  return <Redirect href={"/(auth)/welcome" as any} />;
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
    marginTop: 16,
  },
  spinner: {
    marginBottom: 8,
  },
});