const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const bankAccountService = require('../services/bankAccount.service')

const bankAccountController = {
  list: asyncHandler(async (req, res) => {
    const accounts = await bankAccountService.list(req.query)
    success(res, 200, accounts, 'Bank accounts fetched')
  }),

  summary: asyncHandler(async (req, res) => {
    const summary = await bankAccountService.summary()
    success(res, 200, summary, 'Summary fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const account = await bankAccountService.getById(req.params.id)
    success(res, 200, account, 'Bank account fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const account = await bankAccountService.create(req.body)
    success(res, 201, account, 'Bank account created')
  }),

  update: asyncHandler(async (req, res) => {
    const account = await bankAccountService.update(req.params.id, req.body)
    success(res, 200, account, 'Bank account updated')
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await bankAccountService.remove(req.params.id)
    success(res, 200, null, result.message)
  }),
}

module.exports = bankAccountController
