// QuoteToast.jsx
// ---------------
// A brief popup shown right after a task is marked complete. Quotes are
// written fresh for this app (not pulled from any book/song/person) so
// there's nothing to attribute and nothing to worry about reusing.

import { useEffect } from 'react'
import './QuoteToast.css'

const QUOTES = [
  "Small steps still move you forward.",
  "One done thing is worth more than ten planned ones.",
  "That's one less thing on your mind.",
  "Progress doesn't need to be loud to count.",
  "You showed up for yourself today.",
  "Done is its own kind of momentum.",
  "Future-you just got a little more room to breathe.",
  "Consistency beats intensity -- and that was consistency.",
  "A finished task is a small proof you can trust yourself.",
  "That's the streak talking. Keep it going.",
]

export default function QuoteToast({ visible, onDone }) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onDone, 2400)
    return () => clearTimeout(timer)
  }, [visible, onDone])

  if (!visible) return null

  // Pick once per appearance, not on every re-render.
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]

  return (
    <div className="quote-toast" role="status">
      <span className="quote-mark">✓</span>
      <span>{quote}</span>
    </div>
  )
}
