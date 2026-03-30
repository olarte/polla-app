import { http, createConfig } from 'wagmi'
import { celo } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Celo Sepolia testnet (MiniPay testnet) — chain ID 11142220
export const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://celo-sepolia.blockscout.com' },
  },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [celoSepolia, celo],
  connectors: [
    injected(), // MiniPay injects window.ethereum automatically
  ],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
  },
})
