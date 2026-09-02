import { useCallback, useRef, useState } from 'react'
import { useConnectWallet, useWallets } from '@privy-io/react-auth'
import { autoSelectWalletInModal } from '../lib/autoSelectWallet'
import { CLAIM_AMOUNT, CLAIM_API_PATH, CLAIM_TOKEN_SYMBOL } from '../lib/claim'
import { WALLET_CONNECTOR_LABELS, isWalletConnector } from '../lib/walletConnectors'
import type { ClaimState } from '../types'

const INITIAL_STATE: ClaimState = {
  status: 'idle',
  address: null,
  txHash: null,
  amount: null,
  error: null,
  viaAgent: false,
}

interface PendingConnect {
  resolve: (address: string) => void
  reject: (error: unknown) => void
}

export function useConnectAndClaim() {
  const [state, setState] = useState<ClaimState>(INITIAL_STATE)
  const statusRef = useRef<ClaimState['status']>('idle')
  const stateRef = useRef(state)
  stateRef.current = state

  const { wallets } = useWallets()
  const pendingConnect = useRef<PendingConnect | null>(null)

  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => {
      pendingConnect.current?.resolve(wallet.address)
      pendingConnect.current = null
    },
    onError: (error) => {
      pendingConnect.current?.reject(new Error(String(error)))
      pendingConnect.current = null
    },
  })

  const requestWallet = useCallback(
    (connector?: string): Promise<string> => {
      const already = wallets[0]?.address
      if (already) return Promise.resolve(already)
      return new Promise((resolve, reject) => {
        pendingConnect.current = { resolve, reject }
        connectWallet(connector ? { preSelectedWalletId: connector } : undefined)
        if (connector && isWalletConnector(connector)) {
          void autoSelectWalletInModal(WALLET_CONNECTOR_LABELS[connector])
        }
      })
    },
    [wallets, connectWallet],
  )

  const run = useCallback(
    async (viaAgent: boolean, connector?: string): Promise<string> => {
      if (statusRef.current === 'connecting' || statusRef.current === 'claiming') {
        return `Already in progress (${statusRef.current}). Please wait.`
      }
      if (statusRef.current === 'claimed') {
        const s = stateRef.current
        return `Already claimed. Wallet ${s.address} holds ${s.amount} ${CLAIM_TOKEN_SYMBOL} (tx ${s.txHash}).`
      }

      statusRef.current = 'connecting'
      setState({ ...INITIAL_STATE, status: 'connecting', viaAgent })

      let address: string
      try {
        address = await requestWallet(connector)
      } catch (err) {
        statusRef.current = 'error'
        const message = err instanceof Error ? err.message : 'Wallet connection failed'
        setState((s) => ({ ...s, status: 'error', error: message }))
        return `Wallet connection failed: ${message}`
      }

      statusRef.current = 'claiming'
      setState((s) => ({ ...s, status: 'claiming', address }))

      try {
        const res = await fetch(CLAIM_API_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Claim failed (${res.status})`)

        statusRef.current = 'claimed'
        setState((s) => ({ ...s, status: 'claimed', txHash: data.txHash, amount: CLAIM_AMOUNT }))
        return `Connected wallet ${address} and claimed ${CLAIM_AMOUNT} ${CLAIM_TOKEN_SYMBOL}. Transaction: ${data.txHash}`
      } catch (err) {
        statusRef.current = 'error'
        const message = err instanceof Error ? err.message : 'Claim failed'
        setState((s) => ({ ...s, status: 'error', error: message }))
        return `Claim failed: ${message}`
      }
    },
    [requestWallet],
  )

  const reset = useCallback(() => {
    statusRef.current = 'idle'
    setState(INITIAL_STATE)
  }, [])

  return {
    ...state,
    runFromClick: useCallback(() => run(false), [run]),
    runFromAgent: useCallback((connector?: string) => run(true, connector), [run]),
    reset,
  }
}
