import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode } from "react";
import { StyleSheet, View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/providers/AuthProvider";
import { MedicalRecordProvider } from "@/providers/MedicalRecordProvider";
import { MatchingProvider } from "@/providers/MatchingProvider";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { ReferralProvider } from "@/providers/ReferralProvider";
import { FavoriteProvider } from "@/providers/FavoriteProvider";
import { RatingProvider } from "@/providers/RatingProvider";
import { RatingTaskProvider } from "@/providers/RatingTaskProvider";
import { AssistantBTProvider } from "@/providers/AssistantBTProvider";
import { VisitSessionPollingProvider } from "@/providers/VisitSessionPollingProvider";
import { DisputeProvider } from "@/providers/DisputeProvider";
import { NotificationContext } from "@/providers/NotificationProvider";
import { Web3Provider } from "@/providers/Web3Provider";
import { PendingBPProcessorProvider } from "@/providers/PendingBPProcessor";
import { BPEarnedProvider } from "@/providers/BPEarnedProvider";
import { initializeFirebase } from "@/lib/firebase";

try {
  SplashScreen.preventAutoHideAsync();

} catch (error) {

}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>アプリでエラーが発生しました</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || '不明なエラーが発生しました'}
          </Text>
          <Text style={styles.errorDetails}>
            アプリを再起動してください
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}



function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "戻る" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="booking-confirmation" options={{ presentation: "modal", headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [firebaseError, setFirebaseError] = React.useState<string | null>(null);
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  }));

  useEffect(() => {

    
    // Initialize Firebase
    try {

      initializeFirebase();

    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFirebaseError(errorMessage);
    }
    
    const hideSplash = async () => {
      try {

        await new Promise(resolve => setTimeout(resolve, 1000));
        await SplashScreen.hideAsync();

      } catch (error) {

      }
    };
    
    hideSplash();
  }, []);



  if (firebaseError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Firebase初期化エラー</Text>
        <Text style={styles.errorMessage}>{firebaseError}</Text>
        <Text style={styles.errorDetails}>アプリを再起動してください</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NotificationContext>
              <SubscriptionProvider>
                <ReferralProvider>
                  <FavoriteProvider>
                    <RatingProvider>
                      <RatingTaskProvider>
                        <AssistantBTProvider>
                          <MedicalRecordProvider>
                            <DisputeProvider>
                              <MatchingProvider>
                                <VisitSessionPollingProvider>
                                  <Web3Provider>
                                    <BPEarnedProvider>
                                      <PendingBPProcessorProvider>
                                        <RootLayoutNav />
                                      </PendingBPProcessorProvider>
                                    </BPEarnedProvider>
                                  </Web3Provider>
                                </VisitSessionPollingProvider>
                              </MatchingProvider>
                            </DisputeProvider>
                          </MedicalRecordProvider>
                        </AssistantBTProvider>
                      </RatingTaskProvider>
                    </RatingProvider>
                  </FavoriteProvider>
                </ReferralProvider>
              </SubscriptionProvider>
              </NotificationContext>
            </AuthProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
});
