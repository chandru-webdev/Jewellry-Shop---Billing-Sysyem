const nodemailer = require('nodemailer')

// Email service — thin wrapper around nodemailer.
// Configure via SMTP_* env vars. If SMTP_HOST is not set, or the SMTP
// connection/verification fails, emails are logged to the console as a
// fallback so reset codes are never lost during development.

let transporter = null
let smtpFailed = false

function getTransporter() {
  if (transporter && !smtpFailed) return transporter

  // Only attempt real SMTP once; after a failure we short-circuit to console
  // so later sends don't pay the connection-timeout cost again.
  if (!smtpFailed && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  }

  return transporter || null
}

function logToConsole(opts, code) {
  console.log('\n===== EMAIL DELIVERY (console fallback — configure SMTP_* for real delivery) =====')
  console.log(`To:      ${opts.to}`)
  console.log(`Subject: ${opts.subject}`)
  console.log(`Code:    ${code}`)
  console.log('===================================================================================\n')
}

const emailService = {
  // Returns { delivered: 'smtp' } when the email actually went out, or
  // { delivered: 'console' } when it was logged instead.
  async sendPasswordResetCode(to, code) {
    const from = process.env.SMTP_FROM || 'noreply@opalline.com'
    const mail = {
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
    }

    const transport = getTransporter()
    if (transport) {
      try {
        await transport.sendMail(mail)
        return { delivered: 'smtp' }
      } catch (err) {
        console.error('[EMAIL] SMTP send failed:', err.message)
        console.error('[EMAIL] Falling back to console logging for this email')
        transporter = null
        smtpFailed = true
      }
    }

    logToConsole(mail, code)
    return { delivered: 'console' }
  },
}

module.exports = emailService