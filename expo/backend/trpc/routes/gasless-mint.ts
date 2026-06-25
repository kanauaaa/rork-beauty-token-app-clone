import * as z from "zod";
import { ethers } from "ethers";
import { createTRPCRouter, publicProcedure } from "../create-context";

const NFT_COLLECTION_ADDRESS = "0x64AFfd7313032550bcD7d064aaF3276d542175d7";
const JPYC_CONTRACT = "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB";
const BP_TOKEN_ID = 0n;
const POLYGON_RPC = "https://polygon-bor-rpc.publicnode.com";

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const ERC1155_CLAIM_ABI = [
  {
    inputs: [
      { name: "_receiver", type: "address" },
      { name: "_tokenId", type: "uint256" },
      { name: "_quantity", type: "uint256" },
      { name: "_currency", type: "address" },
      { name: "_pricePerToken", type: "uint256" },
      {
        name: "_allowlistProof",
        type: "tuple",
        components: [
          { name: "proof", type: "bytes32[]" },
          { name: "quantityLimitPerWallet", type: "uint256" },
          { name: "pricePerToken", type: "uint256" },
          { name: "currency", type: "address" },
        ],
      },
      { name: "_data", type: "bytes" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const;

const FALLBACK_RPCS = [
  "https://polygon-bor-rpc.publicnode.com",
  "https://polygon-rpc.com",
  "https://rpc.ankr.com/polygon",
  "https://polygon.drpc.org",
];

function getBackendWallet(): ethers.Wallet {
  let privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("BACKEND_WALLET_PRIVATE_KEY is not configured");
  }
  privateKey = privateKey.trim();
  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }
  const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
  return new ethers.Wallet(privateKey, provider);
}

async function explainError(
  err: any,
  wallet: ethers.Wallet,
  estimate: () => Promise<bigint>
): Promise<string> {
  const parts: string[] = [];
  const short = err?.shortMessage || err?.reason || err?.message || String(err);
  parts.push(short);
  try {
    const bal = await wallet.provider!.getBalance(wallet.address);
    parts.push(`backend=${wallet.address}`);
    parts.push(`MATIC=${ethers.formatEther(bal)}`);
    if (bal === 0n) {
      parts.push("[原因: MATIC残高が0です。このアドレスに入金してください]");
    }
  } catch {}
  try {
    await estimate();
  } catch (estErr: any) {
    const revert =
      estErr?.shortMessage || estErr?.reason || estErr?.info?.error?.message;
    if (revert) parts.push(`revert=${revert}`);
    if (estErr?.data) parts.push(`data=${estErr.data}`);
  }
  return parts.join(" | ");
}

export const gaslessMintRouter = createTRPCRouter({
  mintBPSBT: publicProcedure
    .input(
      z.object({
        toAddress: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      console.log(
        `[GaslessMint] mintBPSBT to=${input.toAddress} qty=${input.quantity}`
      );
      try {
        const wallet = getBackendWallet();
        const contract = new ethers.Contract(
          NFT_COLLECTION_ADDRESS,
          ERC1155_CLAIM_ABI,
          wallet
        );

        const allowlistProof = {
          proof: [],
          quantityLimitPerWallet: 0n,
          pricePerToken: 0n,
          currency: ethers.ZeroAddress,
        };

        const args = [
          input.toAddress,
          BP_TOKEN_ID,
          BigInt(input.quantity),
          NATIVE_TOKEN,
          0n,
          allowlistProof,
          "0x",
        ] as const;

        const bal = await wallet.provider!.getBalance(wallet.address);
        console.log(
          `[GaslessMint] backend=${wallet.address} MATIC=${ethers.formatEther(bal)}`
        );
        if (bal === 0n) {
          throw new Error(
            `バックエンドウォレット(${wallet.address})のMATIC残高が0です`
          );
        }

        const tx = await contract.claim(...args);
        console.log(`[GaslessMint] BP tx sent: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`[GaslessMint] BP tx confirmed: ${receipt.hash}`);

        return { success: true, txHash: receipt.hash };
      } catch (error: any) {
        const wallet = (() => {
          try { return getBackendWallet(); } catch { return null; }
        })();
        const detail = wallet
          ? await explainError(error, wallet, async () => {
              const c = new ethers.Contract(
                NFT_COLLECTION_ADDRESS,
                ERC1155_CLAIM_ABI,
                wallet
              );
              return c.claim.estimateGas(
                input.toAddress,
                BP_TOKEN_ID,
                BigInt(input.quantity),
                NATIVE_TOKEN,
                0n,
                {
                  proof: [],
                  quantityLimitPerWallet: 0n,
                  pricePerToken: 0n,
                  currency: ethers.ZeroAddress,
                },
                "0x"
              );
            })
          : error.message;
        console.error("[GaslessMint] mintBPSBT error:", detail);
        throw new Error(`BP SBTミントに失敗しました: ${detail}`);
      }
    }),

  transferJPYC: publicProcedure
    .input(
      z.object({
        toAddress: z.string(),
        amount: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      console.log(
        `[GaslessMint] transferJPYC to=${input.toAddress} amount=${input.amount}`
      );
      try {
        const wallet = getBackendWallet();
        const contract = new ethers.Contract(JPYC_CONTRACT, ERC20_ABI, wallet);

        const decimals = await contract.decimals();
        const amountWei = ethers.parseUnits(input.amount, decimals);

        const tx = await contract.transfer(input.toAddress, amountWei);
        console.log(`[GaslessMint] JPYC tx sent: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`[GaslessMint] JPYC tx confirmed: ${receipt.hash}`);

        return { success: true, txHash: receipt.hash };
      } catch (error: any) {
        console.error("[GaslessMint] transferJPYC error:", error.message);
        throw new Error(`JPYC送金に失敗しました: ${error.message}`);
      }
    }),

  getBackendWalletInfo: publicProcedure.query(async () => {
    try {
      const wallet = getBackendWallet();
      const balance = await wallet.provider!.getBalance(wallet.address);
      const nonce = await wallet.provider!.getTransactionCount(
        wallet.address
      );
      return {
        address: wallet.address,
        maticBalance: ethers.formatEther(balance),
        maticBalanceWei: balance.toString(),
        nonce,
        rpc: POLYGON_RPC,
      };
    } catch (error: any) {
      throw new Error(
        `バックエンドウォレット情報取得に失敗: ${error.message}`
      );
    }
  }),

  diagnose: publicProcedure
    .input(
      z.object({
        toAddress: z.string(),
        tokenId: z.literal(0),
        quantity: z.number().int().positive().default(1),
      })
    )
    .mutation(async ({ input }) => {
      const result: Record<string, any> = {};
      try {
        const wallet = getBackendWallet();
        result.backendAddress = wallet.address;
        const bal = await wallet.provider!.getBalance(wallet.address);
        result.maticBalance = ethers.formatEther(bal);
        result.maticBalanceWei = bal.toString();
        result.nonce = await wallet.provider!.getTransactionCount(
          wallet.address
        );

        const addrOk = ethers.isAddress(input.toAddress);
        result.toAddressValid = addrOk;
        if (!addrOk) {
          result.error = "invalid toAddress";
          return result;
        }

        const contract = new ethers.Contract(
          NFT_COLLECTION_ADDRESS,
          ERC1155_CLAIM_ABI,
          wallet
        );
        try {
          const gas = await contract.claim.estimateGas(
            input.toAddress,
            BigInt(input.tokenId),
            BigInt(input.quantity),
            NATIVE_TOKEN,
            0n,
            {
              proof: [],
              quantityLimitPerWallet: 0n,
              pricePerToken: 0n,
              currency: ethers.ZeroAddress,
            },
            "0x"
          );
          result.gasEstimate = gas.toString();
          const feeData = await wallet.provider!.getFeeData();
          if (feeData.gasPrice) {
            result.estimatedCostMATIC = ethers.formatEther(
              gas * feeData.gasPrice
            );
          }
          result.canMint = true;
        } catch (e: any) {
          result.canMint = false;
          result.estimateError =
            e?.shortMessage || e?.reason || e?.message || String(e);
          result.estimateData = e?.data;
        }
      } catch (e: any) {
        result.fatal = e?.message || String(e);
      }
      return result;
    }),
});
