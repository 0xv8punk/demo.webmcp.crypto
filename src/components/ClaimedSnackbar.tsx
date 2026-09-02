import { CLAIM_AMOUNT, CLAIM_TOKEN_SYMBOL } from '../lib/claim'

interface Props {
  visible: boolean
  viaAgent: boolean
}

export function ClaimedSnackbar({ visible, viaAgent }: Props) {
  const text = viaAgent
    ? `Congrats! Your agent claimed ${CLAIM_AMOUNT} ${CLAIM_TOKEN_SYMBOL}.`
    : `Congrats! You claimed ${CLAIM_AMOUNT} ${CLAIM_TOKEN_SYMBOL}.`

  return (
    <div
      className={`snackbar snackbar--center${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="snackbar-icon" aria-hidden="true">
        !
      </span>
      {text}
    </div>
  )
}
