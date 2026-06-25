import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BP_SBT_ABI, BP_SBT_CONTRACT_ADDRESS, NFT_COLLECTION_ADDRESS, BP_TOKEN_ID } from '@/lib/sbt-contract';
import { useAuth } from './AuthProvider';
import { trpcClient } from '@/lib/trpc';


export const POLYGON_MAINNET = {
  chainId: 137,
  name: 'Polygon Mainnet',
  rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
  blockExplorer: 'https://polygonscan.com',
};

export const JPYC_CONTRACT = '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB';

export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  }
] as const;

const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const ERC1155_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: '_receiver', type: 'address' },
      { name: '_tokenId', type: 'uint256' },
      { name: '_quantity', type: 'uint256' },
      { name: '_currency', type: 'address' },
      { name: '_pricePerToken', type: 'uint256' },
      {
        name: '_allowlistProof',
        type: 'tuple',
        components: [
          { name: 'proof', type: 'bytes32[]' },
          { name: 'quantityLimitPerWallet', type: 'uint256' },
          { name: 'pricePerToken', type: 'uint256' },
          { name: 'currency', type: 'address' },
        ],
      },
      { name: '_data', type: 'bytes' },
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
] as const;

export interface Network {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
}

export type NetworkType = typeof POLYGON_MAINNET;

interface Web3State {
  address: string | null;
  isConnected: boolean;
  network: Network;
  balance: string;
  jpycBalance: string;
  isLoading: boolean;
  provider: ethers.JsonRpcProvider | null;
  wallet: ethers.Wallet | null;

  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: (network: Network) => Promise<void>;
  importAddressFromQR: (qrAddress: string) => Promise<void>;
  getBalance: () => Promise<void>;
  generateWallet: () => Promise<{ address: string; privateKey: string; mnemonic: string }>;
  loadWalletFromPrivateKey: (privateKey: string) => Promise<void>;
  mintBPSBT: (toAddress: string, bpAmount: number, category: string) => Promise<string>;
  getBPBalance: (address: string) => Promise<number>;
  getBPByCategory: (address: string, category: string) => Promise<number>;
  getJPYCBalance: (walletAddress?: string) => Promise<string>;
  transferJPYC: (toAddress: string, amount: string) => Promise<string>;
  sendThirdwebVerificationEmail: (email?: string) => Promise<void>;
  verifyAndConnectThirdwebWallet: (verificationCode: string, email?: string) => Promise<{ address: string }>;
  mintBPSBTWithPaymaster: (toAddress: string, bpAmount: number, category: string) => Promise<string>;
  getBPBalanceERC1155: (walletAddress: string) => Promise<number>;
  transferJPYCWithPaymaster: (toAddress: string, amount: string) => Promise<string>;
}

