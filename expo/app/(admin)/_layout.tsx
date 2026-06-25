import { Stack } from 'expo-router';
import { AdminProvider } from '@/providers/AdminProvider';
import { Web3Provider } from '@/providers/Web3Provider';

export default function AdminLayout() {
  return (
    <Web3Provider>
      <AdminProvider>
        <Stack screenOptions={{ headerBackTitle: '戻る' }}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        </Stack>
      </AdminProvider>
    </Web3Provider>
  );
}
