import type { ClaimStatus } from '../types'

interface Props {
  status: ClaimStatus
  onClick: () => void
}

const LABEL: Record<ClaimStatus, string> = {
  idle: 'Connect and Claim',
  connecting: 'Connecting…',
  claiming: 'Claiming…',
  claimed: 'Claimed',
  error: 'Try Again',
}

export function ClaimButton({ status, onClick }: Props) {
  const busy = status === 'connecting' || status === 'claiming'

  return (
    <button type="button" className="claim-button" onClick={onClick} disabled={busy}>
      {LABEL[status]}
    </button>
  )
}
