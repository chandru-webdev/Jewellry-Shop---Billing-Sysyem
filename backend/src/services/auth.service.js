const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { signToken } = require('../utils/jwt')

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

    const token = signToken({ id: user.id, role: user.role.name })
    return { token, user: this.safeUser(user) }
  },

  // Fetch fresh user data for the /me endpoint.
  async me(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    })
    if (!user) throw new ApiError(404, 'User not found')
    return this.safeUser(user)
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
    const user = await prisma.user.findUnique({ where: { email } })
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

    return { message: 'If an account with that email exists, a reset code has been sent.' }
  },

  // Reset password: verify code + set new password.
  async resetPassword(email, code, newPassword) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      throw new ApiError(400, 'Invalid or expired reset code')
    }

    if (new Date() > user.resetTokenExpiry) {
      // Clear expired token
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: null, resetTokenExpiry: null },
      })
      throw new ApiError(400, 'Reset code has expired. Please request a new one.')
    }

    const validCode = await bcrypt.compare(code, user.resetToken)
    if (!validCode) {
      throw new ApiError(400, 'Invalid reset code')
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
