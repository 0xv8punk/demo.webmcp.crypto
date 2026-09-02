import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ethers } from 'ethers'

const CLAIM_AMOUNT = '42'

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

// In-memory, per-instance only — not durable across cold starts.
const claimedAddresses = new Set<string>()

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { shortMessage?: string; reason?: string; message?: string }
    if (e.shortMessage) return e.shortMessage
    if (e.reason) return e.reason
    if (e.message) return e.message
  }
  return 'Claim failed'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const address = typeof req.body?.address === 'string' ? req.body.address : null
  if (!address || !ethers.isAddress(address)) {
    res.status(400).json({ error: 'Invalid wallet address' })
    return
  }
  const normalized = ethers.getAddress(address)

  if (claimedAddresses.has(normalized)) {
    res.status(409).json({ error: 'This address has already claimed' })
    return
  }
  claimedAddresses.add(normalized) // reserve immediately, before awaiting, to close the race

  try {
    const rpcUrl = process.env.ALCHEMY_RPC_URL
    const privateKey = process.env.TREASURY_PRIVATE_KEY
    const tokenAddress = process.env.DEVS_TOKEN_ADDRESS
    if (!rpcUrl || !privateKey || !tokenAddress) {
      throw new Error('Server is not configured for claims')
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const treasury = new ethers.Wallet(privateKey, provider)
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, treasury)

    const decimals: number = await token.decimals()
    const amount = ethers.parseUnits(CLAIM_AMOUNT, decimals)

    const treasuryBalance: bigint = await token.balanceOf(treasury.address)
    if (treasuryBalance < amount) {
      throw new Error(
        'The treasury wallet is out of DEVS tokens right now — claims are paused until it is topped up.',
      )
    }

    const tx = await token.transfer(normalized, amount)
    await tx.wait()

    res.status(200).json({ txHash: tx.hash, amount: CLAIM_AMOUNT })
  } catch (err) {
    claimedAddresses.delete(normalized) // free the slot so they can retry
    res.status(500).json({ error: errorMessage(err) })
  }
}
