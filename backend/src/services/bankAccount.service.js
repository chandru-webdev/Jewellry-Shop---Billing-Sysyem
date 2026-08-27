const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { escapeLike } = require('../utils/sanitizeSearch')

const bankAccountService = {
  async list({ search, type, isActive } = {}) {
    const where = {}
    if (search) {
      const q = escapeLike(search)
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { bank: { contains: q, mode: 'insensitive' } },
        { accountNumber: { contains: q } },
      ]
    }
    if (type) where.type = type
    if (isActive !== undefined && isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true' || isActive === true
    }
    return prisma.bankAccount.findMany({ where, orderBy: { id: 'desc' } })
  },

  async summary() {
    const accounts = await prisma.bankAccount.findMany({ where: { isActive: true } })
    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0)
    return {
      totalBalance,
      activeAccounts: accounts.length,
      totalAccounts: await prisma.bankAccount.count(),
    }
  },

  async getById(id) {
    const account = await prisma.bankAccount.findUnique({ where: { id: Number(id) } })
    if (!account) throw new ApiError(404, 'Bank account not found')
    return account
  },

  async create(data) {
    const openingBalance = Number(data.openingBalance) || 0
    return prisma.bankAccount.create({
      data: {
        name: data.name,
        bank: data.bank,
        accountNumber: data.accountNumber,
        ifsc: data.ifsc,
        type: data.type || 'Current',
        openingBalance,
        balance: openingBalance,
        openingDate: data.openingDate ? new Date(data.openingDate) : new Date(),
      },
    })
  },

  async update(id, data) {
    const existing = await this.getById(id)
    const patch = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.bank !== undefined) patch.bank = data.bank
    if (data.accountNumber !== undefined) patch.accountNumber = data.accountNumber
    if (data.ifsc !== undefined) patch.ifsc = data.ifsc
    if (data.type !== undefined) patch.type = data.type
    if (data.isActive !== undefined) patch.isActive = data.isActive
    if (data.openingBalance !== undefined) {
      patch.openingBalance = Number(data.openingBalance)
      // Adjust balance proportionally if opening balance changed
      const diff = Number(data.openingBalance) - Number(existing.openingBalance)
      patch.balance = Number(existing.balance) + diff
    }

    return prisma.bankAccount.update({ where: { id: existing.id }, data: patch })
  },

  async remove(id) {
    const existing = await this.getById(id)
    await prisma.bankAccount.delete({ where: { id: existing.id } })
    return { message: 'Bank account deleted' }
  },
}

module.exports = bankAccountService
