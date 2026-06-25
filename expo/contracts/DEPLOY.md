# BP SBT スマートコントラクト デプロイ手順（Polygon Amoy）

## 方法1: Thirdweb Dashboard（最も簡単・推奨）

### 1. Thirdwebダッシュボードでデプロイ
1. https://thirdweb.com/dashboard にログイン
2. 左メニュー「Contracts」→「Deploy」をクリック
3. 「Deploy a contract」→「Deploy Now」
4. 「Import Contract」を選択

### 2. Remix でコンパイルしてABIとBytecodeを取得
1. https://remix.ethereum.org/ にアクセス
2. 新しいファイル `BPSBT.sol` を作成
3. `contracts/BPSBT.sol` の内容をコピー&ペースト
4. OpenZeppelinのインポートはRemixが自動解決
5. Compiler version: `0.8.20` を選択 → 「Compile」
6. コンパイル後、ABIとBytecodeをコピー

### 3. Thirdwebでデプロイ
1. Thirdweb Dashboard → Contracts → Deploy
2. ネットワーク: **Polygon Amoy Testnet (Chain ID: 80002)** を選択
3. コンストラクタパラメータは不要（引数なし）
4. 「Deploy Now」をクリック
5. MetaMaskでトランザクションを承認

### 4. テスト用MATICを取得
- https://faucet.polygon.technology/ → Amoyを選択
- または https://www.alchemy.com/faucets/polygon-amoy

### 5. デプロイ後
1. Thirdwebダッシュボードに表示されたコントラクトアドレスをコピー
2. `lib/sbt-contract.ts` を更新:
   ```typescript
   export const BP_SBT_CONTRACT_ADDRESS = 'デプロイしたアドレス';
   ```

---

## 方法2: Remix IDE + MetaMask

### 1. Remixで開く
1. https://remix.ethereum.org/ にアクセス
2. 新しいファイル `BPSBT.sol` を作成
3. `contracts/BPSBT.sol` の内容をコピー&ペースト

### 2. コンパイル
1. 左側の「Solidity Compiler」タブ
2. Compiler version: `0.8.20` 以上を選択
3. 「Compile BPSBT.sol」をクリック

### 3. MetaMaskにPolygon Amoyを追加
- Network Name: Polygon Amoy Testnet
- RPC URL: https://rpc-amoy.polygon.technology/
- Chain ID: 80002
- Currency Symbol: MATIC
- Block Explorer: https://amoy.polygonscan.com

### 4. テスト用MATICを取得
- https://faucet.polygon.technology/ → Amoyを選択

### 5. デプロイ
1. 「Deploy & Run Transactions」タブ
2. Environment: 「Injected Provider - MetaMask」
3. MetaMaskで Polygon Amoy に接続
4. Contract: 「BPSBT」を選択
5. 「Deploy」→ MetaMaskで承認

### 6. デプロイ後
1. コントラクトアドレスをコピー
2. `lib/sbt-contract.ts` を更新

---

## 方法3: Hardhat

### 1. セットアップ
```bash
mkdir hardhat-deploy && cd hardhat-deploy
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
npx hardhat init
```

### 2. hardhat.config.js
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: "https://rpc-amoy.polygon.technology/",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 80002
    }
  }
};
```

### 3. デプロイ
```bash
cp ../contracts/BPSBT.sol contracts/
DEPLOYER_PRIVATE_KEY=your_key npx hardhat run scripts/deploy.js --network amoy
```

---

## デプロイ後の確認

1. Amoy PolygonScanで確認:
   https://amoy.polygonscan.com/address/YOUR_CONTRACT_ADDRESS

2. Thirdwebダッシュボードでコントラクトを管理:
   - Read/Write機能でテスト可能
   - Paymaster設定が適用されていることを確認

3. アプリ内でテスト:
   - 美容師アカウントでThirdwebウォレット接続
   - BP SBTミント（Paymaster経由・ガスレス）を確認

---

## Paymaster（ガススポンサー）設定

1. Thirdwebダッシュボード → 左メニュー「Engine」or「Account Abstraction」
2. Polygon Amoyチェーンを選択
3. Paymasterにテスト用MATICをデポジット
4. `sponsorGas: true` がコード内で設定済み → 自動的にガスレス

---

## トラブルシューティング

### ガス不足エラー
- テストMATICを取得: https://faucet.polygon.technology/

### コンパイルエラー
- Solidity 0.8.20 以上を使用
- OpenZeppelin v5系対応（Counters.solが廃止の場合はv4を使用）

### Paymaster動作しない
- Thirdwebダッシュボードでデポジット残高を確認
- Client IDが正しいか確認
- `sponsorGas: true` が設定されているか確認
