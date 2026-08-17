const express = require('express')
const searchController = require('../controllers/search.controller')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', searchController.search)

module.exports = router
