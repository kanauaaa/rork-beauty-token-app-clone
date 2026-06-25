const { ethers } = require('ethers');

async function deployContract() {
  console.log('🚀 Starting deployment to Polygon Amoy Testnet...');

  const RPC_URL = 'https://rpc-amoy.polygon.technology/';
  
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Please set DEPLOYER_PRIVATE_KEY environment variable');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('📍 Deployer address:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'MATIC');

  if (balance === 0n) {
    console.log('⚠️ No MATIC balance. Get testnet MATIC from:');
    console.log('   https://faucet.polygon.technology/');
    console.log('   https://www.alchemy.com/faucets/polygon-amoy');
    return;
  }

  console.log('\n📋 デプロイ手順:');
  console.log('1. Remix IDE (https://remix.ethereum.org/) を使用するのが最も簡単です');
  console.log('2. contracts/BPSBT.sol をコピー&ペースト');
  console.log('3. Solidity 0.8.20 でコンパイル');
  console.log('4. MetaMask で Polygon Amoy (Chain ID: 80002) に接続');
  console.log('5. Deploy → MetaMaskで承認');
  console.log('6. lib/sbt-contract.ts のアドレスを更新');
  console.log('\n💡 または Thirdweb Dashboard からデプロイ（推奨）:');
  console.log('   https://thirdweb.com/dashboard → Contracts → Deploy');
}

deployContract().catch(console.error);
