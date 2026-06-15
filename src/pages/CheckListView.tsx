import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Search,
  Archive,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { api } from "../services/apiService";
import { formatNumber, cn } from "../utils";
import { translations } from "../translations";
import { useStore, useAuthStore } from "../store/useStore";

export default function CheckListView() {
  const { checks } = useStore();
  const { language } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [checkTypeFilter, setCheckTypeFilter] = useState<
    "all" | "customer" | "supplier"
  >("all");
  const t = translations[language] as any;

  const { fetchData } = useStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (
    type: string,
    id: string,
    newStatus: string,
  ) => {
    try {
      setUpdatingId(id);
      await api.updateCheckStatus(type, id, newStatus);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredChecks = checks.filter((c) => {
    if (!searchTerm)
      return checkTypeFilter === "all" || c.partyRole === checkTypeFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (c.checkNumber || "").toLowerCase().includes(searchLower) ||
      (c.checkOwner || "").toLowerCase().includes(searchLower) ||
      (c.partyName || "").toLowerCase().includes(searchLower);
    const matchesType =
      checkTypeFilter === "all" || c.partyRole === checkTypeFilter;
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    const isAPending = (a as any).checkStatus === "PENDING" || !(a as any).checkStatus;
    const isBPending = (b as any).checkStatus === "PENDING" || !(b as any).checkStatus;
    if (isAPending && !isBPending) return -1;
    if (!isAPending && isBPending) return 1;
    return 0;
  });

  
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


  const pendingTotal = useMemo(
    () =>
      filteredChecks
        .filter((c) => (c as any).checkStatus === "PENDING" || !(c as any).checkStatus)
        .reduce((acc, c) => acc + c.total, 0),
    [filteredChecks],
  );
  const cashedTotal = useMemo(
    () =>
      filteredChecks
        .filter((c) => (c as any).checkStatus === "CASHED")
        .reduce((acc, c) => acc + c.total, 0),
    [filteredChecks],
  );

  

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 pb-12">
      <div
        className={cn(
          "flex flex-col md:flex-row md:items-end justify-between gap-4",
          language === "ar" && "md:flex-row-reverse",
        )}
      >
        <div className={cn(language === "ar" && "text-right")}>
          <h3 className="text-3xl font-black tracking-tighter mb-1 uppercase italic font-serif opacity-90">
            {t.checks}
          </h3>
          <p className="text-text-secondary text-xs font-mono uppercase tracking-widest">
            {t.checkManagement}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-2xl border border-border-subtle shadow-inner">
            {(["all", "customer", "supplier"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCheckTypeFilter(type)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  checkTypeFilter === type
                    ? "bg-accent text-white shadow-md shadow-accent/20"
                    : "text-text-secondary hover:bg-bg-base",
                )}
              >
                {type === "all"
                  ? t.allChecks
                  : type === "customer"
                    ? t.customerChecks
                    : t.supplierChecks}
              </button>
            ))}
          </div>

          <div className="relative group">
            <Search
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary transition-colors group-focus-within:text-accent",
                language === "ar" ? "right-4" : "left-4",
              )}
            />
            <input
              type="text"
              dir={language === "ar" ? "rtl" : "ltr"}
              placeholder={t.searchChecks}
              className={cn(
                "bg-white border-2 border-border-subtle rounded-2xl py-3 px-10 text-sm focus:border-accent outline-none w-full md:w-80 font-bold transition-all shadow-sm",
                language === "ar" && "text-right",
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-4 rounded-3xl border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest">
              {language === "ar" ? "في الانتظار" : "Pending"}
            </p>
            <p className="text-xl font-black text-orange-500 mt-1">
              {formatNumber(pendingTotal)} {t.currency}
            </p>
          </div>
          <Clock className="w-8 h-8 text-orange-500/20" />
        </div>
        <div className="bg-white p-4 rounded-3xl border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest">
              {language === "ar" ? "تم الصرف" : "Cashed"}
            </p>
            <p className="text-xl font-black text-success mt-1">
              {formatNumber(cashedTotal)} {t.currency}
            </p>
          </div>
          <CheckCircle className="w-8 h-8 text-success/20" />
        </div>
      </div>

      <div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-2xl relative">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg-base/50 border-b border-border-subtle text-center">
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                {t.checkNumber}
              </th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                {language === "ar" ? "البنك" : language === "fr" ? "Banque" : "Bank"}
              </th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                {t.checkOwner}
              </th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                {t.checkPartyCustomer} / {t.checkPartySupplier}
              </th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                {t.checkCategory}
              </th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                {t.amount}
              </th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                {language === "ar" ? "تاريخ الاستحقاق" : language === "fr" ? "Échéance" : "Due Date"}
              </th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                {language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status"}
              </th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filteredChecks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <Archive className="w-12 h-12" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      {t.noChecks}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredChecks.map((check) => (
                <tr
                  key={check.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-bg-base transition-colors group text-center"
                >
                  <td className="p-5 text-left">
                    <div className="font-mono text-sm font-black text-accent">
                      {check.checkNumber || "-"}
                    </div>
                  </td>
                  
                                    <td className="p-5">
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
                      <span
                        className={cn(
                          "text-[8px] font-black px-2 py-0.5 rounded uppercase mt-1",
                          check.partyRole === "customer"
                            ? "bg-blue-50 text-blue-500 border border-blue-100"
                            : "bg-orange-50 text-orange-500 border border-orange-100",
                        )}
                      >
                        {check.partyRole === "customer"
                          ? t.checkPartyCustomer
                          : t.checkPartySupplier}
                      </span>
                    </div>
                  </td>
                  <td className="p-5">
                    <div
                      className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-block",
                        check.type === "sale"
                          ? "bg-success/10 text-success"
                          : check.type === "payment"
                            ? "bg-purple-100 text-purple-600"
                            : "bg-danger/10 text-danger",
                      )}
                    >
                      {check.type === "sale"
                        ? t.saleCheck
                        : check.type === "payment"
                          ? t.paymentCheck
                          : t.supplierPayCheck}
                    </div>
                  </td>
                  <td className="p-5">
                    <div
                      className={cn(
                        "inline-block px-3 py-1 rounded-full text-xs font-black whitespace-nowrap",
                        check.partyRole === "customer"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger",
                      )}
                    >
                      {check.partyRole === "customer" ? "+" : "-"}
                      {formatNumber(check.total)} {t.currency}
                    </div>
                  </td>
                                    <td className="p-5">
                    <input 
                      type="date" 
                      disabled={updatingId === check.id}
                      className="bg-transparent border-b-2 border-border-subtle focus:border-accent outline-none text-sm font-bold text-text-main text-center w-full"
                      value={(check as any).checkDueDate ? String((check as any).checkDueDate).split('T')[0] : ''}
                      onChange={(e) => handleDateChange(check.type, check.id, e.target.value)}
                    />
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
                      {(check as any).checkStatus === 'CASHED' ? (language === 'ar' ? 'تم الصرف' : language === 'fr' ? 'Encaissé' : 'Cashed') :
                       (check as any).checkStatus === 'REJECTED' ? (language === 'ar' ? 'مرفوض' : language === 'fr' ? 'Rejeté' : 'Rejected') :
                       (language === 'ar' ? 'في الانتظار' : language === 'fr' ? 'En attente' : 'Pending')}
                    </div>
                  </td>
                  <td className="p-5 text-right relative w-32">
                    <select
                      disabled={updatingId === check.id}
                      onChange={(e) => handleStatusChange(check.type, check.id, e.target.value)}
                      value={(check as any).checkStatus || 'PENDING'}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    >
                      <option value="PENDING">{language === 'ar' ? 'في الانتظار' : language === 'fr' ? 'En attente' : 'Pending'}</option>
                      <option value="CASHED">{language === 'ar' ? 'تم الصرف' : language === 'fr' ? 'Encaissé' : 'Cashed'}</option>
                      <option value="REJECTED">{language === 'ar' ? 'مرفوض' : language === 'fr' ? 'Rejeté' : 'Rejected'}</option>
                    </select>
                    <button className="bg-bg-base hover:bg-border-subtle text-text-main px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-colors relative z-0 w-full">
                      {updatingId === check.id ? '...' : (language === 'ar' ? 'تغيير الحالة' : language === 'fr' ? 'Statut' : 'Status')}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
