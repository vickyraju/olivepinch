// Plain template-literal HTML — email clients strip <style>/CSS custom properties unreliably,
// so brand colors are hardcoded hex here rather than reusing src/index.css's tokens.
const OLIVE = "#646e38"
const CORAL = "#c9502c"
const CREAM = "#f7f4ec"
const INK = "#272c0f"

// p.name comes straight from Customer.fullName (user-supplied at signup, unsanitized) — escape
// before interpolating into HTML so a name like "<img src=x onerror=...>" can't inject markup.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function emailShell(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${CREAM};font-family:Arial,Helvetica,sans-serif;color:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:480px;width:100%;">
            <tr>
              <td style="background:${OLIVE};padding:24px 32px;">
                <span style="font-size:20px;font-weight:bold;color:#ffffff;">OlivePinch</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${CORAL};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px;margin-top:16px;">${label}</a>`
}

export function subscriptionConfirmationEmail(p: {
  name: string
  planDuration: number
  startDate: string
  mealsPerDay: number
  total: number
}): { subject: string; text: string; html: string } {
  const subject = "You're all set — your OlivePinch plan is confirmed"
  const text = `Hi ${p.name},

Your payment went through and your ${p.planDuration}-day OlivePinch plan is confirmed.

Starts: ${p.startDate}
Meals per day: ${p.mealsPerDay}
Total: £${p.total.toFixed(2)}

Fresh meals start arriving on your start date. You can manage your plan any time from your dashboard.

— The OlivePinch team`
  const html = emailShell(`
    <h1 style="font-size:22px;margin:0 0 16px;">You're all set, ${escapeHtml(p.name)}!</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Your payment went through and your <strong>${p.planDuration}-day plan</strong> is confirmed.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};border-radius:12px;padding:16px;margin:0 0 16px;">
      <tr><td style="font-size:13px;color:#6b6b5f;padding:4px 0;">Starts</td><td align="right" style="font-size:13px;font-weight:bold;padding:4px 0;">${p.startDate}</td></tr>
      <tr><td style="font-size:13px;color:#6b6b5f;padding:4px 0;">Meals per day</td><td align="right" style="font-size:13px;font-weight:bold;padding:4px 0;">${p.mealsPerDay}</td></tr>
      <tr><td style="font-size:13px;color:#6b6b5f;padding:4px 0;">Total</td><td align="right" style="font-size:13px;font-weight:bold;padding:4px 0;">£${p.total.toFixed(2)}</td></tr>
    </table>
    <p style="font-size:15px;line-height:1.6;margin:0;">Fresh meals start arriving on your start date. You can manage your plan any time from your dashboard.</p>
  `)
  return { subject, text, html }
}

export function renewalReminderEmail(p: {
  name: string
  endDate: string
  planDuration: number
  dashboardUrl: string
}): { subject: string; text: string; html: string } {
  const subject = `Your OlivePinch plan ends ${p.endDate} — renew to keep your meals coming`
  const text = `Hi ${p.name},

Your ${p.planDuration}-day plan ends on ${p.endDate}. Renew now so there's no gap in your deliveries.

Renew here: ${p.dashboardUrl}

— The OlivePinch team`
  const html = emailShell(`
    <h1 style="font-size:22px;margin:0 0 16px;">Time to renew, ${escapeHtml(p.name)}</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Your ${p.planDuration}-day plan ends on <strong>${p.endDate}</strong>. Renew now so there's no gap in your deliveries.</p>
    ${button("Renew my plan", p.dashboardUrl)}
  `)
  return { subject, text, html }
}
