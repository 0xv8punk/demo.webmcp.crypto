import { AgentInstructions } from './components/AgentInstructions'
import { AgentSnackbar } from './components/AgentSnackbar'
import { ClaimButton } from './components/ClaimButton'
import { ClaimedSnackbar } from './components/ClaimedSnackbar'
import { ClaimMessage } from './components/ClaimMessage'
import { PixelRain } from './components/PixelRain'
import { SunBeams } from './components/SunBeams'
import { useClaimTool } from './hooks/useClaimTool'
import { useConnectAndClaim } from './hooks/useConnectAndClaim'

export function App() {
  const claim = useConnectAndClaim()
  const { snackbar } = useClaimTool(claim.runFromAgent)

  const claimed = claim.status === 'claimed'

  return (
    <>
      <PixelRain stopped={claimed} />
      <SunBeams visible={claimed} />
      <AgentInstructions />
      <main className="stage">
        {!claimed && <ClaimButton status={claim.status} onClick={claim.runFromClick} />}
        <ClaimMessage status={claim.status} error={claim.error} />
      </main>
      <ClaimedSnackbar visible={claimed} viaAgent={claim.viaAgent} />
      <AgentSnackbar message={snackbar.message} visible={snackbar.visible} />
    </>
  )
}
