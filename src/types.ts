export type ClaimStatus = 'idle' | 'connecting' | 'claiming' | 'claimed' | 'error'

export interface ClaimState {
  status: ClaimStatus
  address: string | null
  txHash: string | null
  amount: number | null
  error: string | null
  /** Whether the in-progress/completed claim was triggered by the WebMCP tool rather than a click. */
  viaAgent: boolean
}
