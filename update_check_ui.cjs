const fs = require('fs');
let content = fs.readFileSync('src/pages/CheckListView.tsx', 'utf-8');

// 1. Add checksDueSoon logic
const checksDueSoonStr = `
  const checksDueSoon = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

    return filteredChecks.filter(c => {
      if ((c as any).checkStatus && (c as any).checkStatus !== 'PENDING') return false;
      if (!(c as any).checkDueDate) return false;
      const dueDate = new Date((c as any).checkDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate <= twoDaysFromNow;
    });
  }, [filteredChecks]);

  const handleDateChange = async (type: string, id: string, newDate: string) => {
    setUpdatingId(id);
    try {
      await api.updateCheckDate(type, id, newDate);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };
`;
content = content.replace('const pendingTotal = useMemo(', checksDueSoonStr + '\n\n  const pendingTotal = useMemo(');

// 2. Add Alert UI
const alertUI = `
      {checksDueSoon.length > 0 && (
        <div className="bg-danger/10 border-2 border-danger rounded-3xl p-4 mb-4 flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="bg-danger rounded-full p-2">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-black text-danger text-lg">{language === 'ar' ? 'تنبيه: شيكات اقترب موعد أدائها!' : 'Alert: Checks due soon!'}</p>
              <p className="text-sm font-bold text-danger/80">{language === 'ar' ? \`يوجد \${checksDueSoon.length} شيك(ات) موعد أدائها خلال يومين أو أقل.\` : \`There are \${checksDueSoon.length} check(s) due in 2 days or less.\`}</p>
            </div>
          </div>
        </div>
      )}
`;
content = content.replace('<div className="grid grid-cols-2 gap-4 mb-4">', alertUI + '\n      <div className="grid grid-cols-2 gap-4 mb-4">');

// 3. Update the Due Date Column in the table to be an input
const oldDateColumn = `<div className="text-sm font-bold text-text-main">{(check as any).checkDueDate ? new Date((check as any).checkDueDate).toLocaleDateString() : '-'}</div>`;
const newDateColumn = `<input 
                      type="date" 
                      disabled={updatingId === check.id}
                      className="bg-transparent border-b-2 border-border-subtle focus:border-accent outline-none text-sm font-bold text-text-main text-center w-full"
                      value={(check as any).checkDueDate || ''}
                      onChange={(e) => handleDateChange(check.type, check.id, e.target.value)}
                    />`;
content = content.replace(oldDateColumn, newDateColumn);

fs.writeFileSync('src/pages/CheckListView.tsx', content);
console.log('Done');
