const express = require('express')
const ledgerController = require('../controllers/ledger.controller')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate, authorize('SUPER_ADMIN', 'MANAGER'))

router.get('/accounts', ledgerController.accounts)
router.get('/trial-balance', ledgerController.trialBalance)
router.get('/:id', ledgerController.getById)
router.get('/', ledgerController.list)

module.exports = router