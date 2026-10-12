// Intrinsic 512x112 (2x+ of the largest rendered size); size it with a height class.
export function Logo({ className = "h-9" }: { className?: string }) {
  return <img src="/logo.webp" alt="OlivePinch" width={512} height={112} className={`w-auto ${className}`} />
}
