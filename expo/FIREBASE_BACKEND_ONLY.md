# Firebase バックエンドのみ移行完了

## 変更内容

### ✅ 完了
1. **バックエンドでFirebase SDK使用**
   - `backend/lib/firebase.ts` - Firebase初期化
   - `backend/lib/firebase-matching.ts` - Firestoreマッチング操作
   - `backend/hono.ts` - 起動時にFirebase初期化

2. **フロントエンドからFirebase SDK削除**
   - `lib/firebase.ts` - スタブ化（データなし）
   - `lib/firebase-matching.ts` - スタブ化（エラーをスロー）
   - フロントエンドはtRPC経由でバックエンドにアクセス

3. **tRPCルート更新**
   - `backend/trpc/routes/matching/scout-customer/route.ts` - Firebase使用
   - `backend/trpc/routes/matching/get-matches/route.ts` - Firebase使用
   - `backend/trpc/routes/matching/create-request/route.ts` - Firebase使用
   - `backend/trpc/routes/matching/update-request/route.ts` - Firebase使用  
   - `backend/trpc/routes/matching/accept-scout/route.ts` - Firebase使用
   - `backend/trpc/routes/matching/reject-scout/route.ts` - Firebase使用
   - `backend/trpc/routes/admin/get-matching-logs/route.ts` - Firebase使用

### ⚠️ フロントエンドのProviderについて
現在のプロバイダー（`MatchingProvider.tsx`、`AuthProvider.tsx`）は、古いFirebase関数を直接呼び出しています。

これらは次のように動作します：
- **現在**: フロントエンドでFirebase SDKをインポートしようとして、bundlingエラー
- **今後**: tRPC経由でバックエンドのFirebaseにアクセスする必要があります

### 📝 データの保存場所
- **Firebaseデータ**: バックエンドのFirestoreに保存されます
  - `matchingRequests` collection
  - `matches` collection
  - `matchLogs` collection
- **Project ID**: `beauty-token-fbeaa`
- **すべてのデータは保持されています**

### 🔧 次のステップ（フロントエンド修正が必要）
プロバイダーを更新してtRPC経由でデータにアクセスするようにする必要があります：

1. `MatchingProvider.tsx`を更新
   - `firebase-matching`から直接インポートする代わりに、tRPCクライアントを使用
   - `subscribe*`関数の代わりにポーリングまたはreact-queryの`refetch`を使用

2. フロントエンドはこれ以上Firebase SDKをインポートしません
   - Expo Goでbundlingエラーが発生しなくなります
   - すべてのFirebase操作はバックエンドで実行されます

### 🎯 利点
- ✅ Expo Goで動作（Firebase SDKなし）
- ✅ Firebaseデータは安全にバックエンドで管理
- ✅ 既存のFirestoreデータは保持されています
- ✅ Node.js環境でのみFirebase SDK使用
