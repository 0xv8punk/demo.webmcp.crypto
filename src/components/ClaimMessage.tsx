import type { ClaimState } from '../types'

type Props = Pick<ClaimState, 'status' | 'error'>

export function ClaimMessage({ status, error }: Props) {
  const isError = status === 'error'

  return (
    <p className={`claim-message${isError ? ' is-visible is-error' : ''}`}>
      {isError ? (error ?? 'Claim failed.') : ''}
    </p>
  )
}
