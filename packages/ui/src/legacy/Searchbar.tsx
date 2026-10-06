import type { ChangeEvent } from "react"

interface SearchbarProps {
  value: string
  onChange: (value: string) => void
}

export default function Searchbar({ value, onChange }: SearchbarProps) {
  return (
    <div className="searchbar">
      <input
        type="text"
        placeholder="Search versions..."
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    </div>
  )
}
