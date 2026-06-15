const fs = require('fs');

let content = fs.readFileSync('src/pages/CheckListView.tsx', 'utf-8');

const filteredChecksMatch = /const filteredChecks = checks\.filter\(\(c\) => \{[\s\S]*?return matchesSearch && matchesType;\s*\}\);/;
const matchResult = content.match(filteredChecksMatch);
if (matchResult) {
    const filteredChecksStr = matchResult[0];
    content = content.replace(filteredChecksMatch, '');
    content = content.replace('const pendingTotal = useMemo(', filteredChecksStr + '\n\n  const pendingTotal = useMemo(');
}

// Fix onRefresh to fetchData
content = content.replace('const { onRefresh } = useStore();', 'const { fetchData } = useStore();');
content = content.replace('await onRefresh();', 'await fetchData();');

// Also fix the rows. We need to add the missing <td> elements.
content = content.replace(/<td className="p-5">\s*<div className="flex flex-col items-center">\s*<span className="text-sm font-bold text-text-main uppercase">\s*\{check\.partyName \|\| t\.walkingCustomer\}\s*<\/span>\s*<span/m, 
`                  <td className="p-5">
                    <div className="text-sm font-bold text-text-main uppercase">{check.checkOwner?.includes('|') ? check.checkOwner.split('|')[0].trim() : '-'}</div>
                  </td>
                  <td className="p-5">
                    <div className="text-sm font-bold text-text-main uppercase">{check.checkOwner?.includes('|') ? check.checkOwner.split('|')[1].trim() : (check.checkOwner || '-')}</div>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-text-main uppercase">
                        {check.partyName || t.walkingCustomer}
                      </span>
                      <span`
);

content = content.replace(/<td className="p-5 text-right font-mono text-\[11px\] text-text-secondary">\s*\{new Date\(check\.date\)\.toLocaleString\([^<]+<\/td>/m,
`                  <td className="p-5">
                    <div className="text-sm font-bold text-text-main">{(check as any).checkDueDate ? new Date((check as any).checkDueDate).toLocaleDateString() : '-'}</div>
                    <div className="text-[10px] text-text-secondary mt-0.5">{new Date(check.date).toLocaleDateString()}</div>
                  </td>
                  <td className="p-5">
                    <div className={cn("text-[10px] font-black uppercase px-2 py-1 rounded-lg inline-flex items-center gap-1", 
                      (check as any).checkStatus === 'CASHED' ? "bg-success/10 text-success" : 
                      (check as any).checkStatus === 'REJECTED' ? "bg-danger/10 text-danger" : 
                      "bg-orange-50 text-orange-500"
                    )}>
                      {(check as any).checkStatus === 'CASHED' ? <CheckCircle className="w-3 h-3" /> : 
                       (check as any).checkStatus === 'REJECTED' ? <XCircle className="w-3 h-3" /> : 
                       <Clock className="w-3 h-3" />}
                      {(check as any).checkStatus === 'CASHED' ? (language === 'ar' ? 'تم الصرف' : 'Cashed') :
                       (check as any).checkStatus === 'REJECTED' ? (language === 'ar' ? 'مرفوض' : 'Rejected') :
                       (language === 'ar' ? 'في الانتظار' : 'Pending')}
                    </div>
                  </td>
                  <td className="p-5 text-right relative w-32">
                    <select
                      disabled={updatingId === check.id}
                      onChange={(e) => handleStatusChange(check.type, check.id, e.target.value)}
                      value={(check as any).checkStatus || 'PENDING'}
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
                  </td>`
);

// We need to completely get rid of the old checkOwner column since we split it!
content = content.replace(/<td className="p-5">\s*<div className="text-sm font-bold text-text-main uppercase">\s*\{check.checkOwner \|\| "-"\}\s*<\/div>\s*<\/td>/, '');


fs.writeFileSync('src/pages/CheckListView.tsx', content);
