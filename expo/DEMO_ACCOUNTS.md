# デモアカウント登録手順

## 登録されるアカウント

### 1. 美容師アカウント
- **メールアドレス**: `hairdresser@demo.com`
- **パスワード**: `demo123`
- **名前**: スタイリスト A
- **勤務地**: 関東エリア
- **サロン名**: サロン A
- **BTバランス**: 100 BT
- **サブスクリプション**: プレミアム

### 2. 顧客アカウント
- **メールアドレス**: `customer@demo.com`
- **パスワード**: `demo123`
- **名前**: ユーザー B
- **BTバランス**: 50 BT

## スクリプトの実行方法

```bash
bun --experimental-modules scripts/seed-demo-accounts.ts
```

## アカウント削除方法

Firebase Console（https://console.firebase.google.com/）から：
1. **Authentication** → **Users** → 該当アカウントを削除
2. **Firestore Database** → **users** → 該当ドキュメントを削除

すべてのデモアカウントには `isDemoAccount: true` フラグが付いています。
