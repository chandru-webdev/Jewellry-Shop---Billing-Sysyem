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

// Images: JPEG, PNG, WebP, GIF, AVIF, HEIC/HEIF (iPhone photos often arrive as
// HEIC and would otherwise be rejected with a confusing 400).
// Documents: PDF. Video: MP4, WebM, MOV.
const IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime']
const DOCUMENT_MIMES = ['application/pdf']

const ALLOWED_MIMES = [...IMAGE_MIMES, ...VIDEO_MIMES, ...DOCUMENT_MIMES]
const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif',
  '.heic', '.heif', '.pdf', '.mp4', '.webm', '.mov', '.qt',
]

const fileFilter = (req, file, cb) => {
  const mimetype = (file.mimetype || '').toLowerCase()
  const ext = path.extname(file.originalname || '').toLowerCase()
  // Trust the extension as a fallback: some clients (Safari/iOS) send an
  // unhelpful or empty mimetype for HEIC uploads.
  if (ALLOWED_MIMES.includes(mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true)
  } else {
    cb(new ApiError(400, 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, AVIF, HEIC, PDF, MP4, WebM, MOV'), false)
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
      // ApiError carries `statusCode`; MulterError carries `status`. Read both
      // so a rejected upload reports the real reason instead of a blanket 400.
      if (err) return res.status(err.statusCode || err.status || 400).json({ success: false, message: err.message })
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })

      const baseUrl = `${req.protocol}://${req.get('host')}`
      const fileUrl = `${baseUrl}/uploads/${req.file.filename}`
      success(res, 200, { url: fileUrl, filename: req.file.filename, mimetype: req.file.mimetype }, 'File uploaded')
    })
  }
}

module.exports = uploadController
module.exports.ALLOWED_MIMES = ALLOWED_MIMES
module.exports.ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS