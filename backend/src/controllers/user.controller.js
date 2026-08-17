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
    const user = await userService.create(req.body, req.user.id)
    success(res, 201, user, 'User created')
  }),

  update: asyncHandler(async (req, res) => {
    const user = await userService.update(req.params.id, req.body, req.user.id)
    success(res, 200, user, 'User updated')
  }),
}

module.exports = userController
