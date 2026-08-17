const jwt = require('jsonwebtoken')
const env = require('../config/env')

// Create a signed JWT. The payload carries the user id.
const signToken = (payload) => jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn })

// Verify a token. Throws if invalid/expired.
const verifyToken = (token) => jwt.verify(token, env.jwt.secret)

module.exports = { signToken, verifyToken }
