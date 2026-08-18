export const ORDER_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "Scheduled", className: "bg-canvas text-ink-muted border-border" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", className: "bg-coral-50 text-coral-600 border-coral-100" },
  DELIVERED: { label: "Delivered", className: "bg-olive-50 text-olive-700 border-olive-100" },
  ATTEMPTED: { label: "Attempted", className: "bg-warning/10 text-warning border-warning/20" },
  PAUSED: { label: "Paused", className: "bg-canvas text-ink-muted border-border" },
}

export const ACCOUNT_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  PROVISIONAL: { label: "Provisional", className: "bg-canvas text-ink-muted border-border" },
  ACTIVE: { label: "Active", className: "bg-olive-50 text-olive-700 border-olive-100" },
  READ_ONLY: { label: "Read-only", className: "bg-warning/10 text-warning border-warning/20" },
  DELETED: { label: "Deleted", className: "bg-destructive/10 text-destructive border-destructive/20" },
}
