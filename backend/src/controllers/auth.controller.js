const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const authService = require('../services/auth.service')

const authController = {
  // POST /api/auth/login  ->  { token, user }
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body
    const { token, user } = await authService.login(email, password)
    success(res, 200, { token, user }, 'Login successful')
  }),

  // POST /api/auth/logout  ->  JWT is stateless, so this just confirms it.
  logout: asyncHandler(async (req, res) => {
    success(res, 200, null, 'Logged out successfully')
  }),

  // GET /api/auth/me  ->  current logged-in user (requires JWT)
  me: asyncHandler(async (req, res) => {
    const user = await authService.me(req.user.id)
    success(res, 200, user, 'User fetched')
  }),

  // POST /api/auth/change-password  ->  change own password
  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body
    await authService.changePassword(req.user.id, currentPassword, newPassword)
    success(res, 200, null, 'Password changed successfully')
  }),
}

module.exports = authController
