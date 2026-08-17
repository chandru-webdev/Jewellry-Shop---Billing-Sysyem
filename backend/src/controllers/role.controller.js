const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const roleService = require('../services/role.service')

const roleController = {
  list: asyncHandler(async (req, res) => {
    const roles = await roleService.list()
    success(res, 200, roles, 'Roles fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const role = await roleService.create(req.body)
    success(res, 201, role, 'Role created')
  }),

  update: asyncHandler(async (req, res) => {
    const role = await roleService.update(req.params.id, req.body)
    success(res, 200, role, 'Role updated')
  }),

  remove: asyncHandler(async (req, res) => {
    await roleService.remove(req.params.id)
    success(res, 200, null, 'Role deleted')
  }),
}

module.exports = roleController
