export const NFT_COLLECTION_ADDRESS = '0x64AFfd7313032550bcD7d064aaF3276d542175d7';

export const BP_TOKEN_ID = 0n;

export const BP_SBT_CONTRACT_ADDRESS = NFT_COLLECTION_ADDRESS;

export const BP_SBT_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'bpAmount', type: 'uint256' },
      { name: 'category', type: 'string' }
    ],
    name: 'mintBP',
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getBPData',
    outputs: [
      { name: 'bpAmount', type: 'uint256' },
      { name: 'category', type: 'string' },
      { name: 'timestamp', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'getTotalBP',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'category', type: 'string' }
    ],
    name: 'getBPByCategory',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export type SBTType = 'BP';

export function getTokenIdForType(_type: SBTType): bigint {
  return BP_TOKEN_ID;
}