export const [Web3Provider, useWeb3] = createContextHook((): Web3State => {
  const { user } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [network, setNetwork] = useState<Network>(POLYGON_MAINNET);
  const [balance, setBalance] = useState<string>('0.0');
  const [jpycBalance, setJpycBalance] = useState<string>('0.0');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);

  const initializeProvider = useCallback(() => {
    try {
      const jsonRpcProvider = new ethers.JsonRpcProvider(network.rpcUrl);
      setProvider(jsonRpcProvider);
    } catch (error) {
      console.error('Failed to initialize provider:', error);
    }
  }, [network]);

  const loadSavedWallet = useCallback(async () => {
    if (!user) return;

    try {
      const privateKeyStorageKey = `@web3_private_key_${user.id}`;
      const networkStorageKey = `@web3_network_${user.id}`;

      const savedPrivateKey = await AsyncStorage.getItem(privateKeyStorageKey);
      const savedNetwork = await AsyncStorage.getItem(networkStorageKey);

      if (savedNetwork) {
        const parsedNetwork = JSON.parse(savedNetwork);
        setNetwork(parsedNetwork);
      }

      if (savedPrivateKey && provider) {
        const walletInstance = new ethers.Wallet(savedPrivateKey, provider);
        setWallet(walletInstance);
        setAddress(walletInstance.address);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to load saved wallet:', error);
    }
  }, [provider, user]);

  const updateBalance = useCallback(async (walletAddress: string, retryCount = 0) => {
    if (!provider) return;

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      const balanceWei = await Promise.race([
        provider.getBalance(walletAddress),
        timeoutPromise
      ]) as bigint;

      const balanceEth = ethers.formatEther(balanceWei);
      setBalance(parseFloat(balanceEth).toFixed(4));
    } catch {
      if (retryCount < 1) {
        setTimeout(() => {
          void updateBalance(walletAddress, retryCount + 1);
        }, 2000);
      } else {
        setBalance('0.0000');
      }
    }
  }, [provider]);

  useEffect(() => {
    initializeProvider();
  }, [initializeProvider]);

  useEffect(() => {
    if (provider) {
      void loadSavedWallet();
    }
  }, [provider, loadSavedWallet]);

  useEffect(() => {
    if (provider && address) {
      void updateBalance(address);
    }
  }, [provider, address, updateBalance]);

  const generateWallet = useCallback(async (): Promise<{ address: string; privateKey: string; mnemonic: string }> => {
    const newWallet = ethers.Wallet.createRandom();
    const privateKey = newWallet.privateKey;
    const walletAddress = newWallet.address;
    const mnemonic = newWallet.mnemonic?.phrase || '';

    if (!user) {
      throw new Error('User not logged in');
    }

    await AsyncStorage.setItem(`@web3_private_key_${user.id}`, privateKey);
    await AsyncStorage.setItem(`@web3_wallet_address_${user.id}`, walletAddress);

    if (provider) {
      const walletInstance = new ethers.Wallet(privateKey, provider);
      setWallet(walletInstance);
      setAddress(walletAddress);
      setIsConnected(true);
      await updateBalance(walletAddress);
    }

    return { address: walletAddress, privateKey, mnemonic };
  }, [provider, updateBalance, user]);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    try {
      const existingKey = user ? await AsyncStorage.getItem(`@web3_private_key_${user.id}`) : null;
      if (existingKey && provider) {
        const walletInstance = new ethers.Wallet(existingKey, provider);
        setWallet(walletInstance);
        setAddress(walletInstance.address);
        setIsConnected(true);
        await updateBalance(walletInstance.address);
      } else {
        await generateWallet();
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, provider, updateBalance, generateWallet]);

  const importAddressFromQR = useCallback(async (qrAddress: string) => {
    setIsLoading(true);
    try {
      let cleanAddress = qrAddress.trim();

      if (cleanAddress.startsWith('ethereum:')) {
        cleanAddress = cleanAddress.replace('ethereum:', '');
      }
      if (cleanAddress.includes('@')) {
        cleanAddress = cleanAddress.split('@')[0];
      }
      if (cleanAddress.includes('?')) {
        cleanAddress = cleanAddress.split('?')[0];
      }

      if (!ethers.isAddress(cleanAddress)) {
        throw new Error('Invalid Ethereum address');
      }

      setAddress(cleanAddress);
      setIsConnected(true);
      if (user) {
        await AsyncStorage.setItem(`@web3_wallet_address_${user.id}`, cleanAddress);
      }
      await updateBalance(cleanAddress);
    } catch {
      throw new Error('無効なアドレス形式です');
    } finally {
      setIsLoading(false);
    }
  }, [user, updateBalance]);

  const disconnectWallet = useCallback(async () => {
    setAddress(null);
    setIsConnected(false);
    setBalance('0.0');
    setWallet(null);
    if (user) {
      await AsyncStorage.removeItem(`@web3_wallet_address_${user.id}`);
      await AsyncStorage.removeItem(`@web3_private_key_${user.id}`);
      await AsyncStorage.removeItem(`@web3_network_${user.id}`);
    }
  }, [user]);

  const switchNetwork = useCallback(async (newNetwork: Network) => {
    setNetwork(newNetwork);
    if (user) {
      await AsyncStorage.setItem(`@web3_network_${user.id}`, JSON.stringify(newNetwork));
    }
    if (address) {
      await updateBalance(address);
    }
  }, [user, address, updateBalance]);

  const getBalance = useCallback(async () => {
    if (!address) {
      throw new Error('ウォレットが接続されていません');
    }
    if (!provider) {
      throw new Error('プロバイダーが初期化されていません');
    }
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      const balanceWei = await Promise.race([
        provider.getBalance(address),
        timeoutPromise
      ]) as bigint;

      const balanceEth = ethers.formatEther(balanceWei);
      setBalance(parseFloat(balanceEth).toFixed(4));
    } catch {
      setBalance('0.0000');
      throw new Error('残高の取得に失敗しました。ネットワーク接続を確認してください。');
    }
  }, [address, provider]);

  const loadWalletFromPrivateKey = useCallback(async (privateKey: string) => {
    if (!provider) {
      throw new Error('Provider not initialized');
    }

    const walletInstance = new ethers.Wallet(privateKey, provider);
    const walletAddress = walletInstance.address;

    if (!user) {
      throw new Error('User not logged in');
    }

    await AsyncStorage.setItem(`@web3_private_key_${user.id}`, privateKey);
    await AsyncStorage.setItem(`@web3_wallet_address_${user.id}`, walletAddress);

    setWallet(walletInstance);
    setAddress(walletAddress);
    setIsConnected(true);
    await updateBalance(walletAddress);
  }, [provider, updateBalance, user]);

  const getPolygonProvider = useCallback(() => {
    return new ethers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com');
  }, []);



  const mintBPSBT = useCallback(async (toAddress: string, bpAmount: number, _category: string): Promise<string> => {
    try {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      const polygonProvider = getPolygonProvider();
      const connectedWallet = wallet.connect(polygonProvider);
      const nftContract = new ethers.Contract(NFT_COLLECTION_ADDRESS, ERC1155_ABI, connectedWallet);
      const allowlistProof = {
        proof: [],
        quantityLimitPerWallet: 0n,
        pricePerToken: 0n,
        currency: ethers.ZeroAddress,
      };
      const tx = await nftContract.claim(toAddress, BP_TOKEN_ID, BigInt(bpAmount), NATIVE_TOKEN_ADDRESS, 0n, allowlistProof, '0x');
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('[Web3] mintBPSBT failed:', error);
      throw error;
    }
  }, [wallet, getPolygonProvider]);

  const getBPBalance = useCallback(async (walletAddress: string): Promise<number> => {
    try {
      if (!provider) {
        throw new Error('Provider not initialized');
      }

      const contract = new ethers.Contract(BP_SBT_CONTRACT_ADDRESS, BP_SBT_ABI, provider);
      const totalBP = await contract.getTotalBP(walletAddress);
      return Number(totalBP);
    } catch {
      return 0;
    }
  }, [provider]);

  const getBPByCategory = useCallback(async (walletAddress: string, category: string): Promise<number> => {
    try {
      if (!provider) {
        throw new Error('Provider not initialized');
      }

      const contract = new ethers.Contract(BP_SBT_CONTRACT_ADDRESS, BP_SBT_ABI, provider);
      const categoryBP = await contract.getBPByCategory(walletAddress, category);
      return Number(categoryBP);
    } catch {
      return 0;
    }
  }, [provider]);

  const getJPYCBalance = useCallback(async (walletAddress?: string): Promise<string> => {
    try {
      if (!provider) {
        setJpycBalance('0.0');
        return '0.0';
      }

      const targetAddress = walletAddress || address;
      if (!targetAddress) {
        setJpycBalance('0.0');
        return '0.0';
      }

      if (network.chainId !== POLYGON_MAINNET.chainId) {
        setJpycBalance('0.0');
        return '0.0';
      }

      const polygonProvider = new ethers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com');
      const contract = new ethers.Contract(JPYC_CONTRACT, ERC20_ABI, polygonProvider);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );

      const [bal, decimals] = await Promise.race([
        Promise.all([
          contract.balanceOf(targetAddress),
          contract.decimals()
        ]),
        timeoutPromise
      ]) as [bigint, number];

      const formattedBalance = ethers.formatUnits(bal, decimals);
      const balanceStr = parseFloat(formattedBalance).toFixed(2);

      setJpycBalance(balanceStr);
      return balanceStr;
    } catch {
      setJpycBalance('0.0');
      return '0.0';
    }
  }, [provider, address, network]);

  useEffect(() => {
    if (provider && address && network.chainId === POLYGON_MAINNET.chainId) {
      void getJPYCBalance(address);
    }
  }, [provider, address, network, getJPYCBalance]);

  const transferJPYC = useCallback(async (toAddress: string, amount: string): Promise<string> => {
    if (!wallet || !provider) {
      throw new Error('Wallet not connected');
    }

    if (network.chainId !== POLYGON_MAINNET.chainId) {
      throw new Error('Please switch to Polygon Mainnet');
    }

    const contract = new ethers.Contract(JPYC_CONTRACT, ERC20_ABI, wallet);
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    const tx = await contract.transfer(toAddress, amountWei);
    const receipt = await tx.wait();

    await getJPYCBalance();
    await updateBalance(wallet.address);

    return receipt.hash;
  }, [wallet, provider, network, getJPYCBalance, updateBalance]);

  const sendThirdwebVerificationEmail = useCallback(async (_email?: string): Promise<void> => {
    throw new Error('Thirdweb wallet is not available. Please use a generated wallet or import via private key.');
  }, []);

  const verifyAndConnectThirdwebWallet = useCallback(async (_verificationCode: string, _email?: string): Promise<{ address: string }> => {
    throw new Error('Thirdweb wallet is not available. Please use a generated wallet or import via private key.');
  }, []);

  const mintBPSBTWithPaymaster = useCallback(async (toAddress: string, bpAmount: number, _category: string): Promise<string> => {
    console.log('[Web3] mintBPSBTWithPaymaster -> calling backend gasless relay');
    try {
      const result = await trpcClient.gasless.mintBPSBT.mutate({
        toAddress,
        quantity: bpAmount,
      });
      console.log('[Web3] Gasless BP mint success:', result.txHash);
      return result.txHash;
    } catch (error: any) {
      console.error('[Web3] Gasless BP mint failed:', error.message);
      throw new Error(`BP SBTミントに失敗しました。運営にお問い合わせください。(${error.message})`);
    }
  }, []);

  const getBPBalanceERC1155 = useCallback(async (walletAddress: string): Promise<number> => {
    try {
      const polygonProvider = getPolygonProvider();
      const nftContract = new ethers.Contract(NFT_COLLECTION_ADDRESS, ERC1155_ABI, polygonProvider);
      const bal = await nftContract.balanceOf(walletAddress, BP_TOKEN_ID);
      return Number(bal);
    } catch {
      return 0;
    }
  }, [getPolygonProvider]);

  const transferJPYCWithPaymaster = useCallback(async (toAddress: string, amount: string): Promise<string> => {
    console.log('[Web3] transferJPYCWithPaymaster -> calling backend gasless relay');
    try {
      const result = await trpcClient.gasless.transferJPYC.mutate({
        toAddress,
        amount,
      });
      console.log('[Web3] Gasless JPYC transfer success:', result.txHash);
      if (address) {
        void getJPYCBalance(address);
        void updateBalance(address);
      }
      return result.txHash;
    } catch (error: any) {
      console.error('[Web3] Gasless JPYC transfer failed, falling back to direct tx:', error.message);
      return transferJPYC(toAddress, amount);
    }
  }, [transferJPYC, address, getJPYCBalance, updateBalance]);

  return useMemo(() => ({
    address,
    isConnected,
    network,
    balance,
    jpycBalance,
    isLoading,
    provider,
    wallet,

    connectWallet,
    disconnectWallet,
    switchNetwork,
    importAddressFromQR,
    getBalance,
    generateWallet,
    loadWalletFromPrivateKey,
    mintBPSBT,
    getBPBalance,
    getBPByCategory,
    getJPYCBalance,
    transferJPYC,
    sendThirdwebVerificationEmail,
    verifyAndConnectThirdwebWallet,
    mintBPSBTWithPaymaster,
    getBPBalanceERC1155,
    transferJPYCWithPaymaster,
  }), [
    address, isConnected, network, balance, jpycBalance, isLoading, provider, wallet,
    connectWallet, disconnectWallet, switchNetwork, importAddressFromQR, getBalance,
    generateWallet, loadWalletFromPrivateKey, mintBPSBT, getBPBalance, getBPByCategory,
    getJPYCBalance, transferJPYC, sendThirdwebVerificationEmail, verifyAndConnectThirdwebWallet,
    mintBPSBTWithPaymaster,
    getBPBalanceERC1155, transferJPYCWithPaymaster,
  ]);
});
