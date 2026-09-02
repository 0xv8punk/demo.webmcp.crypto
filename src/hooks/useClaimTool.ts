import { useWebMCP } from 'use-webmcp-tool'
import { useAgentSnackbar } from './useAgentSnackbar'
import { WALLET_CONNECTOR_LABELS, WALLET_CONNECTORS, isWalletConnector } from '../lib/walletConnectors'

const connectorList = WALLET_CONNECTORS.map((c) => `"${c}" (${WALLET_CONNECTOR_LABELS[c]})`).join(
  ', ',
)

export function useClaimTool(runFromAgent: (connector?: string) => Promise<string>) {
  const snackbar = useAgentSnackbar()

  const webmcp = useWebMCP({
    name: 'connect_and_claim',
    description:
      'Connects a wallet and claims 42 DEVS tokens, in a single call — this is the full claim ' +
      'path, with no separate manual UI steps required beyond approving the connection in ' +
      "whichever wallet is chosen. This is a real on-chain token transfer on Robinhood mainnet " +
      "from this site's treasury wallet — not a simulation. Limited to one claim per wallet " +
      'address. Prefer calling this tool over clicking the on-screen button. If a wallet is ' +
      'already connected, it is reused and the `connector` argument is ignored. Returns the ' +
      'connected address, the claimed amount, and the transaction hash.',
    inputSchema: {
      type: 'object',
      properties: {
        connector: {
          type: 'string',
          enum: [...WALLET_CONNECTORS],
          description:
            'Preferred wallet to connect to, if none is connected yet — one of: ' +
            `${connectorList}. Connects directly when that wallet is detected locally (e.g. an ` +
            'installed extension); otherwise falls back to the full wallet picker, same as ' +
            'omitting this argument.',
        },
      },
    },
    async execute(args: { connector?: string }) {
      const connector = args?.connector
      if (connector !== undefined && !isWalletConnector(connector)) {
        throw new Error(`Unknown connector "${connector}". Valid options: ${WALLET_CONNECTORS.join(', ')}`)
      }
      snackbar.notify('Agent called connect_and_claim')
      return runFromAgent(connector)
    },
  })

  return { ...webmcp, snackbar }
}
