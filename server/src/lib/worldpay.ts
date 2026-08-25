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
  // The self link returned by POST /payment_pages points at the separate Payment Queries API
  // (/paymentQueries/payments?transactionReference=...), which has its own media type —
  // confirmed against the live sandbox, since Worldpay's docs don't state it plainly.
  const mediaType = "application/vnd.worldpay.payment-queries-v1.hal+json"
  const res = await fetch(statusQueryUrl, { headers: { Authorization: authHeader(), Accept: mediaType } })
  if (!res.ok) throw new Error(`Worldpay status query failed: ${res.status} ${await res.text()}`)
  const raw = (await res.json()) as { _embedded?: { payments?: { lastEvent?: string }[] } }
  const lastEvent = raw._embedded?.payments?.[0]?.lastEvent ?? ""
  const succeeded = ["authorized", "captured", "settled", "sentForSettlement"].includes(lastEvent)
  return { succeeded, raw }
}
