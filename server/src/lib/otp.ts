import { prisma } from "./prisma.js"
import { generateOtpCode, hashOtp } from "./auth.js"
import { sendEmail } from "./email.js"

export async function issueOtp(customerId: string, purpose: string, email: string) {
  const code = generateOtpCode()
  const codeHash = await hashOtp(code)
  await prisma.otp.create({
    data: { customerId, purpose, codeHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  })
  await sendEmail(email, "Your OlivePinch verification code", `Your code is ${code}. It expires in 10 minutes.`)
}
