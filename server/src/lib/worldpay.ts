const username = process.env.WORLDPAY_USERNAME
const password = process.env.WORLDPAY_PASSWORD
const entity = process.env.WORLDPAY_ENTITY
const apiUrl = process.env.WORLDPAY_API_URL ?? "https://try.access.worldpay.com"

// ponytail: any of the three unset -> worldpayConfig is null and payment routes fall
// back to a dev-mode auto-succeed path, so checkout is testable without real Worldpay
// credentials (issued by a Worldpay Implementation Manager, not self-serve)
export const worldpayConfig = username && password && entity ? { username, password, entity, apiUrl } : null

function authHeader(): string {
  return `Basic ${Buffer.from(`${worldpayConfig!.username}:${worldpayConfig!.password}`).toString("base64")}`
}

interface CreateHostedPaymentArgs {
  transactionReference: string
  amountMinorUnits: number
  currency: string
  narrativeLine1: string
  resultUrl: string
}

export async function createHostedPayment(args: CreateHostedPaymentArgs): Promise<{ redirectUrl: string; statusQueryUrl: string }> {
  const mediaType = "application/vnd.worldpay.payment_pages-v1.hal+json"
  const res = await fetch(`${worldpayConfig!.apiUrl}/payment_pages`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": mediaType, Accept: mediaType },
    body: JSON.stringify({
      transactionReference: args.transactionReference,
      merchant: { entity: worldpayConfig!.entity },
      narrative: { line1: args.narrativeLine1 },
      value: { currency: args.currency, amount: args.amountMinorUnits },
      resultURLs: {
        successURL: args.resultUrl,
        failureURL: args.resultUrl,
        cancelURL: args.resultUrl,
        errorURL: args.resultUrl,
        pendingURL: args.resultUrl,
        expiryURL: args.resultUrl,
      },
    }),
  })
  if (!res.ok) throw new Error(`Worldpay HPP setup failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { url: string; _links: { self: { href: string } } }
  return { redirectUrl: json.url, statusQueryUrl: json._links.self.href }
}

export async function queryPaymentStatus(statusQueryUrl: string): Promise<{ succeeded: boolean; raw: unknown }> {
  // The self link returned by POST /payment_pages is a payment_pages resource — Worldpay
  // 406s a generic application/hal+json Accept header on it, same as the create call needs
  // its vendor-specific media type.
  const mediaType = "application/vnd.worldpay.payment_pages-v1.hal+json"
  const res = await fetch(statusQueryUrl, { headers: { Authorization: authHeader(), Accept: mediaType } })
  if (!res.ok) throw new Error(`Worldpay status query failed: ${res.status} ${await res.text()}`)
  const raw = (await res.json()) as unknown
  // ponytail: temporary — log the real shape so we can fix the guessed outcome
  // parsing below against an actual sandbox response. Remove once confirmed.
  console.log("[worldpay] status query raw response:", JSON.stringify(raw))
  // TODO: confirm exact field/value against live Worldpay docs before enabling real
  // credentials — this can't be verified without a real sandbox payment to inspect.
  const outcome = (raw as { outcome?: string; lastEvent?: string; status?: string })
  const succeeded = ["authorized", "captured", "settled", "sentForSettlement"].includes(
    outcome.outcome ?? outcome.lastEvent ?? outcome.status ?? ""
  )
  return { succeeded, raw }
}
