function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  // bypasses React's overridden setter, which silently swallows plain assignment
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function findSearchInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('input[placeholder*="Search" i]')
}

function isVisible(el: HTMLElement): boolean {
  return el.offsetParent !== null
}

function findClickableWalletRow(searchTerm: string): HTMLElement | null {
  const target = normalize(searchTerm)
  if (!target) return null

  const all = document.querySelectorAll<HTMLElement>('body *')
  for (const el of all) {
    if (el.children.length > 0) continue // only leaf-ish text nodes
    if (!isVisible(el)) continue
    const text = el.textContent?.trim()
    if (!text) continue
    const norm = normalize(text)
    if (!norm) continue
    if (!norm.includes(target) && !target.includes(norm)) continue

    const clickable = el.closest('button, [role="button"], a')
    if (clickable instanceof HTMLElement) return clickable

    let node: HTMLElement | null = el
    for (let i = 0; i < 6 && node; i++) {
      if (getComputedStyle(node).cursor === 'pointer') return node
      node = node.parentElement
    }
    return el
  }
  return null
}

export async function autoSelectWalletInModal(searchTerm: string, timeoutMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs

  let input: HTMLInputElement | null = null
  while (!input && Date.now() < deadline) {
    input = findSearchInput()
    if (!input) await wait(100)
  }
  if (!input) return false

  setNativeInputValue(input, searchTerm)

  while (Date.now() < deadline) {
    await wait(150)
    const row = findClickableWalletRow(searchTerm)
    if (row) {
      row.click()
      return true
    }
  }
  return false
}
