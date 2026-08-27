const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { signToken } = require('../utils/jwt')
const emailService = require('./email.service')

// All authentication business logic lives here.
const authService = {
  // Verify credentials and return { token, user }.
  // Throws ApiError(401) if the email or password is wrong.
  async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    })

    // Same error message for "no user" and "wrong password"
    // so attackers can't tell which emails exist.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, 'Invalid email or password')
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account is disabled. Contact an administrator.')
    }

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const [permRow] = await prisma.$queryRawUnsafe(
      'SELECT "customPermissions" FROM "User" WHERE "id" = $1',
      user.id
    )
    const customPermissions = permRow?.customPermissions || null

    const token = signToken({ id: user.id, role: user.role.name })
    return { token, user: this.safeUser({ ...user, customPermissions }) }
  },

  // Fetch fresh user data for the /me endpoint.
  async me(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    })
    if (!user) throw new ApiError(404, 'User not found')
    const [permRow] = await prisma.$queryRawUnsafe(
      'SELECT "customPermissions" FROM "User" WHERE "id" = $1',
      userId
    )
    const customPermissions = permRow?.customPermissions || null
    return this.safeUser({ ...user, customPermissions })
  },

  // Change password (for logged-in user)
  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'User not found')

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) throw new ApiError(400, 'Current password is incorrect')

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false },
    })

    return { message: 'Password changed successfully' }
  },

  // Strip sensitive fields (like the password hash) before sending to the frontend.
  safeUser(user) {
    const { password, resetToken, resetTokenExpiry, ...safe } = user
    return safe
  },

  // Forgot password: generate a 6-digit code, store hashed with 15 min expiry.
  async forgotPassword(email) {
    const normalisedEmail = email.toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email: normalisedEmail } })
    if (!user) {
      // Don't reveal whether the email exists — return success either way.
      return { message: 'If an account with that email exists, a reset code has been sent.' }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const hashedCode = await bcrypt.hash(code, 10)
    const expiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedCode, resetTokenExpiry: expiry },
    })

    // TODO: send code via email service. For now log it so admins can see it.
    console.log(`[PASSWORD RESET] ${email} -> code: ${code}`)
    await emailService.sendPasswordResetCode(email, code).catch((err) => {
      console.error('[PASSWORD RESET] Failed to send email:', err.message)
    })

    return { message: 'If an account with that email exists, a reset code has been sent.' }
  },

  // Verify reset code (called from step 2 before allowing password change).
  async verifyResetCode(email, code) {
    const normalisedEmail = email.toLowerCase().trim()
    const normalisedCode = String(code).trim()

    const user = await prisma.user.findUnique({ where: { email: normalisedEmail } })
    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      throw new ApiError(400, 'No reset code was requested. Please request a new code first.')
    }

    if (new Date() > new Date(user.resetTokenExpiry)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: null, resetTokenExpiry: null },
      })
      throw new ApiError(400, 'Reset code has expired. Please request a new one.')
    }

    const validCode = await bcrypt.compare(normalisedCode, user.resetToken)
    if (!validCode) {
      throw new ApiError(400, 'Invalid reset code. Please check the code and try again.')
    }

    return { message: 'Code verified successfully' }
  },

  // Reset password: verify code + set new password.
  async resetPassword(email, code, newPassword) {
    const normalisedEmail = email.toLowerCase().trim()
    const normalisedCode = String(code).trim()

    const user = await prisma.user.findUnique({ where: { email: normalisedEmail } })
    if (!user) {
      throw new ApiError(400, 'No account found with that email address')
    }
    if (!user.resetToken || !user.resetTokenExpiry) {
      throw new ApiError(400, 'No reset code was requested. Please request a new code first.')
    }

    if (new Date() > new Date(user.resetTokenExpiry)) {
      // Clear expired token
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: null, resetTokenExpiry: null },
      })
      throw new ApiError(400, 'Reset code has expired. Please request a new one.')
    }

    const validCode = await bcrypt.compare(normalisedCode, user.resetToken)
    if (!validCode) {
      throw new ApiError(400, 'Invalid reset code. Please check the code and try again.')
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null, mustChangePassword: false },
    })

    return { message: 'Password reset successfully' }
  },
}

module.exports = authService
