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

const SUCCESS_EVENTS = ["authorized", "settlementrequestsubmitted", "settled", "sentforsettlement"]
const FAILURE_EVENTS = ["refused", "cancelled", "error", "expired", "settlementfailed", "refundfailed"]

interface HalLink {
  href: string
}
type HalLinks = Record<string, HalLink | undefined>

interface RefundActions {
  refundHref?: string
  partialRefundHref?: string
}

// Worldpay's refund docs say the payments:refund / payments:partialRefund action links come
// from the settle/sale response — this app doesn't store that response, only the status-query
// URL from checkout. Querying that same Payment Queries resource is documented as the
// recommended way to inspect a payment after a refund, so the current actions available on it
// are expected to appear the same way; the exact nesting for THIS resource wasn't shown in the
// docs we had, so both plausible locations (per-payment and top-level) are checked.
function extractRefundActions(raw: { _links?: HalLinks; _embedded?: { payments?: { _links?: HalLinks }[] } }): RefundActions {
  const embeddedLinks = raw._embedded?.payments?.[0]?._links ?? {}
  const topLinks = raw._links ?? {}
  return {
    refundHref: embeddedLinks["payments:refund"]?.href ?? topLinks["payments:refund"]?.href,
    partialRefundHref: embeddedLinks["payments:partialRefund"]?.href ?? topLinks["payments:partialRefund"]?.href,
  }
}

async function fetchPaymentStatus(statusQueryUrl: string): Promise<{ lastEvent: string; raw: unknown; actions: RefundActions }> {
  // The self link returned by POST /payment_pages points at the separate Payment Queries API
  // (/paymentQueries/payments?transactionReference=...), which has its own media type —
  // confirmed against the live sandbox, since Worldpay's docs don't state it plainly.
  const mediaType = "application/vnd.worldpay.payment-queries-v1.hal+json"
  const res = await fetch(statusQueryUrl, { headers: { Authorization: authHeader(), Accept: mediaType } })
  if (!res.ok) throw new Error(`Worldpay status query failed: ${res.status} ${await res.text()}`)
  const raw = (await res.json()) as { _embedded?: { payments?: { lastEvent?: string; _links?: HalLinks }[] }; _links?: HalLinks }
  const lastEvent = (raw._embedded?.payments?.[0]?.lastEvent ?? "").toLowerCase()
  return { lastEvent, raw, actions: extractRefundActions(raw) }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function queryPaymentStatus(statusQueryUrl: string): Promise<{ succeeded: boolean; raw: unknown }> {
  // Right after the HPP redirect, Worldpay's Payment Queries index can briefly lag behind the
  // actual payment outcome — confirmed against a real sandbox payment where the query returned
  // an empty payments list moments before the transaction was indexed. Retry until we see a
  // known terminal event rather than treating "not indexed yet" the same as "declined".
  let result = { lastEvent: "", raw: undefined as unknown, actions: {} as RefundActions }
  for (let attempt = 0; attempt < 5; attempt++) {
    result = await fetchPaymentStatus(statusQueryUrl)
    if (SUCCESS_EVENTS.includes(result.lastEvent) || FAILURE_EVENTS.includes(result.lastEvent)) break
    if (attempt < 4) await sleep(1500)
  }
  return { succeeded: SUCCESS_EVENTS.includes(result.lastEvent), raw: result.raw }
}

// Looks up the refund action links currently available on a settled payment. No retry loop
// here (unlike queryPaymentStatus) — this is only ever called well after settlement, for an
// admin-initiated refund, not right after a checkout redirect.
export async function getRefundActions(statusQueryUrl: string): Promise<RefundActions> {
  const { actions } = await fetchPaymentStatus(statusQueryUrl)
  return actions
}

// https://docs.worldpay.com/access/products/card-payments/v5/refund-a-payment — full refund:
// POST the payments:refund action link with no request body.
export async function refundFull(href: string): Promise<void> {
  const res = await fetch(href, { method: "POST", headers: { Authorization: authHeader() } })
  if (!res.ok) throw new Error(`Worldpay full refund failed: ${res.status} ${await res.text()}`)
}

// Partial refund: POST the payments:partialRefund action link with { value: { amount,
// currency }, reference }. The docs didn't specify a Content-Type/Accept media type for this
// endpoint (unlike payment_pages/payment-queries, which each need their own vendor type) — if
// Worldpay rejects this with 406/415 in sandbox testing, that's the first thing to adjust.
export async function refundPartial(href: string, amountMinorUnits: number, currency: string, reference: string): Promise<void> {
  const res = await fetch(href, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ value: { amount: amountMinorUnits, currency }, reference }),
  })
  if (!res.ok) throw new Error(`Worldpay partial refund failed: ${res.status} ${await res.text()}`)
}
