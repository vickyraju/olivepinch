// Splices a compiled dist/<template>.html into the matching function's `const html = ...`
// literal in ../../email-templates.ts, swapping {{tokens}} for real interpolation.
// Usage: node src/lib/email-templates/mjml/sync.mjs subscription-confirmation
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const templatesFile = join(here, "..", "..", "email-templates.ts")

// User-supplied strings go through escapeHtml; dates/numbers/server-built URLs don't need it.
const TOKENS = {
  name: "${escapeHtml(p.name)}",
  goalLabel: "${escapeHtml(p.goalLabel)}",
  deliveryTimeSlot: "${escapeHtml(p.deliveryTimeSlot)}",
  planDuration: "${p.planDuration}",
  mealsPerDay: "${p.mealsPerDay}",
  startDate: "${formatDate(p.startDate)}",
  endDate: "${formatDate(p.endDate)}",
  effectiveDate: "${formatDate(p.effectiveDate)}",
  total: "${p.total.toFixed(2)}",
  dashboardUrl: "${p.dashboardUrl}",
  privacyUrl: "${p.privacyUrl}",
  link: "${p.link}",
}

const FUNCTIONS = {
  "subscription-confirmation": "subscriptionConfirmationEmail",
  "renewal-confirmation": "renewalConfirmationEmail",
  "renewal-reminder": "renewalReminderEmail",
  cancellation: "cancellationEmail",
  "account-recovery": "accountRecoveryEmail",
  "lapsed-retention": "lapsedRetentionEmail",
}

// Sample values for the browsable previews in ./previews — realistic so spacing and
// wrapping can be judged, never used at runtime.
const SAMPLE = {
  name: "Aisha",
  goalLabel: "Weight Loss",
  deliveryTimeSlot: "6–9pm",
  planDuration: 28,
  mealsPerDay: 2,
  startDate: "Tue 3 Mar 2026",
  endDate: "Sat 14 Mar 2026",
  effectiveDate: "Thu 5 Mar 2026",
  total: "249.00",
  dashboardUrl: "#",
  privacyUrl: "#",
  link: "#",
}

const template = process.argv[2]
const fnName = FUNCTIONS[template]
if (!fnName) throw new Error(`Unknown template "${template}". Expected one of: ${Object.keys(FUNCTIONS).join(", ")}`)

const compiled = readFileSync(join(here, "dist", `${template}.html`), "utf8").trimEnd()
writeFileSync(
  join(here, "previews", `${template}.html`),
  compiled.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in SAMPLE ? SAMPLE[key] : m))
)

let html = compiled
// Backticks and ${ would break out of the template literal we're splicing into.
html = html.replace(/`/g, "\\`").replace(/\$\{/g, "\\${")
html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in TOKENS)) throw new Error(`${template}.html uses {{${key}}}, which has no interpolation mapping`)
  return TOKENS[key]
})

const source = readFileSync(templatesFile, "utf8")
const fnStart = source.indexOf(`export function ${fnName}(`)
if (fnStart === -1) throw new Error(`${fnName} not found in email-templates.ts`)
const htmlStart = source.indexOf("  const html = `", fnStart)
const htmlEnd = source.indexOf("\n  return { subject, text, html }", htmlStart)
if (htmlStart === -1 || htmlEnd === -1) throw new Error(`Could not locate the html literal inside ${fnName}`)

writeFileSync(
  templatesFile,
  source.slice(0, htmlStart) + "  const html = `" + html + "`" + source.slice(htmlEnd)
)
console.log(`synced ${template}.html -> ${fnName} (${html.length} chars)`)
