import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { App } from './App'
import { PRIVY_APP_ID } from './lib/privy'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider appId={PRIVY_APP_ID}>
      <App />
    </PrivyProvider>
  </StrictMode>,
)
