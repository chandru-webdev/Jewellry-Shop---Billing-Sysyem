const express = require('express')
const collectionController = require('../controllers/collection.controller')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', collectionController.list)
router.post('/', authorize('SUPER_ADMIN', 'MANAGER'), collectionController.create)

module.exports = router