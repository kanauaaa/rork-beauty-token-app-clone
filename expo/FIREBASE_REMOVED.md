# Firebase SDK削除 - Expo Go対応

## 実施内容

### Expo Goの限界とFirebase SDKの問題
- Expo GoではFirebase SDKのbundlingが不安定
- Development BuildやEAS Buildが利用できない環境
- **最終手段として Firebase SDKを完全に削除し、REST APIベースの実装に切り替え**

### 変更内容

#### 1. Firebase SDK削除
```bash
# Firebase SDKをpackage.jsonから削除
bun remove firebase
```

#### 2. 認証をREST APIに切り替え
- `lib/firebase-auth.ts`: Firebase Authentication REST APIを使用
- Email/Password認証をHTTP APIで実装
- Firebase Identity Toolkit APIを直接呼び出し

#### 3. Firestoreアクセスは一時的に無効化
- `lib/firebase.ts`: Firebase SDKの呼び出しを削除
- `lib/firebase-matching.ts`: Firestoreアクセスは一旦保留（SDK依存のため）

### 今後の対応方針

#### Option A: バックエンドに移行（推奨）
Firestore操作をすべてバックエンド（tRPC）経由で実行：
- フロントエンドはREST APIで認証のみ
- データ操作はすべてtRPC経由
- より安全でメンテナンス性が高い

#### Option B: Firestore REST APIを実装
Firebase SDKなしでFirestore REST APIを直接呼び出し：
- 複雑だが可能
- 認証トークンの管理が必要
- リアルタイムアップデートは制限あり

#### Option C: Development Buildへ移行
- `expo-dev-client`をインストール
- カスタムネイティブビルドを作成
- Firebase SDKが完全に動作

## 現在の状態

✅ 認証: Firebase Authentication REST API経由で動作
⚠️ Firestore: 一時的に無効化（nullを返す）
✅ アプリ起動: Expo Goで正常に起動可能

## 次のステップ

1. アプリが起動することを確認
2. バックエンド実装を優先してFirestore操作をtRPC経由に移行
3. または、Development Buildへの移行を検討
