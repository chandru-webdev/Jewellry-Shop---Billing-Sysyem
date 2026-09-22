const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const backupController = require('../controllers/backup.controller')

const router = Router()

router.use(authenticate)

// GET /api/backup — list backup/restore history
router.get('/', backupController.list)

// POST /api/backup — take a backup (snapshot of all data)
router.post('/', backupController.create)

// GET /api/backup/:id — fetch one record; ?download=1 returns the JSON file
router.get('/:id', backupController.get)

// POST /api/backup/:id/restore — re-push a backup snapshot into the DB
router.post('/:id/restore', backupController.restore)

module.exports = router