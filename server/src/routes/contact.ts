import { Router } from "express"
import { z } from "zod"
import { validateBody } from "../middleware/validate.js"
import { contactLimiter } from "../middleware/rate-limit.js"
import { sendEmail } from "../lib/email.js"

export const contactRouter = Router()

const CONTACT_TO = process.env.CONTACT_TO ?? "hello@olivepinch.com"

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(3000),
  // Honeypot: hidden from people, so only bots fill it in.
  website: z.string().optional(),
})

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
// Header values (subject) must not carry line breaks.
const oneLine = (v: string) => v.replace(/[\r\n]+/g, " ")

// Public. Emails the message to the team with Reply-To set to the sender, so replying answers them.
// ponytail: email only, nothing stored; if the send fails the customer is told to email us directly.
// Add a ContactMessage table if messages must survive an email outage.
contactRouter.post("/", contactLimiter, validateBody(contactSchema), async (req, res) => {
  const { name, email, message, website } = req.body as z.infer<typeof contactSchema>
  if (website) return res.status(204).send() // looks like a bot: pretend it worked, send nothing

  const subject = `Website enquiry from ${oneLine(name)}`
  const text = `New message from the OlivePinch contact form.\n\nName: ${name}\nEmail: ${email}\n\n${message}\n\nReply to this email to answer ${name}.`
  const html = `<p>New message from the OlivePinch contact form.</p>
<p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
<p style="white-space:pre-wrap">${escapeHtml(message)}</p>
<p style="color:#666">Reply to this email to answer ${escapeHtml(name)}.</p>`

  try {
    await sendEmail(CONTACT_TO, subject, text, html, email)
  } catch (err) {
    console.error("contact form email failed", err)
    return res.status(502).json({ error: "We couldn't send your message just now. Please email hello@olivepinch.com instead." })
  }
  res.status(204).send()
})
