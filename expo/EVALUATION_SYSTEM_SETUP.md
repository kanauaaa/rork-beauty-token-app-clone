# 評価システム - Firebase設定ガイド

## 概要

評価システムは、美容師と顧客の来店から評価・BT付与までの完全なフローをバックエンドで管理します。

## 🔥 Firebase設定

### 1. 必要なFirestoreコレクション

以下のコレクションが自動的に作成されます：

#### `visitSessions` - 来店セッション管理
```
{
  customerId: string,              // 顧客ID
  customerName: string,            // 顧客名
  customerEmail: string,           // 顧客メール（任意）
  hairdresserId: string,           // 美容師ID
  hairdresserName: string,         // 美容師名
  checkInTime: timestamp,          // チェックイン時刻
  status: 'in_progress' | 'completed' | 'amount_mismatch',
  hairdresserAmount: number | null,       // 美容師が入力した金額
  customerAmount: number | null,          // 顧客が入力した金額
  hairdresserMedicalRecordCompleted: boolean,  // カルテ記入完了フラグ
  customerRatingCompleted: boolean,       // 評価完了フラグ
  btAwarded: boolean,              // BT付与完了フラグ
  btAmount: number | null,         // 付与されたBT額
  medicalRecordId: string | null,  // カルテID
  evaluationId: string | null,     // 評価ID
  completedAt: timestamp | null,   // 完了時刻
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `medicalRecords` - カルテ記録
```
{
  sessionId: string,               // セッションID
  customerId: string,              // 顧客ID
  customerName: string,            // 顧客名
  hairdresserId: string,           // 美容師ID
  hairdresserName: string,         // 美容師名
  serviceDate: string,             // 施術日
  menus: string[],                 // メニュー一覧
  menuDetails: object,             // メニュー詳細
  notes: string,                   // メモ
  receivedAmount: number,          // 受取金額
  createdAt: timestamp
}
```

#### `evaluations` - 顧客評価
```
{
  sessionId: string,               // セッションID
  customerId: string,              // 顧客ID
  customerName: string,            // 顧客名
  hairdresserId: string,           // 美容師ID
  hairdresserName: string,         // 美容師名
  customerAmount: number,          // 支払金額
  btEarned: number,                // 獲得BT（放棄前）
  btGiven: number,                 // 実際に付与されたBT（放棄後）
  rating: {
    technique: number,             // 技術力
    service: number,               // 接客・サービス
    timeManagement: number,        // 時間管理
    assistant: number,             // アシスタント
    forfeit: number               // BT放棄
  },
  assistants: Array<{
    id: string,
    name: string
  }>,
  createdAt: timestamp
}
```

#### `btDistributions` - BT分配履歴
```
{
  fromUserId: string,              // 分配元ユーザーID
  fromUserName: string,            // 分配元ユーザー名
  toUserId: string,                // 分配先ユーザーID
  toUserName: string,              // 分配先ユーザー名
  btAmount: number,                // 分配BT額
  sessionId: string | null,        // セッションID（任意）
  notes: string,                   // メモ
  type: 'assistant_distribution',  // 分配タイプ
  createdAt: timestamp
}
```

#### `users` - ユーザー情報
```
{
  id: string,
  name: string,
  email: string,
  role: 'hairdresser' | 'customer' | 'admin',
  btBalance: number,               // BT残高
  ... その他のユーザー情報
}
```

### 2. Firebase Rulesの設定

`firestore.rules` ファイルに以下のコレクションのルールが追加されています：

- `visitSessions` - 来店セッション
- `medicalRecords` - カルテ
- `evaluations` - 評価
- `btDistributions` - BT分配
- `users` - ユーザー

**⚠️ 開発モード：** 現在は認証なしでアクセス可能です。本番環境では必ず認証ルールを設定してください。

### 3. Firestoreインデックスの設定

`firestore.indexes.json` に以下のインデックスが追加されています：

#### visitSessions
- `customerId` + `createdAt` (DESC)
- `hairdresserId` + `createdAt` (DESC)
- `customerId` + `hairdresserId` + `status`
- `status` + `createdAt` (DESC)

#### medicalRecords
- `customerId` + `createdAt` (DESC)
- `hairdresserId` + `createdAt` (DESC)

#### evaluations
- `customerId` + `createdAt` (DESC)
- `hairdresserId` + `createdAt` (DESC)

#### btDistributions
- `fromUserId` + `createdAt` (DESC)
- `toUserId` + `createdAt` (DESC)

## 📡 バックエンドAPI

### 来店処理（チェックイン）
```typescript
trpc.visit.checkIn.useMutation({
  customerId: string,
  customerName: string,
  customerEmail?: string
})
```

美容師が顧客のQRコードをスキャンして来店を記録します。既存のセッションがある場合は継続します。

### カルテ記入・金額入力
```typescript
trpc.visit.saveMedicalRecord.useMutation({
  sessionId: string,
  medicalRecord: {
    serviceDate: string,
    menus: string[],
    menuDetails: object,
    notes: string
  },
  receivedAmount: number
})
```

美容師がカルテを記入し、受取金額を入力します。顧客の評価が完了していて金額が一致する場合、自動的にBTが付与されます。

### 顧客評価・金額入力
```typescript
trpc.visit.submitCustomerRating.useMutation({
  sessionId: string,
  customerAmount: number,
  rating: {
    technique: number,
    service: number,
    timeManagement: number,
    assistant: number,
    forfeit: number
  },
  assistants: Array<{ id: string, name: string }>
})
```

顧客が支払金額を入力し、美容師を評価します。美容師のカルテ記入が完了していて金額が一致する場合、自動的にBTが付与されます。

### セッション取得
```typescript
trpc.visit.getSession.useQuery({
  sessionId?: string,
  customerId?: string,
  status?: 'in_progress' | 'completed' | 'amount_mismatch'
})
```

セッション情報を取得します。美容師は自分が担当したセッション、顧客は自分のセッションのみ取得できます。

### アシスタントBT分配
```typescript
trpc.visit.distributeAssistantBT.useMutation({
  assistantId: string,
  assistantName: string,
  btAmount: number,
  sessionId?: string,
  notes?: string
})
```

美容師がアシスタントにBTを分配します。美容師のBT残高から減算され、アシスタントのBT残高に加算されます。

## 🔄 評価フロー

### 1. 来店処理
1. 顧客が美容室に来店
2. 美容師が顧客のQRコードをスキャン
3. `trpc.visit.checkIn` で来店セッションを作成
4. セッションステータス: `in_progress`

### 2. カルテ記入（美容師側）
1. 美容師がカルテを記入
2. 美容師が受取金額を入力
3. `trpc.visit.saveMedicalRecord` でカルテと金額を保存
4. `hairdresserMedicalRecordCompleted: true`

### 3. 評価・金額入力（顧客側）
1. 顧客が支払金額を入力
2. 顧客が美容師を評価（BT分配）
3. `trpc.visit.submitCustomerRating` で評価と金額を送信
4. `customerRatingCompleted: true`

### 4. 金額照合・BT付与
1. 双方の処理が完了したか確認
2. `hairdresserAmount === customerAmount` を確認
3. 金額が一致した場合：
   - セッションステータス: `completed`
   - `btAwarded: true`
   - 美容師の `btBalance` に BT を加算
4. 金額が不一致の場合：
   - セッションステータス: `amount_mismatch`
   - BTは付与されない

### 5. アシスタントBT分配（任意）
1. 美容師がアシスタントのQRコードをスキャン
2. 分配するBT額を入力
3. `trpc.visit.distributeAssistantBT` で分配
4. 美容師の `btBalance` から減算
5. アシスタントの `btBalance` に加算

## 🚨 エラーハンドリング

### 金額不一致
- 双方の金額が一致しない場合、セッションは `amount_mismatch` ステータスになります
- BTは付与されません
- 双方で確認して修正する必要があります

### BT残高不足
- アシスタントへのBT分配時、美容師のBT残高が不足している場合はエラーになります

### セッション不存在
- 無効なセッションIDでアクセスした場合はエラーになります

### 権限エラー
- 他のユーザーのセッションにアクセスした場合はエラーになります

## 📊 データの永続化

すべてのデータはFirestoreに保存されます：

- ✅ **来店セッション** - `visitSessions` コレクション
- ✅ **カルテ記録** - `medicalRecords` コレクション  
- ✅ **評価データ** - `evaluations` コレクション
- ✅ **BT分配履歴** - `btDistributions` コレクション
- ✅ **ユーザーBT残高** - `users` コレクションの `btBalance` フィールド

アカウントを変更しても、Firebaseからデータを取得できるため、履歴は保持されます。

## 🔐 セキュリティ

### 開発環境
現在は `firestore.rules` で全てのコレクションに `allow read, write: if true;` を設定しています。

### 本番環境
本番環境では以下のルールを推奨：

```javascript
// visitSessions
match /visitSessions/{sessionId} {
  allow read: if request.auth != null && 
    (resource.data.customerId == request.auth.uid || 
     resource.data.hairdresserId == request.auth.uid);
  allow create: if request.auth != null && 
    request.resource.data.hairdresserId == request.auth.uid;
  allow update: if request.auth != null && 
    (resource.data.customerId == request.auth.uid || 
     resource.data.hairdresserId == request.auth.uid);
}

