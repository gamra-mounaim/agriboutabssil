const fs = require('fs');

const file = 'src/pages/CheckListView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add imports
content = content.replace("import { Search, Archive } from 'lucide-react';", "import { Search, Archive, ChevronDown, CheckCircle, XCircle, Clock } from 'lucide-react';\nimport { api } from '../services/apiService';");

// Add handleStatusChange
const handleStatusChangeStr = `
  const { onRefresh } = useStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (type: string, id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      await api.updateCheckStatus(type, id, newStatus);
      await onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingTotal = useMemo(() => filteredChecks.filter(c => c.checkStatus === 'PENDING' || !c.checkStatus).reduce((acc, c) => acc + c.total, 0), [filteredChecks]);
  const cashedTotal = useMemo(() => filteredChecks.filter(c => c.checkStatus === 'CASHED').reduce((acc, c) => acc + c.total, 0), [filteredChecks]);

`;
content = content.replace("const t = translations[language] as any;", "const t = translations[language] as any;\n" + handleStatusChangeStr);

// Add summary cards
const summaryCards = `
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-4 rounded-3xl border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === 'ar' ? 'في الانتظار' : 'Pending'}</p>
            <p className="text-xl font-black text-orange-500 mt-1">{formatNumber(pendingTotal)} {t.currency}</p>
          </div>
          <Clock className="w-8 h-8 text-orange-500/20" />
        </div>
        <div className="bg-white p-4 rounded-3xl border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === 'ar' ? 'تم الصرف' : 'Cashed'}</p>
            <p className="text-xl font-black text-success mt-1">{formatNumber(cashedTotal)} {t.currency}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-success/20" />
        </div>
      </div>
`;
content = content.replace('<div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-2xl relative">', summaryCards + '\n      <div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-2xl relative">');

// Update Table Headers
content = content.replace(
  '<th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">{t.checkOwner}</th>',
  '<th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === \'ar\' ? \'البنك\' : \'Bank\'}</th>\n              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">{t.checkOwner}</th>'
);
content = content.replace(
  '<th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest text-right">{t.date}</th>',
  '<th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === \'ar\' ? \'تاريخ الاستحقاق\' : \'Due Date\'}</th>\n              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === \'ar\' ? \'الحالة\' : \'Status\'}</th>\n              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest text-right"></th>'
);

// Update Table Row
const trMatch = /<td className="p-5">\\s*<div className="text-sm font-bold text-text-main uppercase">{check.checkOwner \|\| '\-\'}<\/div>\\s*<\/td>/;
content = content.replace(trMatch, (match) => {
  return `
                  <td className="p-5">
                    <div className="text-sm font-bold text-text-main uppercase">{check.checkOwner?.includes('|') ? check.checkOwner.split('|')[0].trim() : '-'}</div>
                  </td>
                  <td className="p-5">
                    <div className="text-sm font-bold text-text-main uppercase">{check.checkOwner?.includes('|') ? check.checkOwner.split('|')[1].trim() : (check.checkOwner || '-')}</div>
                  </td>`;
});

// Update colSpan
content = content.replace('colSpan={6}', 'colSpan={9}');

// Update row end (DueDate, Status, Actions)
const tdDateMatch = /<td className="p-5 text-right font-mono text-\\[11px\\] text-text-secondary">\\s*{new Date\\(check.date\\).toLocaleString[^<]+<\/td>/;

content = content.replace(tdDateMatch, (match) => {
  return `
                  <td className="p-5">
                    <div className="text-sm font-bold text-text-main">{check.checkDueDate ? new Date(check.checkDueDate).toLocaleDateString() : '-'}</div>
                    <div className="text-[10px] text-text-secondary mt-0.5">{new Date(check.date).toLocaleDateString()}</div>
                  </td>
                  <td className="p-5">
                    <div className={cn("text-[10px] font-black uppercase px-2 py-1 rounded-lg inline-flex items-center gap-1", 
                      check.checkStatus === 'CASHED' ? "bg-success/10 text-success" : 
                      check.checkStatus === 'REJECTED' ? "bg-danger/10 text-danger" : 
                      "bg-orange-50 text-orange-500"
                    )}>
                      {check.checkStatus === 'CASHED' ? <CheckCircle className="w-3 h-3" /> : 
                       check.checkStatus === 'REJECTED' ? <XCircle className="w-3 h-3" /> : 
                       <Clock className="w-3 h-3" />}
                      {check.checkStatus === 'CASHED' ? (language === 'ar' ? 'تم الصرف' : 'Cashed') :
                       check.checkStatus === 'REJECTED' ? (language === 'ar' ? 'مرفوض' : 'Rejected') :
                       (language === 'ar' ? 'في الانتظار' : 'Pending')}
                    </div>
                  </td>
                  <td className="p-5 text-right relative w-32">
                    <select
                      disabled={updatingId === check.id}
                      onChange={(e) => handleStatusChange(check.type, check.id, e.target.value)}
                      value={check.checkStatus || 'PENDING'}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    >
                      <option value="PENDING">{language === 'ar' ? 'في الانتظار' : 'Pending'}</option>
                      <option value="CASHED">{language === 'ar' ? 'تم الصرف' : 'Cashed'}</option>
                      <option value="REJECTED">{language === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                    </select>
                    <button className="bg-bg-base hover:bg-border-subtle text-text-main px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-colors relative z-0 w-full">
                      {updatingId === check.id ? '...' : (language === 'ar' ? 'تغيير الحالة' : 'Status')}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </td>
`;
});

fs.writeFileSync(file, content);
