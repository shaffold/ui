"use client"

import * as React from "react"

function legacyCopy(value: string) {
  const textArea = document.createElement("textarea")
  textArea.value = value
  textArea.setAttribute("readonly", "")
  textArea.style.position = "fixed"
  textArea.style.opacity = "0"
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  let ok = false
  try {
    ok = document.execCommand("copy")
  } catch {
    ok = false
  }
  document.body.removeChild(textArea)
  return ok
}

export function useCopyToClipboard({ timeout = 2000 }: { timeout?: number } = {}) {
  const [isCopied, setIsCopied] = React.useState(false)

  const copyToClipboard = async (value: string) => {
    if (typeof window === "undefined" || !value) return false
    let ok = false
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value)
        ok = true
      } catch {
        ok = legacyCopy(value)
      }
    } else {
      ok = legacyCopy(value)
    }
    if (!ok) return false
    setIsCopied(true)
    if (timeout !== 0) setTimeout(() => setIsCopied(false), timeout)
    return true
  }

  return { isCopied, copyToClipboard }
}
