const fs = require('fs');
let sContent = fs.readFileSync('src/pages/SupplierList.tsx', 'utf-8');
if (!sContent.includes('const [dueDateModal, setDueDateModal] = useState(')) {
    sContent = sContent.replace('const [check_ownerModal, setCheck_ownerModal] = useState(\'\');', 'const [check_ownerModal, setCheck_ownerModal] = useState(\'\');\n  const [dueDateModal, setDueDateModal] = useState(\'\');');
}
sContent = sContent.replace('check_number: adjustMethod === \'CHECK\' ? checkNum : null,', 'check_number: adjustMethod === \'CHECK\' ? checkNum : null,\n          check_due_date: adjustMethod === \'CHECK\' ? dueDateModal : null,');
if (sContent.includes('setCheckNum(\'\');')) {
    sContent = sContent.replace('setCheckNum(\'\');', 'setCheckNum(\'\');\n      setDueDateModal(\'\');');
}
if (!sContent.includes('value={dueDateModal || \'\'} onChange={e => setDueDateModal(e.target.value)}')) {
    sContent = sContent.replace(
        '<input type=\"text\" placeholder={t.checkOwner} className=\"w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-sm font-bold focus:border-accent outline-none mb-3\" value={check_ownerModal} onChange={e => setCheck_ownerModal(e.target.value)} />',
        '<input type=\"text\" placeholder={t.checkOwner} className=\"w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-sm font-bold focus:border-accent outline-none mb-3\" value={check_ownerModal} onChange={e => setCheck_ownerModal(e.target.value)} />\n                    <label className=\"block text-xs font-black uppercase text-text-secondary tracking-widest mb-2\">تاريخ الأداء (اختياري)</label>\n                    <input type=\"date\" className=\"w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none\" value={dueDateModal || \'\'} onChange={e => setDueDateModal(e.target.value)} />'
    );
}
fs.writeFileSync('src/pages/SupplierList.tsx', sContent);

let cContent = fs.readFileSync('src/pages/CustomerList.tsx', 'utf-8');
cContent = cContent.replace('<label className=\"block text-xs font-black uppercase text-text-secondary tracking-widest mb-2\">{t.checkOwner}</label>', '<label className=\"block text-xs font-black uppercase text-text-secondary tracking-widest mb-2\">تاريخ الأداء (اختياري)</label>');
cContent = cContent.replace('<label className=\"block text-xs font-black uppercase text-text-secondary tracking-widest mb-2\">{t.date}</label>', '<label className=\"block text-xs font-black uppercase text-text-secondary tracking-widest mb-2\">تاريخ الأداء (اختياري)</label>');
fs.writeFileSync('src/pages/CustomerList.tsx', cContent);
console.log('Done Suppliers');
