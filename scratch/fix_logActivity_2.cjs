const fs = require('fs');

const path = 'server.ts';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(/logActivity\('STAFF'/g, "logActivity(req, 'STAFF'");
content = content.replace(/logActivity\('PRODUCT'/g, "logActivity(req, 'PRODUCT'");
content = content.replace(/logActivity\('STOCK'/g, "logActivity(req, 'STOCK'");
content = content.replace(/logActivity\('CATEGORY'/g, "logActivity(req, 'CATEGORY'");
content = content.replace(/logActivity\('CUSTOMER'/g, "logActivity(req, 'CUSTOMER'");
content = content.replace(/logActivity\('PAYMENT'/g, "logActivity(req, 'PAYMENT'");
content = content.replace(/logActivity\('RETURN'/g, "logActivity(req, 'RETURN'");
content = content.replace(/logActivity\('SUPPLIER'/g, "logActivity(req, 'SUPPLIER'");
content = content.replace(/logActivity\('SUPPLIER_PAYMENT'/g, "logActivity(req, 'SUPPLIER_PAYMENT'");
content = content.replace(/logActivity\('SETTINGS'/g, "logActivity(req, 'SETTINGS'");
content = content.replace(/logActivity\('SYSTEM'/g, "logActivity(req, 'SYSTEM'");
content = content.replace(/logActivity\('SALE'/g, "logActivity(req, 'SALE'");

content = content.replace(
  /Nouvelle vente - Facture N° \$\{saleId\.slice\(0, 8\)\}/g,
  "Nouvelle vente - Facture N° ${nextInvoice}"
);

fs.writeFileSync(path, content, 'utf-8');
console.log('Fixed logActivity calls in server.ts');
