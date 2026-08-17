const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { verifyToken } = require('../utils/jwt')
const asyncHandler = require('../utils/asyncHandler')

// 1. authenticate: reads the Bearer token, verifies it, and loads the user.
//    After this runs, req.user holds the logged-in user (or it throws 401).
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) {
    throw new ApiError(401, 'No token provided. Please log in.')
  }

  const token = header.slice(7)

  let payload
  try {
    payload = verifyToken(token)
  } catch {
    throw new ApiError(401, 'Invalid or expired token. Please log in again.')
  }

  // Load a FRESH user from the database (catches disabled accounts / role changes).
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: { role: true },
  })

  if (!user) throw new ApiError(401, 'User no longer exists.')
  if (!user.isActive) throw new ApiError(403, 'Your account is disabled.')

  req.user = user
  next()
})

// 2. authorize('ADMIN', 'MANAGER'): restricts a route to certain roles.
//    Must be used AFTER authenticate.
const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role?.name
    if (!userRole || !roles.includes(userRole)) {
      throw new ApiError(403, 'You do not have permission to perform this action.')
    }
    next()
  }
}

module.exports = { authenticate, authorize }
