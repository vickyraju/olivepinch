import nodemailer from "nodemailer"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM ?? "OlivePinch <hello@olivepinch.co.uk>"

// ponytail: no real provider configured in dev -> log to console instead of failing signup/checkout
const devTransport = nodemailer.createTransport({ jsonTransport: true })

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!RESEND_API_KEY) {
    const info = await devTransport.sendMail({ from: EMAIL_FROM, to, subject, text, html })
    console.log(`[dev email] to=${to} subject="${subject}"\n${text}\n`, info.messageId)
    return
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text, ...(html ? { html } : {}) }),
  })
  if (!res.ok) {
    throw new Error(`Failed to send email: ${res.status} ${await res.text()}`)
  }
}
