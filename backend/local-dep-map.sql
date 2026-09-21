\echo '=== invoices with test/e2e markers ==='
SELECT id, "invoiceNumber", "customerId" FROM "Invoice"
WHERE "invoiceNumber" ILIKE '%e2e%' OR "invoiceNumber" ILIKE '%qa%' OR "invoiceNumber" ILIKE '%test%';
\echo '=== products referencing e2e suppliers ==='
SELECT p.id, p.name, p.sku, p."supplierId" FROM "Product" p
WHERE p."supplierId" IN (SELECT id FROM "Supplier" WHERE name ILIKE '%e2e%' OR name LIKE 'QA Supplier %');
\echo '=== payments referencing order 41 or test invoices ==='
SELECT id, "orderId", "invoiceId", "amount" FROM "Payment" WHERE "orderId" = 41 OR "invoiceId" IN (SELECT id FROM "Invoice" WHERE "customerId" IN (SELECT id FROM "Customer" WHERE name LIKE 'QA %')) IS NOT NULL AND "invoiceId" IS NOT NULL;
\echo '=== PurchaseInvoice referencing e2e suppliers ==='
SELECT id, "piNumber" FROM "PurchaseInvoice" WHERE "supplierId" IN (SELECT id FROM "Supplier" WHERE name ILIKE '%e2e%' OR name LIKE 'QA Supplier %');
\echo '=== Invoice referencing test orders ==='
SELECT i.id, i."invoiceNumber", i."orderId" FROM "Invoice" i WHERE i."orderId" = 41;