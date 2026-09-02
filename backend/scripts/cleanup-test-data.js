const prisma = require('../src/prisma/client')
const { request } = require('../src/integrations/shopify/client')

const SHOPIFY_PRODUCT_ID = '8222679040093'
const PRODUCT_IDS = [26, 27]

async function main() {
  const before = await prisma.product.findMany({ where: { id: { in: PRODUCT_IDS } }, select: { id: true, sku: true } })
  console.log('local products to delete:', JSON.stringify(before))

  const colls = await prisma.collection.findMany({ select: { id: true, name: true } })
  console.log('collections on prod:', JSON.stringify(colls))

  console.log('deleting Shopify product', SHOPIFY_PRODUCT_ID, '...')
  await request(`/products/${SHOPIFY_PRODUCT_ID}.json`, { method: 'DELETE' })
  console.log('shopify product deleted')

  await prisma.inventory.deleteMany({ where: { productId: { in: PRODUCT_IDS } } })
  const priceHistory = await prisma.productPriceHistory.deleteMany({ where: { productId: { in: PRODUCT_IDS } } })
  console.log('deleted price-history rows:', priceHistory.count)

  const del = await prisma.product.deleteMany({ where: { id: { in: PRODUCT_IDS } } })
  console.log('deleted local products:', del.count)

  const colDel = await prisma.collection.deleteMany({ where: { id: 1, name: 'Festive Edit' } })
  console.log('deleted collection rows:', colDel.count)

  const after = await prisma.product.findMany({ where: { id: { in: PRODUCT_IDS } }, select: { id: true, sku: true } })
  const afterColl = await prisma.collection.findMany({ select: { name: true } })
  console.log('after — remaining products:', JSON.stringify(after), 'collections:', JSON.stringify(afterColl))
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('CLEANUP FAILED:', e)
    process.exit(1)
  })