// medicalRecords
match /medicalRecords/{recordId} {
  allow read: if request.auth != null && 
    (resource.data.customerId == request.auth.uid || 
     resource.data.hairdresserId == request.auth.uid);
  allow create: if request.auth != null && 
    request.resource.data.hairdresserId == request.auth.uid;
}

// evaluations
match /evaluations/{evaluationId} {
  allow read: if request.auth != null && 
    (resource.data.customerId == request.auth.uid || 
     resource.data.hairdresserId == request.auth.uid);
  allow create: if request.auth != null && 
    request.resource.data.customerId == request.auth.uid;
}

// btDistributions
match /btDistributions/{distributionId} {
  allow read: if request.auth != null && 
    (resource.data.fromUserId == request.auth.uid || 
     resource.data.toUserId == request.auth.uid);
  allow create: if request.auth != null && 
    request.resource.data.fromUserId == request.auth.uid;
}

// users
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && userId == request.auth.uid;
}
```

## ✅ 実装完了

以下のバックエンドルートが実装されています：

- ✅ `trpc.visit.checkIn` - 来店処理
- ✅ `trpc.visit.saveMedicalRecord` - カルテ記入・金額入力
- ✅ `trpc.visit.submitCustomerRating` - 顧客評価・金額入力
- ✅ `trpc.visit.getSession` - セッション取得
- ✅ `trpc.visit.distributeAssistantBT` - アシスタントBT分配

すべてのデータはFirebaseに保存され、完全なバックエンド管理が実現されています。
