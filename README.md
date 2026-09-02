# WebMCP Claim Demo

A demo of [WebMCP](https://github.com/webmachinelearning/webmcp): a single pulsing pixel button —
**CONNECT AND CLAIM** — over a field of drifting dots. A human can click it. An AI agent visiting
the same page can do the identical thing by calling a browser-native tool instead of touching the
DOM. On claim, the button fades to half-opacity and reads **CLAIMED**, the dots ease to a stop,
soft sun beams fade in from the top, and a "Congrats! You claimed 42 DEVS." message appears (the
agent path says "Your agent claimed" instead).

**This is a real, on-chain claim — not a simulation.** Clicking (or an agent calling the tool)
connects an external wallet via [Privy](https://privy.io), sends that address to a serverless
backend, and the backend sends a real ERC-20 transfer of 42 DEVS tokens from a treasury wallet on
Robinhood mainnet (chain id 4663), via [Alchemy](https://alchemy.com). See **Security notes**
below before you point real funds at this.

## What is WebMCP?

[Model Context Protocol](https://modelcontextprotocol.io) (MCP) standardized how AI agents call
tools exposed by *servers*. WebMCP does the same thing for *web pages*: a site can register a
tool directly on `document.modelContext`, and any agent operating the browser (an extension, an
embedded assistant, a future browser built-in) can discover and call it — no DOM-scraping,
accessibility-tree parsing, or screenshots needed to figure out what "click" means.

```js
document.modelContext.registerTool(
  {
    name: 'connect_and_claim',
    description: 'Connects an available wallet and claims 42 DEVS tokens.',
    async execute() {
      /* ... */
      return 'Claimed 42 DEVS.'
    },
  },
  { signal: controller.signal },
)
```

The spec is experimental and only implemented behind flags/extensions today. This demo
feature-detects it and degrades gracefully — the button always works by hand regardless.

## How this demo wires it up

This repo uses [`use-webmcp-tool`](https://www.npmjs.com/package/use-webmcp-tool), a React hook
that ties `registerTool`'s lifecycle to a component's mount/unmount, instead of managing the
`AbortController` by hand.

- **[`src/hooks/useConnectAndClaim.ts`](src/hooks/useConnectAndClaim.ts)** — the state machine
  (`idle → connecting → claiming → claimed`/`error`). This is the single source of truth: both the
  button's `onClick` and the WebMCP tool's `execute` call the *same* underlying `run()` function
  (as `runFromClick`/`runFromAgent`), so a human click and an agent tool-call produce identical
  results — the only difference recorded is `viaAgent`, used purely for the congrats copy.
  "Connect an available wallet" means exactly that: it reuses an already-connected wallet
  (`useWallets()`) instead of always prompting a fresh connection, and only opens Privy's connect
  modal (`useConnectWallet()`) if nothing is connected yet.
- **[`api/claim.ts`](api/claim.ts)** — the real backend, a Vercel serverless function. Validates
  the address, enforces one claim per address (see caveat below), then uses `ethers` to send a
  `transfer(address, 42e18)` from the treasury wallet, via the Alchemy RPC URL.
- **[`src/hooks/useClaimTool.ts`](src/hooks/useClaimTool.ts)** — registers `runFromAgent` as a
  WebMCP tool named `connect_and_claim`, via `useWebMCP`. It also wraps `execute` so only an
  actual tool invocation (never a click) triggers the snackbar below.
- **[`src/lib/walletConnectors.ts`](src/lib/walletConnectors.ts)** — the tool takes an optional
  `connector` argument (`"metamask"`, `"coinbase_wallet"`, `"rainbow"`, ... — enumerated in the
  tool's `inputSchema`, mirroring Privy's `WalletListEntry`), so an agent can pick which wallet to
  use instead of leaving that choice to a human. It's passed to Privy as `preSelectedWalletId`,
  which jumps straight to that wallet's own connect flow *when a matching local/injected connector
  is found* (e.g. an installed extension) — but that's the less common case. The picker is never
  artificially narrowed to one option: a `connector` the current browser can't honor locally falls
  back to the full wallet list, same as omitting the argument.
- **[`src/lib/autoSelectWallet.ts`](src/lib/autoSelectWallet.ts)** — what actually makes `connector`
  usable *without* a human in the loop the rest of the time: Privy's wallet list is virtualized
  (most of its 600+ entries don't exist in the DOM until scrolled to), so this types the connector's
  name into Privy's own search box, waits for the (now short) filtered results to render, and
  clicks the match. If Privy's `onSuccess`/`onError` never fires — no search box found, no match,
  timeout — it gives up silently, leaving the modal exactly as a human would see it; never a dead
  end.
- **[`src/hooks/useAgentSnackbar.ts`](src/hooks/useAgentSnackbar.ts)** /
  **[`src/components/AgentSnackbar.tsx`](src/components/AgentSnackbar.tsx)** — a small yellow
  "Agent called connect_and_claim" toast (with a "!" badge) that slides up from the bottom, sits
  above everything else on the page, and auto-hides after a few seconds — purely so a human
  watching the screen can see when an agent (not a click) drove the page.
- **[`src/components/AgentInstructions.tsx`](src/components/AgentInstructions.tsx)** — see
  below.

## Making the tool "obvious" to an agent

Two separate channels, deliberately:

1. **The tool's `description` field** is the spec-correct discovery path. Any agent that lists
   `document.modelContext`'s registered tools sees a self-contained explanation of what the tool
   does — including that it's a real transfer, not a simulation — and that it should be preferred
   over clicking. This is the real mechanism WebMCP is built around.
2. **A visually-hidden instruction in the page**, in `AgentInstructions.tsx`, using the standard
   "hidden from sighted users, present in the DOM/accessibility tree" (`sr-only`) CSS technique.
   This is a fallback bridge: an agent that summarizes page content before it thinks to check for
   registered tools will still land on the same instruction — *use the tool, don't click.*

The hidden text is not a secret; it's documented right here. It's hidden from the **visual**
layout because it's not meant for a human reading the page, the same way alt text or `aria-label`
content isn't meant to clutter a sighted user's screen. There is deliberately no visible label or
badge on the page itself — just the button.

## Security notes

This demo controls a real wallet and pays out a real token. A few things worth knowing before
reusing this pattern:

- **The treasury private key only ever lives in a server-side env var** (`TREASURY_PRIVATE_KEY`),
  read by `api/claim.ts`. It is never sent to the client, never logged, and never committed —
  `.env.local` (used for local testing) is gitignored.
- **Claim de-duplication is in-memory, not durable.** `api/claim.ts` tracks claimed addresses in a
  `Set` that lives only for the lifetime of one serverless instance — it resets on cold start and
  isn't shared across concurrent instances. This is a "good enough for a demo, not a guarantee"
  tradeoff, not a real rate limit. A production version would need a durable store (Postgres,
  Redis/Vercel KV) for real dedup.
- **This is a public faucet with no other limit.** Anyone who finds the page — human or agent —
  can claim from a new address. Fund the treasury wallet lightly and watch it, the same way you'd
  run any public faucet.
- **The connected wallet never signs anything.** The flow only asks Privy to connect a wallet to
  get a *receiving address* — the payout is signed server-side by the treasury key, not by the
  visitor's wallet. There's no approval, no signature request, nothing for the visitor to
  authorize beyond connecting.

## Environment variables

Set in Vercel's project settings, or in a local, gitignored `.env.local` for testing:

| Variable               | Meaning                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `ALCHEMY_RPC_URL`      | Alchemy JSON-RPC endpoint for the target chain (Robinhood mainnet, chain id 4663), used by `api/claim.ts` |
| `TREASURY_PRIVATE_KEY` | Private key of the wallet that pays out claims — **must hold enough DEVS tokens and native gas**, used by `api/claim.ts` |
| `DEVS_TOKEN_ADDRESS`   | ERC-20 contract address of the DEVS token being claimed, used by `api/claim.ts`                    |
| `VITE_PRIVY_APP_ID`    | Privy App ID (public, but still kept out of source), used by `src/lib/privy.ts` — Vite inlines any `VITE_`-prefixed var into the client build |

## Project structure

```
api/
  claim.ts                the real backend: Vercel serverless function, sends the ERC-20 transfer
src/
  lib/
    claim.ts               claim constants (amount, symbol, API path)
    privy.ts                reads the Privy App ID from VITE_PRIVY_APP_ID
    walletConnectors.ts     the enum of wallets the WebMCP tool can be told to prefer
    autoSelectWallet.ts     drives Privy's own search box to pick one without a human
  hooks/
    useConnectAndClaim.ts   the state machine — real Privy connect + real API call
    useClaimTool.ts         registers it as a WebMCP tool
    useAgentSnackbar.ts     generic "show a message, then auto-hide" timer
  components/
    ClaimButton.tsx         the pulsing pixel button — unmounts once claimed
    ClaimMessage.tsx        the error message below the button (nothing shown when idle/claimed)
    ClaimedSnackbar.tsx     replaces the button on claim: centered, gently floating "Congrats! ..."
    PixelRain.tsx           canvas of drifting dots, eases to a stop on claim
    SunBeams.tsx            CSS sun-beam overlay, fades in on claim
    AgentSnackbar.tsx       "an agent just called the tool" toast, bottom of the screen
    AgentInstructions.tsx   the hidden agent instruction, nothing else
  App.tsx           wires the above together
  main.tsx          React entry point, wraps the app in PrivyProvider
  styles/global.css  everything visual — pixel font, pulse animation, layout
```

Each piece does one job and can be read in isolation — logic (`lib`, `hooks`, `api`) is separate
from presentation (`components`), and there is exactly one place (`useConnectAndClaim`) that knows
what "claiming" means.

## Try it as an agent would

With any MCP-aware browser agent, or by hand in a console after stubbing the API:

```js
// Simulates what a WebMCP-capable browser does natively.
document.modelContext = { registerTool(tool, { signal }) { /* store it */ } }
```

then call the registered `connect_and_claim` tool's `execute()` — it drives the exact same
wallet-connect-and-claim flow as clicking the button, including the real on-chain transfer.

## Development

```bash
npm install
npm run dev       # http://localhost:5173 — frontend only, /api routes need Vercel to serve them
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

`api/claim.ts` can be exercised directly with Node (no Vercel dev server needed) once
`.env.local` is populated:

```bash
node --experimental-strip-types --input-type=module -e '
import handler from "./api/claim.ts";
const req = { method: "POST", body: { address: "0x000000000000000000000000000000000000dEaD" } };
const res = { status(c){this._s=c;return this}, json(p){console.log(this._s, p)} };
await handler(req, res);
'
```

## Deploy to Vercel

Vercel's zero-config Vite preset builds the frontend and auto-detects `api/*.ts` as serverless
functions:

```bash
npx vercel        # first deploy, follow the prompts
npx vercel --prod # promote to production
```

Set the three environment variables above in the Vercel project before deploying, or claims will
fail with "Server is not configured for claims".
