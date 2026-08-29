const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const ledgerService = require('../services/ledger.service')

const ledgerController = {
  // GET /api/ledger
  list: asyncHandler(async (req, res) => {
    const result = await ledgerService.list()
    success(res, 200, result, 'Ledger fetched')
  }),

  // GET /api/ledger/accounts
  accounts: asyncHandler(async (req, res) => {
    const result = await ledgerService.accounts()
    success(res, 200, result, 'Chart of accounts fetched')
  }),

  // GET /api/ledger/trial-balance
  trialBalance: asyncHandler(async (req, res) => {
    const result = await ledgerService.trialBalance()
    success(res, 200, result, 'Trial balance fetched')
  }),

  // GET /api/ledger/:id
  getById: asyncHandler(async (req, res) => {
    const result = await ledgerService.getById(Number(req.params.id))
    success(res, 200, result, 'Account fetched')
  }),
}

module.exports = ledgerController