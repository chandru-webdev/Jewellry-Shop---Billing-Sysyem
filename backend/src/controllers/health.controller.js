const { success } = require('../utils/ApiResponse')
const env = require('../config/env')

// Example controller showing the pattern:
// 1. (later) validate request
// 2. call a service
// 3. send a consistent response
const health = (req, res) => {
  success(res, 200, {
    status: 'ok',
    service: 'OPAL LINE ERP API',
    version: '1.0.0',
    environment: env.nodeEnv,
  })
}

module.exports = { health }
