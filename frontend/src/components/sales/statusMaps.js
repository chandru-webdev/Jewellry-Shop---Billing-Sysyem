// Single source of truth for status labels/tones across every Sales list
// (Sales tabs + dedicated pages) so the colours and wording never drift.

export const invoiceStatusTone = {
  PAID: 'green',
  FINAL: 'blue',
  DRAFT: 'gray',
  VOID: 'red',
}

export const invoiceStatusLabel = {
  PAID: 'Billed',
  FINAL: 'Billed',
  DRAFT: 'Draft',
  VOID: 'Returned',
}

export const orderStatusTone = {
  PENDING: 'orange',
  PAID: 'green',
  FULFILLED: 'blue',
  CANCELLED: 'red',
  REFUNDED: 'purple',
}

export const orderStatusLabel = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
}

// Only Badge tones that exist in ui/Badge.jsx
export const paymentTone = {
  CASH: 'gray',
  UPI: 'blue',
  CARD: 'purple',
  BANK_TRANSFER: 'gray',
  ONLINE: 'gold',
  OTHER: 'gray',
}

// Orders a customer can raise a return/refund for
export const RETURNABLE_STATUSES = ['PAID', 'FULFILLED']