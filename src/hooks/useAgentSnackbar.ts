import { useCallback, useRef, useState } from 'react'

const VISIBLE_MS = 3000

export function useAgentSnackbar() {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = useCallback((text: string) => {
    setMessage(text)
    setVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setVisible(false), VISIBLE_MS)
  }, [])

  return { message, visible, notify }
}
