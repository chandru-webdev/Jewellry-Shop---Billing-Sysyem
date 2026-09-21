const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { success } = require('../utils/ApiResponse')
const ApiError = require('../utils/ApiError')

// Configure multer storage
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50)
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${name}-${unique}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new ApiError(400, 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MOV'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}).single('file')

const uploadController = {
  // POST /api/upload/media — upload image/video, return public URL
  uploadMedia: (req, res) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File too large (max 50MB)' })
        return res.status(400).json({ success: false, message: err.message })
      }
      if (err) return res.status(err.status || 400).json({ success: false, message: err.message })
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

      const baseUrl = `${req.protocol}://${req.get('host')}`
      const fileUrl = `${baseUrl}/uploads/${req.file.filename}`
      success(res, 200, { url: fileUrl, filename: req.file.filename, mimetype: req.file.mimetype }, 'File uploaded')
    })
  }
}

module.exports = uploadController