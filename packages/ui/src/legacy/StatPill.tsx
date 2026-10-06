/**
 * StatPill — compact stat chip for the hero section.
 * Props: { label: string, value: string }
 */
interface StatPillProps {
  value: string
  label: string
}

export default function StatPill({ value, label }: StatPillProps) {
  return (
    <div className="stat-pill">
      <span className="stat-pill-value">{value}</span>
      <span className="stat-pill-label">{label}</span>
    </div>
  )
}
