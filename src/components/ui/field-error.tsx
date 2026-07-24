function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="mt-1.5 text-sm text-destructive">
      {children}
    </p>
  )
}

export { FieldError }
