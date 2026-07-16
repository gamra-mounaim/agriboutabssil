import db from './src/server/database';
import fs from 'fs';

async function run() {
  try {
    const logs = await db.prepare("SELECT * FROM activity_log WHERE type = 'PRODUCT' AND action = 'update' AND details LIKE '%Qty:%'").all() as any[];
    
    let report = "# خطة تصحيح أخطاء إدخال المخزون وتحديث ديون الموردين\n\n";
    report += "لقد قمت بفحص السجلات مرة أخرى، ووجدت **16 عملية** قامت فيها المستخدمة بزيادة المخزون عن طريق `Edit Produit` عوض `Entrée de Stock`.\n\n";
    report += "| المنتوج | الكمية المضافة | ثمن الشراء للوحدة | الإجمالي المضاف للمورد | المورد |\n";
    report += "|---|---|---|---|---|\n";

    let totalDebtAdded = 0;

    for (const log of logs) {
      const match = log.details.match(/Updated product: (.*?)\s*\|.*Qty: (\d+)->(\d+)/);
      if (match) {
        // Find exact match by trying both trimmed and original from log, or using LIKE
        const originalNameFromLog = log.details.substring("Updated product: ".length, log.details.indexOf(" | Changes:"));
        const oldQty = parseInt(match[2]);
        const newQty = parseInt(match[3]);
        const addedQty = newQty - oldQty;

        if (addedQty > 0) {
          let product = await db.prepare('SELECT id, cost_price, supplier_id, supplier FROM products WHERE name = ?').get(originalNameFromLog) as any;
          if (!product) {
              product = await db.prepare('SELECT id, cost_price, supplier_id, supplier FROM products WHERE name LIKE ?').get(originalNameFromLog.trim() + '%') as any;
          }

          if (product && product.supplier_id) {
            const cost = product.cost_price || 0;
            const totalCost = cost * addedQty;
            totalDebtAdded += totalCost;
            
            report += `| ${originalNameFromLog.trim()} | +${addedQty} | ${cost} DH | **${totalCost} DH** | ${product.supplier} |\n`;
          } else if (product) {
            report += `| ${originalNameFromLog.trim()} | +${addedQty} | ${product.cost_price} DH | 0 DH (بدون مورد مسجل) | - |\n`;
          } else {
             report += `| ${originalNameFromLog.trim()} | +${addedQty} | غير معروف | غير معروف | غير موجود |\n`;
          }
        }
      }
    }

    report += `\n**إجمالي الديون التي ستتم إضافتها للموردين:** **${totalDebtAdded} DH**\n\n`;
    report += "لقد تم تصحيح المشكلة السابقة (التي جعلت بعض الموردين يظهرون كغير معروفين بسبب مسافة زائدة في الاسم).\n";
    report += "## هل أنت متأكد من تنفيذ هذه العملية؟\n";
    report += "إذا ضغطت على `Proceed`، سأقوم بـ:\n1. إضافة كل هذه المبالغ لحسابات الموردين تلقائياً.\n2. تسجيل كل هذه الحركات في قسم `Entrée de Stock` لتكون صحيحة 100% في سجل المخزون.\n";

    fs.writeFileSync('C:\\Users\\HP\\.gemini\\antigravity\\brain\\faee25da-6b06-42a2-a209-1b010226ee80\\implementation_plan.md', report);
    console.log("Plan created.");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
