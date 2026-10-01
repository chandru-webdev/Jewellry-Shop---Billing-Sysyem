// Verifies the upload contract end-to-end without a live server: the multer
// allow-list the controller actually uses must accept browser-originated image
// types (including HEIC from iPhones) and reject junk, the ApiError status must
// be readable by the handler, and the response shape must match what the
// frontend reads as `res.data.data.url`.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const fs = require('fs')

process.env.JWT_SECRET = 'test-secret'
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test'

const controller = require('../../src/controllers/upload.controller')
const ApiError = require('../../src/utils/ApiError')
const ApiResponse = require('../../src/utils/ApiResponse')

const { ALLOWED_MIMES, ALLOWED_EXTENSIONS } = controller

// Mirrors the decision the fileFilter makes in the controller.
function isAllowed({ mimetype, originalname }) {
  const mt = (mimetype || '').toLowerCase()
  const ext = path.extname(originalname || '').toLowerCase()
  return ALLOWED_MIMES.includes(mt) || ALLOWED_EXTENSIONS.includes(ext)
}

test('accepts common browser image types', () => {
  for (const mt of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) {
    assert.ok(isAllowed({ mimetype: mt, originalname: `x.${mt.split('/')[1]}` }), mt)
  }
})

test('accepts HEIC from iPhone even with an unhelpful mimetype', () => {
  assert.ok(isAllowed({ mimetype: 'image/heic', originalname: 'IMG_0001.HEIC' }))
  assert.ok(isAllowed({ mimetype: '', originalname: 'IMG_0001.heic' }), 'extension fallback')
})

test('accepts PDF and video', () => {
  assert.ok(isAllowed({ mimetype: 'application/pdf', originalname: 'bill.pdf' }))
  assert.ok(isAllowed({ mimetype: 'video/mp4', originalname: 'clip.mp4' }))
  assert.ok(isAllowed({ mimetype: 'video/quicktime', originalname: 'clip.mov' }))
})

test('rejects executables and unknown types', () => {
  assert.ok(!isAllowed({ mimetype: 'application/x-msdownload', originalname: 'a.exe' }))
  assert.ok(!isAllowed({ mimetype: 'text/html', originalname: 'a.html' }))
  assert.ok(!isAllowed({ mimetype: '', originalname: 'script.sh' }))
})

test('controller exports uploadMedia', () => {
  assert.strictEqual(typeof controller.uploadMedia, 'function')
})

test('ApiError exposes statusCode so the upload handler can read it', () => {
  const err = new ApiError(400, 'Invalid file type')
  assert.strictEqual(err.statusCode, 400)
  assert.ok(!('status' in err), 'does not set a legacy `status` field')
})

test('upload dir is created under cwd/uploads', () => {
  assert.ok(fs.existsSync(path.join(process.cwd(), 'uploads')))
})

test('success helper wraps the payload shape the frontend expects', () => {
  let payload
  const res = {
    status() { return this },
    json(body) { payload = body; return this },
  }
  ApiResponse.success(res, 200, { url: 'https://x/y.png', filename: 'y.png' }, 'File uploaded')
  assert.strictEqual(payload.success, true)
  assert.strictEqual(payload.data.url, 'https://x/y.png')
})