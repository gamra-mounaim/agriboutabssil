import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Search,
  Archive,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
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

  const { onRefresh } = useStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (
    type: string,
    id: string,
    newStatus: string,
  ) => {
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

  const pendingTotal = useMemo(
    () =>
      filteredChecks
        .filter((c) => c.checkStatus === "PENDING" || !c.checkStatus)
        .reduce((acc, c) => acc + c.total, 0),
    [filteredChecks],
  );
  const cashedTotal = useMemo(
    () =>
      filteredChecks
        .filter((c) => c.checkStatus === "CASHED")
        .reduce((acc, c) => acc + c.total, 0),
    [filteredChecks],
  );

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
  });

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
                {language === "ar" ? "البنك" : "Bank"}
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
                {language === "ar" ? "تاريخ الاستحقاق" : "Due Date"}
              </th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                {language === "ar" ? "الحالة" : "Status"}
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
                    <div className="text-sm font-bold text-text-main uppercase">
                      {check.checkOwner || "-"}
                    </div>
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
                        "inline-block px-3 py-1 rounded-full text-xs font-black",
                        check.partyRole === "customer"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger",
                      )}
                    >
                      {check.partyRole === "customer" ? "+" : "-"}
                      {formatNumber(check.total)} {t.currency}
                    </div>
                  </td>
                  <td className="p-5 text-right font-mono text-[11px] text-text-secondary">
                    {new Date(check.date).toLocaleString(
                      language === "ar"
                        ? "ar-EG"
                        : language === "fr"
                          ? "fr-FR"
                          : "en-US",
                    )}
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
