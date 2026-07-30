// PriorityDots.jsx
// -----------------
// Instead of a generic colored "HIGH / MEDIUM / LOW" pill (the default
// almost every to-do app uses), priority is shown as three small dots,
// like stars -- filled in proportion to urgency. It's a quiet nod to
// the "Celeste" (sky/heavens) name and reads at a glance without
// needing color-coded literacy.

const LEVELS = { high: 3, medium: 2, low: 1 }
const LABELS = { high: 'High priority', medium: 'Medium priority', low: 'Low priority' }

export default function PriorityDots({ priority }) {
  const filled = LEVELS[priority] || 1
  return (
    <span className="priority-dots" title={LABELS[priority]} aria-label={LABELS[priority]}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`dot ${i <= filled ? `dot-filled dot-${priority}` : 'dot-empty'}`}
        />
      ))}
    </span>
  )
}
