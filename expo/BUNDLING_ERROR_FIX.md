# Expo Go Bundling Error 修正手順

## 実施した修正内容

### 1. Firebase設定のハードコード
- `lib/firebase-config.js` ファイルを作成し、Firebase設定を直接埋め込み
- 環境変数読み込みエラーを回避
- Firebase SDK v12.6.0を使用（Expo SDK 54対応）

### 2. Metro Bundlerキャッシュクリア方法

#### 手動でキャッシュをクリアする
```bash
# Expo のキャッシュをクリア
bun expo start --clear

# または
npx expo start --clear

# Watchman のキャッシュもクリア (macOS/Linux)
watchman watch-del-all

# Metro bundler のキャッシュディレクトリを削除
rm -rf .expo
rm -rf node_modules/.cache
```

#### アプリを再起動する
```bash
# 1. 現在実行中のプロセスを停止 (Ctrl+C)

# 2. キャッシュをクリアして再起動
bun start
# または
bun run start-web
```

## トラブルシューティング

### それでもBundling Errorが出る場合

1. **node_modulesを再インストール**
   ```bash
   rm -rf node_modules
   rm bun.lock
   bun install
   ```

2. **Expo Goアプリのキャッシュをクリア**
   - iOS: Expo Goアプリを削除して再インストール
   - Android: 設定 > アプリ > Expo Go > ストレージ > キャッシュをクリア

3. **Development Clientへの切り替え**
   Expo Goで解決しない場合は、Development Clientを使用：
   ```bash
   # Development Clientをインストール
   bun add expo-dev-client
   
   # Prebuildを実行
   npx expo prebuild
   
   # iOSの場合
   npx expo run:ios
   
   # Androidの場合
   npx expo run:android
   ```

## Firebase設定の更新方法

`lib/firebase-config.js`を編集して、新しいFirebase設定に更新してください：

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

## 注意事項

- Firebase SDKは遅延初期化されているため、アプリ起動時にFirebaseが初期化されていなくてもクラッシュしません
- モックデータモードで動作するため、Firebase接続エラーでもアプリは使用可能です
- Web、iOS、Androidすべてのプラットフォームで動作します
