const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const userService = require('../services/user.service')

const userController = {
  list: asyncHandler(async (req, res) => {
    const users = await userService.list(req.query)
    success(res, 200, users, 'Users fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const user = await userService.getById(req.params.id)
    success(res, 200, user, 'User fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const result = await userService.create(req.body, req.user.id)
    success(res, 201, result, 'User created')
  }),

  update: asyncHandler(async (req, res) => {
    const user = await userService.update(req.params.id, req.body, req.user.id)
    success(res, 200, user, 'User updated')
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const result = await userService.resetPassword(req.params.id, req.user.id)
    success(res, 200, result, 'Password reset. Share the temporary password with the user.')
  }),

  setPassword: asyncHandler(async (req, res) => {
    const result = await userService.setPassword(req.params.id, req.body.password, req.user.id)
    success(res, 200, result, 'Password updated')
  }),
}

module.exports = userController
