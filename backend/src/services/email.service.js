const nodemailer = require('nodemailer')

// Email service — thin wrapper around nodemailer.
// Configure via SMTP_* env vars. If SMTP_HOST is not set or the
// connection fails, emails are logged to the console as a fallback.

let transporter = null
let smtpFailed = false

function getTransporter() {
  if (transporter && !smtpFailed) return transporter

  if (process.env.SMTP_HOST && !smtpFailed) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })

    // Verify connection on first use — if it fails, fall back to console
    transporter.verify().catch((err) => {
      console.error('[EMAIL] SMTP connection failed:', err.message)
      console.error('[EMAIL] Falling back to console logging for emails')
      smtpFailed = true
      transporter = null
    })
  }

  if (!transporter) {
    // Fallback: log emails to console
    transporter = {
      sendMail: async (opts) => {
        console.log(`\n===== PASSWORD RESET CODE =====`)
        console.log(`To: ${opts.to}`)
        console.log(`Subject: ${opts.subject}`)
        console.log(`Code: ${opts.text.match(/code is: (\d+)/)?.[1] || '(see below)'}`)
        console.log(`================================\n`)
        return { messageId: `console-${Date.now()}` }
      },
    }
  }

  return transporter
}

const emailService = {
  async sendPasswordResetCode(to, code) {
    const transport = getTransporter()
    const from = process.env.SMTP_FROM || 'noreply@opalline.com'

    await transport.sendMail({
      from,
      to,
      subject: 'Your Password Reset Code — Opal Line',
      text: `Your password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">Opal Line — Password Reset</h2>
          <p>Your password reset code is:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e3a5f; background: #f0f4f8; padding: 16px; text-align: center; border-radius: 8px;">
            ${code}
          </div>
          <p style="color: #666; margin-top: 16px;">This code expires in <strong>15 minutes</strong>.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    })
  },
}

module.exports = emailService
