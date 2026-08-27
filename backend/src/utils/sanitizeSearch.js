function escapeLike(str) {
  return String(str || '').trim().slice(0, 100).replace(/%/g, '\\%').replace(/_/g, '\\_')
}

module.exports = { escapeLike }
