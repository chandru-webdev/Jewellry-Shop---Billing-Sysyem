const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

function toNumber(value) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

const ledgerService = {
  // GET /api/ledger/accounts — chart of accounts derived from real financial data
  async accounts() {
    const [banks, moneyIn, purchases, expenses] = await Promise.all([
      prisma.bankAccount.findMany({ orderBy: { id: 'asc' } }),
      prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.purchaseOrder.aggregate({ where: { status: { in: ['RECEIVED', 'PROCESSING'] } }, _sum: { totalAmount: true } }),
      prisma.expense.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    ])

    const assets = banks.reduce((sum, b) => sum + toNumber(b.balance), 0)
    const capital = banks.reduce((sum, b) => sum + toNumber(b.openingBalance), 0)
    const income = toNumber(moneyIn._sum.amount)
    const purchasesTotal = toNumber(purchases._sum.totalAmount)
    const expensesTotal = toNumber(expenses._sum.amount)

    const retained = assets + purchasesTotal + expensesTotal - income - capital

    const accounts = [
      ...banks.map((b) => ({
        id: b.id,
        code: b.accountNumber,
        name: `${b.name}${b.bank ? ` — ${b.bank}` : ''}`,
        type: 'Asset',
        subType: b.type,
        openingBalance: toNumber(b.openingBalance),
        currentBalance: toNumber(b.balance),
        isActive: b.isActive,
      })),
      {
        id: -200,
        code: 'INC-SALES',
        name: 'Sales Income',
        type: 'Income',
        subType: 'Sales',
        openingBalance: 0,
        currentBalance: income,
        isActive: true,
      },
      {
        id: -300,
        code: 'EXP-PURCHASES',
        name: 'Purchases',
        type: 'Expense',
        subType: 'Purchases',
        openingBalance: 0,
        currentBalance: purchasesTotal,
        isActive: true,
      },
      {
        id: -301,
        code: 'EXP-OPERATING',
        name: 'Operating Expenses',
        type: 'Expense',
        subType: 'Expenses',
        openingBalance: 0,
        currentBalance: expensesTotal,
        isActive: true,
      },
      {
        id: -400,
        code: 'EQ-CAPITAL',
        name: 'Opening Capital',
        type: 'Equity',
        subType: 'Capital',
        openingBalance: 0,
        currentBalance: capital,
        isActive: true,
      },
      {
        id: -401,
        code: 'EQ-RETAINED',
        name: 'Retained Earnings',
        type: 'Equity',
        subType: 'Retained',
        openingBalance: 0,
        currentBalance: retained,
        isActive: true,
      },
    ]

    return accounts
  },

  // GET /api/ledger/trial-balance — self-balancing debit/credit breakdown
  async trialBalance() {
    const accounts = await this.accounts()

    const rows = accounts
      .filter((a) => a.id !== -401)
      .map((a) => {
        const bal = a.currentBalance
        if (a.type === 'Asset' || a.type === 'Expense') {
          return { code: a.code, name: a.name, type: a.type, debit: bal > 0 ? bal : 0, credit: bal < 0 ? -bal : 0 }
        }
        return { code: a.code, name: a.name, type: a.type, debit: 0, credit: bal > 0 ? bal : 0 }
      })

    const retainedAccount = accounts.find((a) => a.id === -401)
    const retained = retainedAccount ? retainedAccount.currentBalance : 0

    if (retained !== 0) {
      rows.push({
        code: 'EQ-RETAINED',
        name: 'Retained Earnings',
        type: 'Equity',
        debit: retained < 0 ? -retained : 0,
        credit: retained >= 0 ? retained : 0,
      })
    }

    return rows
  },

  // GET /api/ledger — convenience alias of the chart of accounts
  async list() {
    return this.accounts()
  },

  // GET /api/ledger/:id
  async getById(id) {
    const accounts = await this.accounts()
    const account = accounts.find((a) => a.id === Number(id))
    if (!account) throw new ApiError(404, 'Account not found')
    return account
  },
}

module.exports = ledgerService