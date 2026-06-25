# Firebase Cloud Messaging (FCM) 設定ガイド

## 概要
このドキュメントでは、Beauty Token AppにFirebase Cloud Messaging (FCM)を統合し、実際のプッシュ通知を送信する方法を説明します。

## 前提条件
- Firebaseプロジェクトが作成されていること
- Firebase Authenticationが有効化されていること
- 本番環境用のFirebaseサービスアカウントがセットアップされていること

## 1. Firebase Consoleでの設定

### iOS用設定
1. Firebase Console → プロジェクト設定 → iOSアプリ
2. APNs認証キーをアップロード
   - Apple Developer → Certificates, Identifiers & Profiles → Keys
   - 新しいキーを作成（Apple Push Notifications service (APNs)を有効化）
   - キーファイル(.p8)をダウンロード
   - Firebase Consoleにアップロード（キーID、チームIDも入力）

3. GoogleService-Info.plistをダウンロード
   - プロジェクトルートに配置

### Android用設定
1. Firebase Console → プロジェクト設定 → Androidアプリ
2. パッケージ名: `app.rork.beauty-token-app-jy22m5u`
3. google-services.jsonをダウンロード
   - プロジェクトルートに配置

## 2. アプリ設定の更新

### app.json (手動で以下を追加)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#ffffff",
          "sounds": [],
          "androidMode": "default",
          "androidCollapsedTitle": "#{unread_notifications} new notifications"
        }
      ]
    ],
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist",
      "infoPlist": {
        "UIBackgroundModes": ["location", "remote-notification"]
      }
    },
    "android": {
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "POST_NOTIFICATIONS"
      ]
    }
  }
}
```

## 3. 通知トークンの管理

NotificationProviderが自動的に以下を実行します：
- デバイスの通知許可をリクエスト
- Expo Push Tokenを取得
- Firestoreの`users/{userId}`に保存:
  ```javascript
  {
    expoPushToken: "ExponentPushToken[xxx]",
    lastTokenUpdate: Timestamp,
    platform: "ios" | "android",
    deviceName: "iPhone 14 Pro"
  }
  ```

## 4. バックエンドから通知を送信

### 方法1: Expo Push Notification APIを使用（推奨）

```typescript
// backend/trpc/routes/notifications.ts
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { getFirestore } from 'firebase-admin/firestore';

export const notificationRouter = router({
  sendNotification: publicProcedure
    .input(z.object({
      userId: z.string(),
      title: z.string(),
      body: z.string(),
      data: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(input.userId).get();
      const expoPushToken = userDoc.data()?.expoPushToken;

      if (!expoPushToken) {
        throw new Error('Push token not found');
      }

      const message = {
        to: expoPushToken,
        sound: 'default',
        title: input.title,
        body: input.body,
        data: input.data || {},
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('✅ Notification sent:', result);
      return result;
    }),
});
```

### 方法2: Firebase Admin SDKを使用

```typescript
import { getMessaging } from 'firebase-admin/messaging';

export const sendFCMNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(userId).get();
  const fcmToken = userDoc.data()?.fcmToken; // FCMトークンを保存している場合

  if (!fcmToken) {
    throw new Error('FCM token not found');
  }

  const message = {
    notification: {
      title,
      body,
    },
    data: data || {},
    token: fcmToken,
  };

  const result = await getMessaging().send(message);
  console.log('✅ FCM notification sent:', result);
  return result;
};
```

## 5. 通知の種類別実装例

### マッチング通知
```typescript
// 新しいマッチングが見つかった時
await trpc.notification.sendNotification.mutate({
  userId: hairdresserId,
  title: '新しいマッチング',
  body: 'お客様からの予約リクエストがあります',
  data: {
    type: 'new_match',
    matchId: '123',
    screen: 'requests',
  },
});
```

### 評価リクエスト通知
```typescript
// 訪問セッション完了後
await trpc.notification.sendNotification.mutate({
  userId: customerId,
  title: '評価をお願いします',
  body: '美容師の評価をお願いします',
  data: {
    type: 'rating_request',
    sessionId: '456',
    screen: 'rating',
  },
});
```

### BTトークン受け取り通知
```typescript
// BTトークンが付与された時
await trpc.notification.sendNotification.mutate({
  userId: hairdresserId,
  title: 'BTトークンを獲得',
  body: `${amount} BTを獲得しました！`,
  data: {
    type: 'bt_received',
    amount: amount.toString(),
    screen: 'profile',
  },
});
```

## 6. クライアント側での通知処理

### 通知を受け取った時の処理
NotificationProviderが自動的にリスニングしています：

```typescript
// フォアグラウンドで通知を受け取った時
notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
  console.log('🔔 Notification received:', notification);
  // 通知を表示
});

// 通知をタップした時
responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
  console.log('🔔 Notification response:', response);
  // 適切な画面に遷移
  const data = response.notification.request.content.data;
  if (data.screen) {
    router.push(data.screen);
  }
});
```

### アプリ内で通知を使用する
```typescript
import { useNotifications } from '@/providers/NotificationProvider';

function MyComponent() {
  const { expoPushToken, isLoading, error } = useNotifications();

  if (isLoading) {
    return <Text>通知設定中...</Text>;
  }

  if (error) {
    return <Text>エラー: {error}</Text>;
  }

  return <Text>トークン: {expoPushToken}</Text>;
}
```

## 7. テスト方法

### Expo Push Notification Toolでテスト
1. https://expo.dev/notifications にアクセス
2. Expo Push Tokenを入力（アプリのコンソールログから取得）
3. タイトルとメッセージを入力
4. "Send a Notification"をクリック

### cURLでテスト
```bash
curl -H "Content-Type: application/json" \
     -X POST \
     -d '{
       "to": "ExponentPushToken[xxx]",
       "title": "テスト通知",
       "body": "これはテスト通知です",
       "sound": "default"
     }' \
     https://exp.host/--/api/v2/push/send
```

## 8. トラブルシューティング

### トークンが取得できない
- 物理デバイスを使用していることを確認
- 通知許可が付与されていることを確認
- Expo Goアプリの場合、projectIdが正しいことを確認

### 通知が届かない
- トークンがFirestoreに保存されていることを確認
- Firebase Consoleで通知設定が有効化されていることを確認
- iOS: APNs証明書が有効であることを確認
- Android: FCMが有効化されていることを確認

### Web環境での動作
- Webではプッシュ通知はサポートされていません
- Platform.OS === 'web'の場合、通知機能は無効化されます

## 9. 本番環境への移行

### iOS
1. App Store Connectでアプリを登録
2. Production APNs証明書をFirebaseにアップロード
3. TestFlightまたはApp Storeでテスト

### Android
1. Google Play Consoleでアプリを登録
2. リリースビルドを作成
3. Internal TestingまたはProduction trackでテスト

## 10. セキュリティ考慮事項

- Expo Push Tokenは公開情報ではありません
- ユーザーの同意なしに通知を送信しないでください
- 通知の頻度を適切に制限してください
- 個人情報を通知本文に含めないでください

## 参考リンク

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Expo Push Notification Tool](https://expo.dev/notifications)
