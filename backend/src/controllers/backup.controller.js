const asyncHandler = require('../utils/asyncHandler')
const backupService = require('../services/backup.service')

const backupController = {
  // GET /api/backup — list all backup/restore history
  list: asyncHandler(async (req, res) => {
    const records = await backupService.list()
    return res.json({ success: true, data: records })
  }),

  // POST /api/backup — take a new backup (snapshot of all data)
  create: asyncHandler(async (req, res) => {
    const createdById = req.user?.id
    const record = await backupService.createBackup(createdById)
    return res.status(201).json({
      success: true,
      data: {
        id: record.id,
        type: record.type,
        name: record.name,
        size: record.size,
        counts: record.counts,
        createdAt: record.createdAt,
      },
    })
  }),

  // GET /api/backup/:id — fetch one record (with snapshot data for download)
  get: asyncHandler(async (req, res) => {
    const record = await backupService.get(Number(req.params.id))
    if (!record) {
      return res.status(404).json({ success: false, message: 'Backup not found' })
    }
    if (record.type === 'BACKUP' && req.query.download === '1') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="backup_${record.id}_${new Date(record.createdAt).toISOString().slice(0, 10)}.json"`)
      return res.send(JSON.stringify(record.data, null, 2))
    }
    return res.json({ success: true, data: record })
  }),

  // POST /api/backup/:id/restore — re-push a backup's data into the DB
  restore: asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const record = await backupService.get(id)
    if (!record) {
      return res.status(404).json({ success: false, message: 'Backup not found' })
    }
    if (record.type !== 'BACKUP') {
      return res.status(400).json({ success: false, message: 'Only a BACKUP snapshot can be restored' })
    }
    if (!record.data) {
      return res.status(400).json({ success: false, message: 'Backup has no data to restore' })
    }

    let counts = null
    try {
      counts = await backupService.restore(record.data, req.user?.id)
    } catch (e) {
      console.error(`[BACKUP] restore ${id} failed:`, e)
      await backupService.prisma.backup.create({ data: {
        type: 'RESTORE',
        name: `Restore of "${record.name}"`,
        counts: null,
        message: `Failed: ${e.message}`,
        createdById: req.user?.id,
      } }).catch(() => {})
      return res.status(500).json({ success: false, message: `Restore failed: ${e.message}` })
    }

    await backupService.prisma.backup.create({ data: {
      type: 'RESTORE',
      name: `Restore of "${record.name}"`,
      counts,
      message: 'Restore completed',
      createdById: req.user?.id,
    } }).catch(() => {})

    return res.json({ success: true, data: { counts } })
  }),
}

module.exports = backupController