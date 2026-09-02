// Mirrors WalletListEntry from @privy-io/react-auth.
export const WALLET_CONNECTORS = [
  'metamask',
  'coinbase_wallet',
  'base_account',
  'rainbow',
  'phantom',
  'zerion',
  'cryptocom',
  'uniswap',
  'okx_wallet',
  'universal_profile',
] as const

export type WalletConnector = (typeof WALLET_CONNECTORS)[number]

export const WALLET_CONNECTOR_LABELS: Record<WalletConnector, string> = {
  metamask: 'MetaMask',
  coinbase_wallet: 'Coinbase Wallet',
  base_account: 'Base',
  rainbow: 'Rainbow',
  phantom: 'Phantom',
  zerion: 'Zerion',
  cryptocom: 'Crypto.com',
  uniswap: 'Uniswap',
  okx_wallet: 'OKX',
  universal_profile: 'Universal Profile',
}

export function isWalletConnector(value: unknown): value is WalletConnector {
  return typeof value === 'string' && (WALLET_CONNECTORS as readonly string[]).includes(value)
}
