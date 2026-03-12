interface LabelProps {
  children: React.ReactNode
  className?: string
}

export default function Label({ children, className = '' }: LabelProps) {
  return (
    <span className={`label ${className}`}>
      {children}
    </span>
  )
}
