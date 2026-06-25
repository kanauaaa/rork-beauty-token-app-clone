# 実装プラン

## 完了済み

- [x] `metro.config.js` に `@coinbase/wallet-mobile-sdk` shimマッピング追加
- [x] `metro.config.js` に `react-native-passkey` shimマッピング追加
- [x] thirdwebダッシュボード設定完了（API Key, ガススポンサーシップ, Polygon Mainnet）
- [x] `BACKEND_WALLET_PRIVATE_KEY` 環境変数設定完了
- [x] バックエンドリレー方式でガスレスSBTミント実装
- [x] `backend/trpc/routes/gasless-mint.ts` 作成（BP/CP SBTミント + JPYC送金）
- [x] `mintBPSBTWithPaymaster` をバックエンドリレー経由に更新
- [x] `mintCPSBTWithPaymaster` をバックエンドリレー経由に更新
- [x] `transferJPYCWithPaymaster` をバックエンドリレー経由に更新

## アーキテクチャ

### ガスレスミント方式: バックエンドリレー
- バックエンドウォレット（`BACKEND_WALLET_PRIVATE_KEY`）がガス代を負担
- フロントエンドから tRPC 経由でバックエンドにミント要求を送信
- バックエンドがトランザクションを署名・送信
- 失敗時はフロントエンドのユーザーウォレットでフォールバック

### エンドポイント
- `gasless.mintBPSBT` - BP SBTをガスレスでミント
- `gasless.mintCPSBT` - CP SBTをガスレスでミント
- `gasless.transferJPYC` - JPYCをガスレスで送金
- `gasless.getBackendWalletInfo` - バックエンドウォレットの残高確認

## 運用上の注意
- バックエンドウォレットに十分なMATICを入金しておくこと（ガス代用）
- JPYC送金を行う場合はバックエンドウォレットにJPYCも必要
- `gasless.getBackendWalletInfo` でMATIC残高を定期的に確認すること
