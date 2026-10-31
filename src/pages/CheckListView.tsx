import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Archive,
  ChevronDown,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Landmark,
  Wallet,
  Download,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Copy,
  Check,
  Building2,
  X,
  CreditCard,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { api } from "../services/apiService";
import { formatNumber, cn } from "../utils";
import { translations } from "../translations";
import { useStore, useAuthStore } from "../store/useStore";

const getBankBadgeStyle = (bankName: string) => {
  const b = (bankName || "").toUpperCase();
  if (b.includes("ATTIJARI") || b.includes("WAFA")) {
    return "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30";
  }
  if (b.includes("POPULAIRE") || b.includes("BCP") || b.includes("CHAABI")) {
    return "bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/30";
  }
  if (b.includes("BMCE") || b.includes("AFRICA") || b.includes("BOA")) {
    return "bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/30";
  }
  if (b.includes("CIH")) {
    return "bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border-cyan-500/30";
  }
  if (b.includes("AGRICOLE") || b.includes("CAM")) {
    return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
  }
  if (b.includes("SOCIETE") || b.includes("SGMB")) {
    return "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30";
  }
  return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
};

export default function CheckListView() {
  const { checks, fetchData } = useStore();
  const { language } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [checkTypeFilter, setCheckTypeFilter] = useState<"all" | "customer" | "supplier">("all");
  const [showOnlyUrgent, setShowOnlyUrgent] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const t = translations[language] as any;

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<string>("");

  const handleStatusChange = async (type: string, id: string, newStatus: string) => {
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

  const handleAmountChange = async (type: string, id: string, newAmount: number) => {
    setUpdatingId(id);
    try {
      await api.updateCheckAmount(type, id, newAmount);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const checksDueSoon = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return checks.filter((c) => {
      if ((c as any).checkStatus && (c as any).checkStatus !== "PENDING") return false;
      if (!(c as any).checkDueDate) return false;
      const dueDate = new Date((c as any).checkDueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate <= sevenDaysFromNow;
    });
  }, [checks]);

  const urgentTotal = useMemo(() => {
    return checksDueSoon.reduce((acc, c) => acc + (c.total || 0), 0);
  }, [checksDueSoon]);

  const filteredChecks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return checks
      .filter((c) => {
        if (showOnlyUrgent) {
          if ((c as any).checkStatus && (c as any).checkStatus !== "PENDING") return false;
          if (!(c as any).checkDueDate) return false;
          const dueDate = new Date((c as any).checkDueDate);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate > sevenDaysFromNow) return false;
        }
        if (!searchTerm) return checkTypeFilter === "all" || c.partyRole === checkTypeFilter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          (c.checkNumber || "").toLowerCase().includes(searchLower) ||
          (c.checkOwner || "").toLowerCase().includes(searchLower) ||
          (c.partyName || "").toLowerCase().includes(searchLower);
        const matchesType = checkTypeFilter === "all" || c.partyRole === checkTypeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const isAPending = (a as any).checkStatus === "PENDING" || !(a as any).checkStatus;
        const isBPending = (b as any).checkStatus === "PENDING" || !(b as any).checkStatus;
        if (isAPending && !isBPending) return -1;
        if (!isAPending && isBPending) return 1;
        return 0;
      });
  }, [checks, searchTerm, checkTypeFilter, showOnlyUrgent]);

  const pendingChecks = useMemo(
    () => filteredChecks.filter((c) => (c as any).checkStatus === "PENDING" || !(c as any).checkStatus),
    [filteredChecks]
  );
  const pendingTotal = useMemo(
    () => pendingChecks.reduce((acc, c) => acc + c.total, 0),
    [pendingChecks]
  );

  const cashedChecks = useMemo(
    () => filteredChecks.filter((c) => (c as any).checkStatus === "CASHED"),
    [filteredChecks]
  );
  const cashedTotal = useMemo(
    () => cashedChecks.reduce((acc, c) => acc + c.total, 0),
    [cashedChecks]
  );

  const customerChecksCount = useMemo(
    () => checks.filter((c) => c.partyRole === "customer").length,
    [checks]
  );
  const supplierChecksCount = useMemo(
    () => checks.filter((c) => c.partyRole === "supplier").length,
    [checks]
  );

  const exportChecksCSV = () => {
    const headers =
      language === "ar"
        ? ["رقم الشيك", "البنك", "صاحب الشيك", "الطرف", "الدور", "المبلغ", "تاريخ الاستحقاق", "الحالة"]
        : ["N° Cheque", "Banque", "Proprietaire", "Client / Fournisseur", "Role", "Montant (DH)", "Echeance", "Statut"];

    const rows = filteredChecks.map((c) => {
      const bank = c.checkOwner?.includes("|") ? c.checkOwner.split("|")[0].trim() : "-";
      const owner = c.checkOwner?.includes("|") ? c.checkOwner.split("|")[1].trim() : c.checkOwner || "-";
      const dueDate = (c as any).checkDueDate ? new Date((c as any).checkDueDate).toLocaleDateString("fr-FR") : "-";
      return [
        `"${c.checkNumber || ""}"`,
        `"${bank}"`,
        `"${owner}"`,
        `"${c.partyName || ""}"`,
        `"${c.partyRole || ""}"`,
        c.total,
        `"${dueDate}"`,
        `"${(c as any).checkStatus || "PENDING"}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `bordereau_cheques_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-[1780px] mx-auto space-y-6 pb-20 px-1 sm:px-2 md:px-4">
      {/* Top Header */}
      <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4", language === "ar" && "md:flex-row-reverse")}>
        <div className={cn("space-y-1", language === "ar" && "text-right")}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-text-main tracking-tight uppercase">
                {language === "ar" ? "محفظة الشيكات والكمبيالات" : "Portefeuille Chèques & Effets"}
              </h2>
              <p className="text-xs text-text-secondary font-medium">
                {language === "ar"
                  ? "تتبع الشيكات الواردة من الزبناء والشيكات المسلوبة للموردين مع مواعيد الاستحقاق"
                  : "Suivi des encaissements, des traites et des échéances bancaires en temps réel"}
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportChecksCSV}
            className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-card hover:bg-bg-base border border-border-subtle text-text-main flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>{language === "ar" ? "تصدير الجدول" : "Bordereau CSV"}</span>
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Pending */}
        <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {language === "ar" ? "شيكات في الانتظار" : "En Portefeuille (Attente)"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {formatNumber(pendingTotal)}
            </span>
            <span className="text-[10px] font-black text-text-secondary">{t.currency}</span>
          </div>
          <div className="mt-1 text-[10px] text-text-secondary font-medium">
            {pendingChecks.length} chèque(s) non encore débités
          </div>
        </div>

        {/* Card 2: Due Soon / Urgent */}
        <div
          onClick={() => setShowOnlyUrgent(!showOnlyUrgent)}
          className={cn(
            "bg-card p-4 sm:p-5 rounded-2xl border shadow-xs relative overflow-hidden group transition-all cursor-pointer",
            showOnlyUrgent
              ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/20"
              : checksDueSoon.length > 0
                ? "border-red-500/40 hover:bg-red-50/20"
                : "border-border-subtle"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
              {checksDueSoon.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
              {language === "ar" ? "أجل قريب (≤ 7 أيام)" : "Échéances Urgentes (≤7j)"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 font-mono">
              {formatNumber(urgentTotal)}
            </span>
            <span className="text-[10px] font-black text-text-secondary">{t.currency}</span>
          </div>
          <div className="mt-1 text-[10px] text-text-secondary font-medium flex items-center justify-between">
            <span>{checksDueSoon.length} effet(s) à déposer</span>
            <span className="text-accent underline font-bold">{showOnlyUrgent ? "Afficher tous" : "Filtrer"}</span>
          </div>
        </div>

        {/* Card 3: Cashed */}
        <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {language === "ar" ? "شيكات تم صرفها" : "Chèques Encaissés"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatNumber(cashedTotal)}
            </span>
            <span className="text-[10px] font-black text-text-secondary">{t.currency}</span>
          </div>
          <div className="mt-1 text-[10px] text-text-secondary font-medium">
            {cashedChecks.length} chèque(s) validés
          </div>
        </div>

        {/* Card 4: Total Portfolio */}
        <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {language === "ar" ? "إجمالي المحفظة" : "Total Portefeuille"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {formatNumber(pendingTotal + cashedTotal)}
            </span>
            <span className="text-[10px] font-black text-text-secondary">{t.currency}</span>
          </div>
          <div className="mt-1 text-[10px] text-text-secondary font-medium">
            {filteredChecks.length} effets répertoriés
          </div>
        </div>
      </div>

      {/* Urgent Warning Banner if applicable */}
      {checksDueSoon.length > 0 && !showOnlyUrgent && (
        <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-wider">
                {t.checksDueAlertTitle || "Rappel Échéances Chèques & Effets"}
              </h4>
              <p className="text-xs font-bold text-text-secondary mt-0.5">
                {language === "ar"
                  ? `يوجد ${checksDueSoon.length} شيك(ات) متأخرة أو تستحق خلال 7 أيام بمجموع ${formatNumber(urgentTotal)} ${t.currency}`
                  : `${checksDueSoon.length} chèque(s) en retard ou arrivant à échéance d'ici 7 jours (Total : ${formatNumber(urgentTotal)} ${t.currency})`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOnlyUrgent(true)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer shrink-0"
          >
            {language === "ar" ? `تصفية العاجلة (${checksDueSoon.length})` : `Filtrer les Chèques Urgents (${checksDueSoon.length})`}
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-3 sm:p-4 rounded-2xl border border-border-subtle shadow-xs">
        {/* Segmented Type Filters */}
        <div className="flex p-1 bg-bg-base rounded-xl border border-border-subtle w-fit">
          <button
            type="button"
            onClick={() => setCheckTypeFilter("all")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              checkTypeFilter === "all" ? "bg-card text-text-main shadow-xs border border-border-subtle" : "text-text-secondary hover:text-text-main"
            )}
          >
            <span>{t.allChecks}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-bg-base text-text-secondary font-bold">
              {checks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCheckTypeFilter("customer")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              checkTypeFilter === "customer" ? "bg-card text-text-main shadow-xs border border-border-subtle" : "text-text-secondary hover:text-text-main"
            )}
          >
            <span>{t.customerChecks}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-bg-base text-text-secondary font-bold">
              {customerChecksCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCheckTypeFilter("supplier")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              checkTypeFilter === "supplier" ? "bg-card text-text-main shadow-xs border border-border-subtle" : "text-text-secondary hover:text-text-main"
            )}
          >
            <span>{t.supplierChecks}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-bg-base text-text-secondary font-bold">
              {supplierChecksCount}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md group">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-accent transition-colors", language === "ar" ? "right-3.5" : "left-3.5")} />
          <input
            type="text"
            dir={language === "ar" ? "rtl" : "ltr"}
            placeholder={t.searchChecks}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full bg-bg-base/70 hover:bg-bg-base border border-border-subtle rounded-xl py-2.5 text-xs font-bold text-text-main focus:border-accent outline-none transition-all shadow-2xs",
              language === "ar" ? "pr-10 pl-8" : "pl-10 pr-8"
            )}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className={cn("absolute top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main p-1", language === "ar" ? "left-2" : "right-2")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-sm relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-bg-base/60 border-b border-border-subtle text-center">
                <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest text-left">
                  {t.checkNumber}
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  {language === "ar" ? "البنك" : language === "fr" ? "Banque" : "Bank"}
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  {t.checkOwner}
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  {t.checkPartyCustomer} / {t.checkPartySupplier}
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  {t.checkCategory}
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  {t.amount}
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  {language === "ar" ? "تاريخ الاستحقاق" : language === "fr" ? "Échéance" : "Due Date"}
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  {language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status"}
                </th>
                <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest text-right">
                  Actions
                </th>
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
                filteredChecks.map((check) => {
                  const bankName = check.checkOwner?.includes("|") ? check.checkOwner.split("|")[0].trim() : "-";
                  const ownerName = check.checkOwner?.includes("|") ? check.checkOwner.split("|")[1].trim() : check.checkOwner || "-";
                  const bankStyle = getBankBadgeStyle(bankName);
                  const isCustomer = check.partyRole === "customer";
                  const status = (check as any).checkStatus || "PENDING";

                  return (
                    <tr
                      key={check.id}
                      className="border-b border-border-subtle last:border-0 hover:bg-bg-base/40 transition-colors group text-center text-xs"
                    >
                      {/* Check Number */}
                      <td className="p-4 text-left">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-2xs">
                            {check.checkNumber || "-"}
                          </span>
                          {check.checkNumber && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(check.checkNumber, check.id)}
                              className="text-text-secondary hover:text-text-main opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                              title="Copier le numéro"
                            >
                              {copiedId === check.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Bank Badge */}
                      <td className="p-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border shadow-2xs", bankStyle)}>
                          <Landmark className="w-3.5 h-3.5 opacity-80" />
                          <span>{bankName}</span>
                        </span>
                      </td>

                      {/* Check Owner */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-bg-base border border-border-subtle flex items-center justify-center text-[10px] font-black text-text-secondary uppercase">
                            {ownerName.charAt(0)}
                          </div>
                          <span className="font-bold text-text-main uppercase text-xs">
                            {ownerName}
                          </span>
                        </div>
                      </td>

                      {/* Party (Customer / Supplier) */}
                      <td className="p-4">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-text-main uppercase text-xs">
                            {check.partyName || t.walkingCustomer}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-md uppercase mt-1 border",
                              isCustomer
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200 dark:border-blue-800"
                                : "bg-purple-50 dark:bg-purple-950/40 text-purple-600 border-purple-200 dark:border-purple-800"
                            )}
                          >
                            {isCustomer ? t.checkPartyCustomer : t.checkPartySupplier}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span
                          className={cn(
                            "text-[10px] font-black uppercase px-2.5 py-1 rounded-lg inline-block border",
                            check.type === "sale"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                              : check.type === "payment"
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800"
                                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                          )}
                        >
                          {check.type === "sale"
                            ? t.saleCheck
                            : check.type === "payment"
                              ? t.paymentCheck
                              : t.supplierPayCheck}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="p-4">
                        {editingAmountId === check.id ? (
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            disabled={updatingId === check.id}
                            className="bg-card border-2 border-accent rounded-lg px-2 py-1 text-xs font-black text-text-main text-center w-28 outline-none font-mono"
                            value={tempAmount}
                            onChange={(e) => setTempAmount(e.target.value)}
                            onBlur={() => {
                              const val = parseFloat(tempAmount);
                              if (!isNaN(val) && val > 0 && val !== check.total) {
                                handleAmountChange(check.type, check.id, val);
                              }
                              setEditingAmountId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = parseFloat(tempAmount);
                                if (!isNaN(val) && val > 0 && val !== check.total) {
                                  handleAmountChange(check.type, check.id, val);
                                }
                                setEditingAmountId(null);
                              } else if (e.key === "Escape") {
                                setEditingAmountId(null);
                              }
                            }}
                          />
                        ) : (
                          <div
                            onClick={() => {
                              setEditingAmountId(check.id);
                              setTempAmount(String(check.total));
                            }}
                            className={cn(
                              "inline-block px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer hover:opacity-85 transition-opacity font-mono border",
                              isCustomer
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
                                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800"
                            )}
                            title={language === "ar" ? "انقر لتعديل المبلغ" : "Cliquer pour modifier le montant"}
                          >
                            {isCustomer ? "+" : "-"}
                            {formatNumber(check.total)} {t.currency}
                          </div>
                        )}
                      </td>

                      {/* Due Date (Échéance) */}
                      <td className="p-4">
                        {editingDateId === check.id ? (
                          <input
                            type="date"
                            autoFocus
                            onBlur={() => setEditingDateId(null)}
                            disabled={updatingId === check.id}
                            className="bg-card border-2 border-accent rounded-lg px-2 py-1 outline-none text-xs font-bold text-text-main text-center"
                            value={(check as any).checkDueDate ? String((check as any).checkDueDate).split("T")[0] : ""}
                            onChange={(e) => {
                              handleDateChange(check.type, check.id, e.target.value);
                              setEditingDateId(null);
                            }}
                          />
                        ) : (
                          <div
                            className="text-xs font-bold text-text-main cursor-pointer hover:text-accent inline-block text-center"
                            onClick={() => setEditingDateId(check.id)}
                            title={language === "ar" ? "انقر لتعديل التاريخ" : "Cliquer pour modifier la date"}
                          >
                            <span className="font-mono">
                              {(check as any).checkDueDate
                                ? new Date((check as any).checkDueDate).toLocaleDateString(language === "ar" ? "ar-MA" : "fr-FR", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })
                                : language === "ar"
                                  ? "أدخل التاريخ"
                                  : "Non spécifié"}
                            </span>
                          </div>
                        )}

                        {/* Relative Due Badge */}
                        {(() => {
                          if (!(check as any).checkDueDate || status === "CASHED" || status === "REJECTED") return null;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const due = new Date((check as any).checkDueDate);
                          due.setHours(0, 0, 0, 0);
                          const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                          if (diff < 0) {
                            return (
                              <span className="block text-[9px] font-black uppercase text-red-600 bg-red-100 dark:bg-red-950/50 rounded-md px-1.5 py-0.5 mt-1 animate-pulse border border-red-200">
                                {language === "ar" ? `متأخر (${Math.abs(diff)} ي)` : `En retard (${Math.abs(diff)} j)`}
                              </span>
                            );
                          }
                          if (diff === 0) {
                            return (
                              <span className="block text-[9px] font-black uppercase text-amber-700 bg-amber-100 dark:bg-amber-950/50 rounded-md px-1.5 py-0.5 mt-1 border border-amber-300">
                                {language === "ar" ? "اليوم !" : "Aujourd'hui !"}
                              </span>
                            );
                          }
                          if (diff <= 7) {
                            return (
                              <span className="block text-[9px] font-black uppercase text-orange-700 bg-orange-100 dark:bg-orange-950/50 rounded-md px-1.5 py-0.5 mt-1 border border-orange-200">
                                {language === "ar" ? `خلال ${diff} أيام` : `Dans ${diff} j`}
                              </span>
                            );
                          }
                          return null;
                        })()}

                        <div className="text-[10px] text-text-secondary font-mono mt-0.5 opacity-70">
                          {new Date(check.date).toLocaleDateString(language === "ar" ? "ar-MA" : "fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        <div
                          className={cn(
                            "text-[10px] font-black uppercase px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5 border shadow-2xs",
                            status === "CASHED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
                              : status === "REJECTED"
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800"
                          )}
                        >
                          {status === "CASHED" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : status === "REJECTED" ? (
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>
                            {status === "CASHED"
                              ? language === "ar"
                                ? "تم الصرف"
                                : "Encaissé"
                              : status === "REJECTED"
                                ? language === "ar"
                                  ? "مرفوض"
                                  : "Rejeté"
                                : language === "ar"
                                  ? "في الانتظار"
                                  : "En attente"}
                          </span>
                        </div>
                      </td>

                      {/* Actions / Status Change Dropdown */}
                      <td className="p-4 text-right relative w-36">
                        <div className="relative inline-block w-full">
                          <select
                            disabled={updatingId === check.id}
                            onChange={(e) => handleStatusChange(check.type, check.id, e.target.value)}
                            value={status}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                          >
                            <option value="PENDING">{language === "ar" ? "في الانتظار" : "En attente"}</option>
                            <option value="CASHED">{language === "ar" ? "تم الصرف" : "Encaissé"}</option>
                            <option value="REJECTED">{language === "ar" ? "مرفوض" : "Rejeté"}</option>
                          </select>
                          <button
                            type="button"
                            className="bg-bg-base hover:bg-border-subtle border border-border-subtle text-text-main px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-colors relative z-0 w-full shadow-2xs cursor-pointer"
                          >
                            <span>{updatingId === check.id ? "..." : language === "ar" ? "تغيير الحالة" : "Statut"}</span>
                            <ChevronDown className="w-3 h-3 text-text-secondary" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
