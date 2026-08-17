const bcrypt = require('bcryptjs')
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
    const { password, ...safe } = user
    return safe
  },
}

module.exports = authService
