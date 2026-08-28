// Upserts the seven transactional emails into Resend as published templates, so they're
// visible and previewable in the Resend dashboard.
//
// The templates are *generated* by calling the same functions the app sends with, passing
// {{{TOKEN}}} strings where the real data goes — so the copy in Resend can't drift from the
// copy customers actually receive. Re-run it after any change to email-templates.ts.
//
// Usage: npx tsx scripts/resend-templates.mts   (from server/)
//
// Note: the send path in lib/email.ts still posts inline html and does NOT reference these
// templates. Switching it over would break the no-API-key dev path, which renders locally.
import {
  subscriptionConfirmationEmail,
  renewalConfirmationEmail,
  renewalReminderEmail,
  cancellationEmail,
  accountRecoveryEmail,
  lapsedRetentionEmail,
  weeklyMenuSelectionEmail,
} from "../src/lib/email-templates.js"
import { fileURLToPath } from "node:url"

process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)))
const API_KEY = process.env.RESEND_API_KEY
if (!API_KEY) throw new Error("RESEND_API_KEY is not set (expected in server/.env)")
const FROM = process.env.EMAIL_FROM ?? "OlivePinch <hello@olivepinch.co.uk>"

const TYPES: Record<string, "string" | "number"> = {
  NAME: "string",
  GOAL_LABEL: "string",
  PLAN_DURATION: "number",
  MEALS_PER_DAY: "number",
  DELIVERY_TIME_SLOT: "string",
  TOTAL: "string", // rendered via total.toFixed(2), so it reaches the template already formatted
  START_DATE: "string",
  END_DATE: "string",
  EFFECTIVE_DATE: "string",
  WEEK_START: "string",
  CUTOFF_DATE: "string",
  DASHBOARD_URL: "string",
  PRIVACY_URL: "string",
  LINK: "string",
}

// escapeHtml leaves braces alone and formatDate returns anything unparseable unchanged, so a
// {{{TOKEN}}} survives both. total is the exception — it's a number the templates call
// .toFixed(2) on, so hand it something that answers that call.
const ARGS = {
  name: "{{{NAME}}}",
  goalLabel: "{{{GOAL_LABEL}}}",
  planDuration: "{{{PLAN_DURATION}}}",
  mealsPerDay: "{{{MEALS_PER_DAY}}}",
  deliveryTimeSlot: "{{{DELIVERY_TIME_SLOT}}}",
  total: { toFixed: () => "{{{TOTAL}}}" },
  startDate: "{{{START_DATE}}}",
  endDate: "{{{END_DATE}}}",
  effectiveDate: "{{{EFFECTIVE_DATE}}}",
  weekStart: "{{{WEEK_START}}}",
  cutoffDate: "{{{CUTOFF_DATE}}}",
  dashboardUrl: "{{{DASHBOARD_URL}}}",
  privacyUrl: "{{{PRIVACY_URL}}}",
  link: "{{{LINK}}}",
} as never

const TEMPLATES = {
  "subscription-confirmation": subscriptionConfirmationEmail,
  "renewal-confirmation": renewalConfirmationEmail,
  "renewal-reminder": renewalReminderEmail,
  cancellation: cancellationEmail,
  "account-recovery": accountRecoveryEmail,
  "lapsed-retention": lapsedRetentionEmail,
  "weekly-menu-selection": weeklyMenuSelectionEmail,
}

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok && res.status !== 404) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`)
  return res
}

for (const [alias, render] of Object.entries(TEMPLATES)) {
  const { subject, text, html } = render(ARGS)

  // Whichever tokens actually survived into this template are its variables — no per-template
  // field list to keep in step with the function signatures.
  const used = [...new Set([...`${subject}${text}${html}`.matchAll(/\{\{\{(\w+)\}\}\}/g)].map((m) => m[1]!))]
  const unknown = used.filter((key) => !(key in TYPES))
  if (unknown.length) throw new Error(`${alias} uses unmapped token(s): ${unknown.join(", ")}`)

  const body = {
    name: alias,
    from: FROM,
    subject,
    html,
    text,
    variables: used.map((key) => ({ key, type: TYPES[key] })),
  }

  if (process.env.DRY) {
    console.log(`${alias}: subject="${subject}" html=${html.length} chars, variables=${used.join(", ")}`)
    continue
  }

  const updated = await api("PATCH", `/templates/${alias}`, body)
  if (updated.status === 404) await api("POST", "/templates", { ...body, alias })
  await api("POST", `/templates/${alias}/publish`)
  console.log(`${updated.status === 404 ? "created" : "updated"} + published ${alias} (${used.length} variables)`)
}
