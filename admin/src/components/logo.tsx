export function Logo({ className = "text-xl" }: { className?: string }) {
  return (
    <span
      className={`italic font-bold ${className}`}
      style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#1b2a0c" }}
    >
      OlivePinch
    </span>
  )
}
