import React, { useMemo } from 'react';
import { useStore, useAuthStore } from '../store/useStore';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

export function GlobalAlerts() {
  const { checks, customers } = useStore();
  const { language } = useAuthStore();

  const checksDueSoon = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    return checks.filter(c => {
      if ((c as any).checkStatus && (c as any).checkStatus !== 'PENDING') return false;
      if (!(c as any).checkDueDate) return false;
      const dueDate = new Date((c as any).checkDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate <= threeDaysFromNow;
    }).sort((a: any, b: any) => new Date(a.checkDueDate).getTime() - new Date(b.checkDueDate).getTime());
  }, [checks]);

  const customersDueSoon = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    return customers.filter(c => {
      if (!c.debt || c.debt <= 0) return false;
      const cDueDate = c.dueDate || (c as any).due_date;
      if (!cDueDate) return false;
      const dueDate = new Date(cDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate <= threeDaysFromNow;
    }).sort((a: any, b: any) => {
      const aDate = new Date(a.dueDate || (a as any).due_date);
      const bDate = new Date(b.dueDate || (b as any).due_date);
      return aDate.getTime() - bDate.getTime();
    });
  }, [customers]);

  if (checksDueSoon.length === 0 && customersDueSoon.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 space-y-4"
      >
        {checksDueSoon.length > 0 && (
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-l-4 border-red-500 rounded-r-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-start gap-4 transition-all hover:shadow-md">
            <div className="bg-red-500/20 p-2.5 rounded-xl shrink-0 self-start animate-pulse">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 w-full">
              <h3 className="text-red-700 dark:text-red-400 font-black text-sm md:text-base uppercase tracking-wider mb-1">
                {language === 'ar' ? 'تنبيه الشيكات المستحقة' : language === 'fr' ? 'Alerte : Chèques arrivant à échéance' : 'Alert: Checks Due Soon'}
              </h3>
              <p className="text-red-600/80 dark:text-red-400/80 text-xs md:text-sm font-bold mb-3">
                {language === 'ar' 
                  ? `يوجد ${checksDueSoon.length} شيك(ات) اقترب موعد أدائها.` 
                  : language === 'fr' 
                  ? `Il y a ${checksDueSoon.length} chèque(s) dont l'échéance approche.` 
                  : `There are ${checksDueSoon.length} check(s) due soon.`}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {checksDueSoon.map((c: any) => {
                  const dueDate = new Date(c.checkDueDate);
                  const isOverdue = dueDate < new Date();
                  return (
                    <div key={c.id} className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-2",
                      isOverdue ? "bg-red-500 text-white border-red-600 shadow-sm" : "bg-white/60 dark:bg-black/20 border-red-500/30 text-red-700 dark:text-red-300"
                    )}>
                      <span className="max-w-[120px] truncate">{c.checkOwner || c.partyName}</span>
                      <span className="opacity-75">{dueDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {customersDueSoon.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-l-4 border-amber-500 rounded-r-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-start gap-4 transition-all hover:shadow-md">
            <div className="bg-amber-500/20 p-2.5 rounded-xl shrink-0 self-start animate-pulse">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 w-full">
              <h3 className="text-amber-700 dark:text-amber-400 font-black text-sm md:text-base uppercase tracking-wider mb-1">
                {language === 'ar' ? 'تنبيه أداء ديون الزبناء' : language === 'fr' ? 'Alerte : Dettes clients à venir' : 'Alert: Customer Debts'}
              </h3>
              <p className="text-amber-600/80 dark:text-amber-400/80 text-xs md:text-sm font-bold mb-3">
                {language === 'ar' 
                  ? `لقد حان أو اقترب موعد أداء ديون ${customersDueSoon.length} زبون/زبناء.` 
                  : language === 'fr' 
                  ? `L'échéance de remboursement pour ${customersDueSoon.length} client(s) approche ou est dépassée.` 
                  : `The debt repayment deadline for ${customersDueSoon.length} customer(s) is approaching or past due.`}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {customersDueSoon.map((c: any) => {
                  const cDueDate = c.dueDate || c.due_date;
                  const isOverdue = new Date(cDueDate) < new Date();
                  return (
                    <div key={c.id} className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-help",
                      isOverdue ? "bg-amber-500 text-white border-amber-600 shadow-sm" : "bg-white/60 dark:bg-black/20 border-amber-500/30 text-amber-800 dark:text-amber-200"
                    )}>
                      <span className="max-w-[150px] truncate">{c.name}</span>
                      <span className="opacity-75">{new Date(cDueDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
