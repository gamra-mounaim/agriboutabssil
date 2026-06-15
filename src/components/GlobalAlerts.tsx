import React, { useMemo } from 'react';
import { useStore, useAuthStore } from '../store/useStore';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function GlobalAlerts() {
  const { checks, customers } = useStore();
  const { language } = useAuthStore();

  const checksDueSoon = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

    return checks.filter(c => {
      if ((c as any).checkStatus && (c as any).checkStatus !== 'PENDING') return false;
      if (!(c as any).checkDueDate) return false;
      const dueDate = new Date((c as any).checkDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate <= twoDaysFromNow;
    });
  }, [checks]);

  const customersDueSoon = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

    return customers.filter(c => {
      if (!c.debt || c.debt <= 0) return false;
      if (!c.dueDate) return false;
      const dueDate = new Date(c.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate <= twoDaysFromNow;
    });
  }, [customers]);

  if (checksDueSoon.length === 0 && customersDueSoon.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 space-y-3"
      >
        {checksDueSoon.length > 0 && (
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-l-4 border-red-500 rounded-r-2xl p-4 shadow-sm flex items-start gap-4">
            <div className="bg-red-500/20 p-2.5 rounded-xl shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-red-700 dark:text-red-400 font-black text-sm md:text-base uppercase tracking-wider mb-1">
                {language === 'ar' ? 'تنبيه الشيكات المستحقة' : language === 'fr' ? 'Alerte : Chèques arrivant à échéance' : 'Alert: Checks Due Soon'}
              </h3>
              <p className="text-red-600/80 dark:text-red-400/80 text-xs md:text-sm font-bold">
                {language === 'ar' 
                  ? `يوجد ${checksDueSoon.length} شيك(ات) موعد أدائها خلال يومين أو أقل! يرجى التحقق من القائمة.` 
                  : language === 'fr' 
                  ? `Il y a ${checksDueSoon.length} chèque(s) dont l'échéance est dans 2 jours ou moins.` 
                  : `There are ${checksDueSoon.length} check(s) due in 2 days or less.`}
              </p>
            </div>
          </div>
        )}

        {customersDueSoon.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-l-4 border-amber-500 rounded-r-2xl p-4 shadow-sm flex items-start gap-4">
            <div className="bg-amber-500/20 p-2.5 rounded-xl shrink-0 animate-pulse">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-amber-700 dark:text-amber-400 font-black text-sm md:text-base uppercase tracking-wider mb-1">
                {language === 'ar' ? 'تنبيه أداء الديون' : language === 'fr' ? 'Alerte : Dettes clients' : 'Alert: Customer Debts'}
              </h3>
              <p className="text-amber-600/80 dark:text-amber-400/80 text-xs md:text-sm font-bold">
                {language === 'ar' 
                  ? `لقد حان أو اقترب موعد أداء ديون ${customersDueSoon.length} زبون/زبناء. يرجى مراجعة القائمة.` 
                  : language === 'fr' 
                  ? `L'échéance de remboursement pour ${customersDueSoon.length} client(s) approche ou est dépassée.` 
                  : `The debt repayment deadline for ${customersDueSoon.length} customer(s) is approaching or past due.`}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
