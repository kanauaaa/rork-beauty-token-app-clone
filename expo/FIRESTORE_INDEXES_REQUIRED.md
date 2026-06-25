# Firestore インデックス作成ガイド

このファイルには、アプリで必要なすべてのFirestoreインデックスがリストされています。
Firebase Consoleで手動で作成してください。

## インデックス作成手順

1. [Firebase Console](https://console.firebase.google.com/) を開く
2. プロジェクトを選択
3. **Firestore Database** → **インデックス** → **複合インデックス** タブ
4. 「**インデックスを作成**」ボタンをクリック
5. 以下の表から情報をコピーして入力

---

## ✅ 必要なインデックス一覧

### 📁 favorites コレクション

| # | フィールド1 | 順序 | フィールド2 | 順序 | 用途 |
|---|------------|------|------------|------|------|
| 1 | `customerId` | 昇順 | `createdAt` | 降順 | 顧客のお気に入り美容師一覧 |
| 2 | `hairdresserId` | 昇順 | `createdAt` | 降順 | 美容師をお気に入りした顧客一覧（キャンセル待ち・呼び込み用） |

---

### 📁 scoutRequests コレクション

| # | フィールド1 | 順序 | フィールド2 | 順序 | フィールド3 | 順序 | 用途 |
|---|------------|------|------------|------|------------|------|------|
| 1 | `customerId` | 昇順 | `status` | 昇順 | `createdAt` | 降順 | 顧客が受け取ったスカウト申請 |
| 2 | `hairdresserId` | 昇順 | `status` | 昇順 | `createdAt` | 降順 | 美容師が送信したスカウト履歴 |

---

### 📁 matchingRequests コレクション

| # | フィールド1 | 順序 | フィールド2 | 順序 | 用途 |
|---|------------|------|------------|------|------|
| 1 | `customerId` | 昇順 | `requestDate` | 降順 | 顧客のマッチング申請一覧 |
| 2 | `status` | 昇順 | `requestDate` | 降順 | 募集中のマッチング申請（美容師用） |

---

### 📁 matches コレクション

| # | フィールド1 | 順序 | フィールド2 | 順序 | フィールド3 | 順序 | 用途 |
|---|------------|------|------------|------|------------|------|------|
| 1 | `customerId` | 昇順 | `matchedAt` | 降順 | - | - | 顧客のマッチング履歴 |
| 2 | `hairdresserId` | 昇順 | `matchedAt` | 降順 | - | - | 美容師のマッチング履歴 |
| 3 | `customerId` | 昇順 | `status` | 昇順 | `matchedAt` | 降順 | 顧客の特定ステータスマッチ |
| 4 | `hairdresserId` | 昇順 | `status` | 昇順 | `matchedAt` | 降順 | 美容師の特定ステータスマッチ |

---

### 📁 scoutHistory コレクション

| # | フィールド1 | 順序 | フィールド2 | 順序 | フィールド3 | 順序 | 用途 |
|---|------------|------|------------|------|------------|------|------|
| 1 | `hairdresserId` | 昇順 | `scoutedAt` | 降順 | - | - | 美容師のスカウト履歴 |
| 2 | `hairdresserId` | 昇順 | `status` | 昇順 | `acceptedAt` | 降順 | 美容師の承認済みスカウト |

---

### 📁 assistantBTTasks コレクション

| # | フィールド1 | 順序 | フィールド2 | 順序 | フィールド3 | 順序 | 用途 |
|---|------------|------|------------|------|------------|------|------|
| 1 | `fromHairdresserId` | 昇順 | `status` | 昇順 | `createdAt` | 降順 | 美容師のアシスタントBT付与タスク |

---

### 📁 assistantBTTransfers コレクション

| # | フィールド1 | 順序 | フィールド2 | 順序 | 用途 |
|---|------------|------|------------|------|------|
| 1 | `fromHairdresserId` | 昇順 | `createdAt` | 降順 | 美容師のアシスタントBT付与履歴 |
| 2 | `toHairdresserId` | 昇順 | `createdAt` | 降順 | アシスタントが受け取ったBT履歴 |

---

### 📁 disputes コレクション

| # | フィールド1 | 順序 | フィールド2 | 順序 | フィールド3 | 順序 | 用途 |
|---|------------|------|------------|------|------------|------|------|
| 1 | `customerId` | 昇順 | `status` | 昇順 | `createdAt` | 降順 | 顧客の金額不一致・再評価状況 |
| 2 | `hairdresserId` | 昇順 | `status` | 昇順 | `createdAt` | 降順 | 美容師の金額不一致・再評価状況 |
| 3 | `status` | 昇順 | `createdAt` | 降順 | - | - | 運営の金額不一致管理 |

---

## 📋 Firebase Console での入力例

インデックスを作成する際は、以下のように入力してください：

### 例：favorites コレクション - インデックス1

```
コレクションID: favorites
クエリ範囲: コレクション

フィールド:
  1. customerId    [昇順]
  2. createdAt     [降順]
```

### 例：scoutRequests コレクション - インデックス1

```
コレクションID: scoutRequests
クエリ範囲: コレクション

フィールド:
  1. customerId    [昇順]
  2. status        [昇順]
  3. createdAt     [降順]
```

---

## ⚠️ 注意事項

- インデックスの作成には**数分～数十分**かかる場合があります
- ステータスが「**構築中**」→「**有効**」に変わるまで待ってください
- すべてのインデックスを作成することを**強く推奨**します
- エラーが発生した場合、エラーメッセージのリンクから直接インデックスを作成できます

---

## ✅ 作成状況チェックリスト

インデックスを作成したら、以下にチェックを入れてください：

### favorites
- [ ] インデックス1 (customerId + createdAt)
- [ ] インデックス2 (hairdresserId + createdAt)

### scoutRequests
- [ ] インデックス1 (customerId + status + createdAt)
- [ ] インデックス2 (hairdresserId + status + createdAt)

### matchingRequests
- [ ] インデックス1 (customerId + requestDate)
- [ ] インデックス2 (status + requestDate)

### matches
- [ ] インデックス1 (customerId + matchedAt)
- [ ] インデックス2 (hairdresserId + matchedAt)
- [ ] インデックス3 (customerId + status + matchedAt)
- [ ] インデックス4 (hairdresserId + status + matchedAt)

### scoutHistory
- [ ] インデックス1 (hairdresserId + scoutedAt)
- [ ] インデックス2 (hairdresserId + status + acceptedAt)

### assistantBTTasks
- [ ] インデックス1 (fromHairdresserId + status + createdAt)

### assistantBTTransfers
- [ ] インデックス1 (fromHairdresserId + createdAt)
- [ ] インデックス2 (toHairdresserId + createdAt)

### disputes
- [ ] インデックス1 (customerId + status + createdAt)
- [ ] インデックス2 (hairdresserId + status + createdAt)
- [ ] インデックス3 (status + createdAt)

---

## 🔍 インデックス作成の確認方法

1. Firebase Console → Firestore Database → インデックス
2. 複合インデックスタブで上記のインデックスが「**有効**」になっていることを確認
3. アプリを実行し、コンソールでインデックスエラーが出ないことを確認

---

**最終更新**: 2025年12月5日
