# Firebase設定手順

## 1. Firestoreコレクション構成

このアプリでは以下の3つのコレクションを使用します：

### matchingRequests
- **フィールド**:
  - id: string
  - customerId: string
  - customerName: string
  - requestDate: string
  - desiredDate?: string
  - desiredTime?: string
  - menu: string[]
  - concerns: string
  - latitude?: number
  - longitude?: number
  - address?: string
  - status: string ('pending' | 'matched' | 'completed' | 'cancelled')
  - matchedHairdresserId?: string
  - matchedHairdresserName?: string
  - matchedAt?: string
  - createdAt: timestamp
  - updatedAt: timestamp

### matches
- **フィールド**:
  - id: string
  - requestId: string
  - customerId: string
  - customerName: string
  - hairdresserId: string
  - hairdresserName: string
  - matchedAt: string
  - status: string ('scout_pending' | 'booking_confirmed' | 'cancelled' | 'completed' | 'rejected')
  - chatUnlocked: boolean
  - visitCompleted: boolean
  - ratingCompleted: boolean
  - cancelRequestBy?: string ('customer' | 'hairdresser')
  - cancelReason?: string
  - createdAt: timestamp
  - updatedAt: timestamp

### matchLogs
- **フィールド**:
  - id: string
  - type: string ('scout_sent' | 'scout_accepted' | 'scout_rejected' | 'booking_confirmed' | 'cancelled')
  - hairdresserId: string
  - hairdresserName: string
  - customerId: string
  - customerName: string
  - requestId: string
  - matchId: string
  - timestamp: string
  - details?: any
  - createdAt: timestamp

## 2. 必要なFirestore複合インデックス

Firebase Consoleで以下のインデックスを作成する必要があります：

### matchingRequests
1. **customerId + createdAt（降順）**
   - コレクション: matchingRequests
   - フィールド:
     - customerId (Ascending)
     - createdAt (Descending)

2. **status + createdAt（降順）**
   - コレクション: matchingRequests
   - フィールド:
     - status (Ascending)
     - createdAt (Descending)

### matches
1. **customerId + createdAt（降順）**
   - コレクション: matches
   - フィールド:
     - customerId (Ascending)
     - createdAt (Descending)

2. **hairdresserId + createdAt（降順）**
   - コレクション: matches
   - フィールド:
     - hairdresserId (Ascending)
     - createdAt (Descending)

### matchLogs
1. **matchId + createdAt（降順）**
   - コレクション: matchLogs
   - フィールド:
     - matchId (Ascending)
     - createdAt (Descending)

2. **createdAt（降順）のみ**
   - コレクション: matchLogs
   - フィールド:
     - createdAt (Descending)

## 3. インデックス作成手順

1. Firebase Console (https://console.firebase.google.com/) にアクセス
2. プロジェクト "beauty-token-fbeaa" を選択
3. 左メニューから "Firestore Database" を選択
4. "インデックス" タブを選択
5. "複合インデックスを追加" をクリック
6. 上記の各インデックスを順番に作成

## 4. セキュリティルール

Firestoreのセキュリティルールを設定してください：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // matchingRequests
    match /matchingRequests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.resource.data.customerId == request.auth.uid;
      allow update: if request.auth != null 
        && (resource.data.customerId == request.auth.uid 
            || request.auth.token.role == 'hairdresser');
      allow delete: if request.auth != null 
        && resource.data.customerId == request.auth.uid;
    }
    
    // matches
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.resource.data.hairdresserId == request.auth.uid;
      allow update: if request.auth != null 
        && (resource.data.customerId == request.auth.uid 
            || resource.data.hairdresserId == request.auth.uid);
      allow delete: if false;
    }
    
    // matchLogs
    match /matchLogs/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

## 5. アプリ起動時の注意

初回起動時、インデックスが作成されていない場合、Firestoreからエラーが返されます。
エラーメッセージに表示されるURLにアクセスすると、自動的にインデックス作成画面が開きます。

## 6. テストデータの作成（オプション）

Firestore Consoleから手動でテストデータを追加することができます：

1. "データ" タブを選択
2. "コレクションを開始" をクリック
3. コレクションID（matchingRequests、matches、matchLogs）を入力
4. 最初のドキュメントを追加

## 7. トラブルシューティング

### エラー: "The query requires an index"
- Firebase Consoleでインデックスを作成してください
- エラーメッセージのリンクをクリックすると自動的にインデックス作成画面が開きます

### エラー: "Missing or insufficient permissions"
- セキュリティルールが正しく設定されているか確認してください
- ユーザーが正しく認証されているか確認してください

### リアルタイム更新が動作しない
- onSnapshotのサブスクリプションが正しく設定されているか確認してください
- ネットワーク接続を確認してください
- Firebaseのクォータ制限を超えていないか確認してください
