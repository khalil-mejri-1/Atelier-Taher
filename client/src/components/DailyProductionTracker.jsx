import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Coins, 
  Package, 
  Users, 
  Clock, 
  RefreshCw, 
  AlertCircle,
  Scissors,
  Search,
  Puzzle,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  Loader2,
  CreditCard,
  History,
  User,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { logsApi, patternsApi, settlementsApi } from '../api';
import { useDialog } from '../context/DialogContext';
import SettlementModal from './SettlementModal';
import SettlementHistoryModal from './SettlementHistoryModal';
import UnpaidSettlementBreakdownModal from './UnpaidSettlementBreakdownModal';

export default function DailyProductionTracker({ onPreviewImage }) {
  const { confirm, showNotice, notify } = useDialog();
  // Format today's date YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedWorkerId, setSelectedWorkerId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState({
    date: getTodayString(),
    totalQuantity: 0,
    totalEarnings: 0,
    activeWorkersCount: 0,
    workersSummary: [],
    allWorkers: [],
    logs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // États pour la gestion du خلاص والمستحقات التراكمية غير الخالصة لجميع الأيام
  const [unpaidSummary, setUnpaidSummary] = useState(null);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleTargetWorker, setSettleTargetWorker] = useState(null);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [breakdownTargetWorker, setBreakdownTargetWorker] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyWorkerId, setHistoryWorkerId] = useState('all');
  const [historyWorkerName, setHistoryWorkerName] = useState('');
  const [workersListExpanded, setWorkersListExpanded] = useState(false);

  const loadUnpaidSummary = async () => {
    setLoadingUnpaid(true);
    try {
      const res = await settlementsApi.getUnpaidSummary(selectedWorkerId);
      setUnpaidSummary(res);
    } catch (err) {
      console.error('Erreur chargement récapitulatif impayés :', err);
    } finally {
      setLoadingUnpaid(false);
    }
  };

  const loadDailyReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await logsApi.getDailyProduction(selectedDate, selectedWorkerId);
      setData(res);
    } catch (err) {
      console.error('Erreur chargement rapport journalier :', err);
      setError('Impossible de charger les données pour cette date');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyReport();
    loadUnpaidSummary();
  }, [selectedDate, selectedWorkerId]);

  const refreshAllData = () => {
    loadDailyReport();
    loadUnpaidSummary();
  };

  // Navigate Days (-1, +1, or Today)
  const shiftDate = (days) => {
    const parts = selectedDate.split('-');
    const current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    current.setDate(current.getDate() + days);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Human readable date labels in French and Arabic
  const getFormattedDateLabels = (dateStr) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      
      const fr = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const ar = d.toLocaleDateString('ar-TN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return { fr, ar };
    } catch {
      return { fr: dateStr, ar: dateStr };
    }
  };

  const isToday = selectedDate === getTodayString();
  const dateLabels = getFormattedDateLabels(selectedDate);

  // Label for the day navigation button
  const getDayButtonLabel = (dateStr) => {
    if (dateStr === getTodayString()) {
      return "Aujourd'hui / اليوم";
    }
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const fr = d.toLocaleDateString('fr-FR', { weekday: 'long' });
      const ar = d.toLocaleDateString('ar-TN', { weekday: 'long' });
      const frCapitalized = fr.charAt(0).toUpperCase() + fr.slice(1);
      return `${frCapitalized} / ${ar}`;
    } catch {
      return dateStr;
    }
  };

  const dayButtonLabel = getDayButtonLabel(selectedDate);

  // Filter logs by search input
  const filteredLogs = (data.logs || []).filter((log) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const pName = (log.pattern_name || '').toLowerCase();
    const pSku = (log.pattern_sku || '').toLowerCase();
    const wName = (log.user_name || '').toLowerCase();
    return pName.includes(term) || pSku.includes(term) || wName.includes(term);
  });

  // Delete/Cancel a production log
  const handleDeleteLog = async (log) => {
    if (deletingId) return;
    const patternName = log.pattern_name || log.pattern_id?.name_fr || 'ce patron';
    const workerName = log.user_name || 'cet ouvrier';
    const qty = log.quantity_changed || 1;
    const amount = typeof log.total_price === 'number' ? log.total_price : 0;

    const confirmed = await confirm({
      title: "Annuler cette opération de production",
      titleAr: "تأكيد حذف وإلغاء هذه العملية",
      message: `Voulez-vous vraiment annuler l'impression de "${patternName}" par ${workerName} ?`,
      messageAr: `الموديل : ${patternName} • العامل : ${workerName} • الكمية : ${qty} قطعة • سيتم خصم -${amount.toFixed(3)} DT واسترجاع المخزون.`,
      type: "danger",
      confirmText: "Oui, supprimer / نعم، احذف",
      cancelText: "Annuler / تراجع"
    });

    if (!confirmed) return;

    setDeletingId(log._id);
    try {
      await patternsApi.undoProduce(log._id);
      notify.success(`Impression de "${patternName}" supprimée avec succès`);
      await loadDailyReport();
    } catch (err) {
      showNotice({
        title: "Erreur",
        titleAr: "خطأ",
        message: err.message || 'Erreur lors de la suppression de l’impression',
        type: "error"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteAllDailyLogs = async () => {
    if (isDeletingAll || deletingId || filteredLogs.length === 0) return;
    const count = filteredLogs.length;

    const confirmed = await confirm({
      title: "Supprimer toutes les opérations",
      titleAr: "تأكيد حذف جميع عمليات اليوم",
      message: `Voulez-vous vraiment supprimer toutes les ${count} opérations du ${selectedDate} ? Le stock sera automatiquement réajusté.`,
      messageAr: `هل أنت متأكد من حذف جميع العمليات (${count} عملية) لليوم؟ سيتم استرجاع المخزون وتعديل الأرصدة تلقائياً.`,
      type: "danger",
      confirmText: `Oui, tout supprimer (${count}) / نعم، احذف الكل`,
      cancelText: "Annuler / تراجع",
    });

    if (!confirmed) return;

    setIsDeletingAll(true);
    try {
      const logIds = filteredLogs.map((l) => l._id);
      try {
        await logsApi.bulkDeleteLogs(logIds);
      } catch (e) {
        for (const l of filteredLogs) {
          await patternsApi.undoProduce(l._id).catch(() => {});
        }
      }
      notify.success(`Toutes les (${count}) opérations ont été supprimées`);
      await loadDailyReport();
    } catch (err) {
      console.error(err);
      notify.error(err.message || 'Échec de la suppression groupée');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-3.5 text-left">
      {/* 1. TOP HEADER & DATE CONTROL BAR */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          
          {/* Date Selector & Jump to Today */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-black rounded-lg transition-colors cursor-pointer"
                title="Jour précédent (-1)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSelectedDate(getTodayString())}
                title={isToday ? "Date d'aujourd'hui" : "Cliquer pour revenir à aujourd'hui / الرجوع إلى اليوم"}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isToday 
                    ? 'bg-[#0F172A] text-white shadow-2xs' 
                    : 'bg-white text-slate-900 border border-slate-200/80 shadow-2xs hover:bg-slate-50'
                }`}
              >
                {dayButtonLabel}
              </button>

              <button
                onClick={() => shiftDate(1)}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-black rounded-lg transition-colors cursor-pointer"
                title="Jour suivant (+1)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick reset to Today pill when another day is active */}
            {!isToday && (
              <button
                onClick={() => setSelectedDate(getTodayString())}
                className="px-2.5 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Revenir à aujourd'hui / الرجوع إلى اليوم"
              >
                Aujourd'hui / اليوم ↩
              </button>
            )}

            {/* Date Picker Input */}
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-semibold bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-hidden focus:border-slate-800 cursor-pointer shadow-2xs"
              />
            </div>

            {/* Clear Human-Readable Date Banner */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-xs font-bold text-slate-900 capitalize">
                📅 {dateLabels.fr}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-medium text-slate-600 font-arabic" dir="rtl">
                {dateLabels.ar}
              </span>
            </div>
          </div>

          {/* Worker Filter, Search & Refresh */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search in day's table */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher produit, ouvrier..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-hidden focus:border-slate-800 shadow-2xs placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter by Worker */}
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F9FA] focus:outline-hidden focus:border-slate-800 font-semibold text-slate-700 shadow-2xs cursor-pointer"
            >
              <option value="all">👷 Tous les ouvriers (جميع العمال)</option>
              {(data.allWorkers || []).map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              onClick={loadDailyReport}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Actualiser les données"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>

        {/* 2. COMPACT DAILY SUMMARY STATS BAR */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Stat 1: Total Pieces */}
          <div className="bg-[#F8F9FA] p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/50">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Pièces Produites / الكمية
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {data.totalQuantity || 0}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">pièces</span>
              </div>
            </div>
          </div>

          {/* Stat 2: Total Earnings */}
          <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300/50">
              <Coins className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Gains Ouvriers / الأرباح
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-base font-extrabold text-emerald-700">
                  {(data.totalEarnings || 0).toFixed(3)}
                </span>
                <span className="text-[11px] font-bold text-emerald-600">DT</span>
              </div>
            </div>
          </div>

          {/* Stat 3: Active Workers */}
          <div className="bg-[#F8F9FA] p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Ouvriers Actifs / العمال
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {data.activeWorkersCount || 0}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">actif(s)</span>
              </div>
            </div>
          </div>

          {/* Stat 4: Total Operations */}
          <div 
            onClick={() => document.getElementById('daily-operations-table')?.scrollIntoView({ behavior: 'smooth' })}
            role="button"
            tabIndex={0}
            title="Cliquer pour défiler vers le tableau des opérations / اضغط للنزول لجدول العمليات"
            className="bg-[#F8F9FA] hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-600 uppercase tracking-wider block">
                Opérations / العمليات ↗
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {data.logs?.length || 0}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">enregistrements</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 CUMULATIVE UNPAID DUES SECTION (التكلفة الإجمالية لجميع الأيام التي لم يتم خلاص العامل فيها) */}
      {selectedWorkerId === 'all' ? (
        <div className="bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 rounded-2xl p-4 border-2 border-emerald-500/20 shadow-xs space-y-3">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
                <CreditCard className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                    المستحقات التراكمية غير الخالصة للعمال (جميع الأيام)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    غير مدفوع / Solde Dû
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-arabic" dir="rtl">
                  التكلفة الإجمالية لجميع أيام العمل السابقة التي لم يتسلّم فيها العمال أجرهم بعد (تراكمي)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setHistoryWorkerId('all');
                  setHistoryWorkerName('Tous les ouvriers (جميع العمال)');
                  setHistoryModalOpen(true);
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>سجل خلاص العمال (Historique)</span>
              </button>

              {(unpaidSummary?.workers?.filter((w) => w.total_unpaid_amount > 0 || (w.balance && w.balance > 0)) || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => setWorkersListExpanded((prev) => !prev)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <span>العمال المستحقون ({((unpaidSummary?.workers?.filter((w) => w.total_unpaid_amount > 0 || (w.balance && w.balance > 0))) || []).length})</span>
                  {workersListExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* 3 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Metric 1: Grand Total Cumulative Unpaid */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                إجمالي التكلفة غير الخالصة (جميع الأيام)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-black text-emerald-700">
                  {(unpaidSummary?.grand_total_unpaid || 0).toFixed(3)}
                </span>
                <span className="text-sm font-bold text-emerald-600">DT</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                المجموع التراكمي الفعلي المطلوب تسويته للعمال
              </span>
            </div>

            {/* Metric 2: Today's single day comparison */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                مكسب اليوم المحدد فقط ({dateLabels.fr})
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-extrabold text-slate-800">
                  {(data.totalEarnings || 0).toFixed(3)}
                </span>
                <span className="text-xs font-bold text-slate-500">DT</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                إنتاج وتكلفة تاريخ {selectedDate} فقط
              </span>
            </div>

            {/* Metric 3: Active unpaid workers count */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                العمال ذوو المستحقات والقطع
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xl font-extrabold text-slate-900">
                  {((unpaidSummary?.workers?.filter((w) => w.total_unpaid_amount > 0 || (w.balance && w.balance > 0))) || []).length}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  عامل ينتظر الخلاص ({unpaidSummary?.grand_total_pieces || 0} قطعة)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {((unpaidSummary?.workers?.filter((w) => w.total_unpaid_amount > 0 || (w.balance && w.balance > 0))) || []).length === 0
                  ? '✅ جميع الحسابات مسواة بالكامل'
                  : 'يمكنك خلاص أي عامل بضغطة زر'}
              </span>
            </div>
          </div>

          {/* Expandable Workers Unpaid List */}
          {workersListExpanded && (
            <div className="pt-2 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-200">
              <span className="text-[11px] font-bold text-slate-700 block">
                تفاصيل المستحقات لكل عامل على حدة :
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {((unpaidSummary?.workers?.filter((w) => w.total_unpaid_amount > 0 || (w.balance && w.balance > 0))) || []).map((w) => (
                  <div
                    key={w.worker_id}
                    className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 block truncate">
                          {w.worker_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          @{w.username}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-extrabold text-sm text-emerald-700 block">
                          {(w.total_unpaid_amount || w.balance || 0).toFixed(3)} DT
                        </span>
                        <span className="text-[9.5px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {w.unpaid_days_count} يوم عمل ({w.unpaid_pieces_count} pcs)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setBreakdownTargetWorker(w);
                          setBreakdownModalOpen(true);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer"
                      >
                        تفاصيل الأيام ({w.unpaid_days_count})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSettleTargetWorker(w);
                          setSettleModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>خلاص العامل</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* INDIVIDUAL WORKER UNPAID DOSSIER */
        <div className="bg-gradient-to-br from-white via-emerald-50/20 to-slate-50 rounded-2xl p-4 border-2 border-emerald-600/30 shadow-xs space-y-3.5">
          {/* Top Worker Profile & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <User className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.worker_name ||
                      data.allWorkers?.find((w) => w._id === selectedWorkerId)?.name ||
                      'العامل المحدد'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                    @{unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.username ||
                      data.allWorkers?.find((w) => w._id === selectedWorkerId)?.username}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    ملف المستحقات الكامل
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-arabic" dir="rtl">
                  متابعة التكلفة الإجمالية لجميع الأيام غير الخالصة لهذا العامل
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setHistoryWorkerId(selectedWorkerId);
                  setHistoryWorkerName(
                    unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.worker_name ||
                      data.allWorkers?.find((w) => w._id === selectedWorkerId)?.name ||
                      ''
                  );
                  setHistoryModalOpen(true);
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>أرشيف الخلاص السابق</span>
              </button>

              {(unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.unpaid_days_count || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const target = unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId);
                    setBreakdownTargetWorker(target);
                    setBreakdownModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>تفاصيل الأيام غير الخالصة ({unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.unpaid_days_count || 0})</span>
                </button>
              )}

              {(((unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.total_unpaid_amount ??
                unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.balance) ||
                0) > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    const target = unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId);
                    setSettleTargetWorker(
                      target || {
                        worker_id: selectedWorkerId,
                        name: data.allWorkers?.find((w) => w._id === selectedWorkerId)?.name,
                        balance: data.allWorkers?.find((w) => w._id === selectedWorkerId)?.balance || 0,
                      }
                    );
                    setSettleModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    خلاص العامل الآن (
                    {(
                      (unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.total_unpaid_amount ??
                        unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.balance) ||
                      0
                    ).toFixed(3)}{' '}
                    DT)
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Worker Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Box 1: Total Cumulative Unpaid Amount */}
            <div className="bg-white p-3.5 rounded-xl border-2 border-emerald-300/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  التكلفة الإجمالية لجميع الأيام غير الخالصة
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="my-1">
                <span className="font-mono text-2xl font-black text-emerald-700">
                  {(
                    (unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.total_unpaid_amount ??
                      unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.balance) ||
                    0
                  ).toFixed(3)}
                </span>
                <span className="text-sm font-bold text-emerald-600 ml-1">DT</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.unpaid_days_count || 0} يوم عمل ينتظر الدفع •{' '}
                {unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.unpaid_pieces_count || 0} قطعة منجزة
              </span>
            </div>

            {/* Box 2: Selected Day Earnings */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                مكسب اليوم المحدد فقط ({dateLabels.fr})
              </span>
              <div className="my-1">
                <span className="font-mono text-xl font-extrabold text-slate-800">
                  {(data.totalEarnings || 0).toFixed(3)}
                </span>
                <span className="text-xs font-bold text-slate-500 ml-1">DT</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {data.totalQuantity || 0} قطعة منتجة في تاريخ {selectedDate}
              </span>
            </div>

            {/* Box 3: Last Settlement Date */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                آخر عملية خلاص مسجلة
              </span>
              <div className="my-1">
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.last_settled_at
                    ? new Date(
                        unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.last_settled_at
                      ).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'لم يتم تسجيل خلاص بعد'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {(unpaidSummary?.workers?.find((w) => (w.worker_id || w._id) === selectedWorkerId)?.total_unpaid_amount || 0) === 0
                  ? '✅ الحساب خالص بالكامل'
                  : '⚠️ هناك مستحقات تنتظر الخلاص'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN TABLE OF ADDED PRODUCTS */}
      <div id="daily-operations-table" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        
        {/* Table Title Bar */}
        <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Produits ajoutés le {dateLabels.fr}
              </h3>
              <p className="text-[10px] text-slate-500 font-arabic" dir="rtl">
                جدول المنتجات المضافة وتفاصيل إنتاج العمال لهذا اليوم
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs font-mono">
              {filteredLogs.length} ligne{filteredLogs.length !== 1 ? 's' : ''}
            </span>
            {filteredLogs.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllDailyLogs}
                disabled={isDeletingAll || deletingId !== null}
                className="px-2.5 py-1 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                title="Supprimer toutes les opérations de cette liste / حذف الكل"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3" />
                    <span>حذف الكل ({filteredLogs.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            <span>Chargement des ajouts du {selectedDate}...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-xs bg-red-50">
            <AlertCircle className="w-6 h-6 mx-auto mb-1 text-red-500" />
            <span>{error}</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-slate-800 mb-1">
              Aucun produit enregistré pour cette date
            </h4>
            <p className="text-xs text-slate-500 font-arabic mb-4" dir="rtl">
              لم يقم أي عامل بإضافة منتجات في تاريخ {selectedDate}
            </p>
            <button
              onClick={() => setSelectedDate(getTodayString())}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              Afficher aujourd'hui (عرض اليوم الحالي)
            </button>
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider select-none">
                  <th className="py-3 px-3 text-center w-16">Photo</th>
                  <th className="py-3 px-4 min-w-[200px]">Modèle / Nom du produit</th>
                  <th className="py-3 px-4 min-w-[170px]">Ouvrier</th>
                  <th className="py-3 px-3 text-center w-24">Quantité</th>
                  <th className="py-3 px-3 text-center w-28">Tarif / Pièce</th>
                  <th className="py-3 px-4 text-center min-w-[130px]">Montant Total (Gains)</th>
                  <th className="py-3 px-4 text-center w-28">Heure d'ajout</th>
                  <th className="py-3 px-3 text-center w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const patternData = log.pattern_id || {};
                  const imgUrl = patternData.image_url;
                  
                  const timeStr = new Date(log.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  const unitRate = typeof log.unit_price === 'number'
                    ? log.unit_price
                    : (patternData.price || 0);

                  const totalGain = typeof log.total_price === 'number'
                    ? log.total_price
                    : ((log.quantity_changed || 0) * unitRate);

                  const hasParts = patternData.has_parts || (Array.isArray(patternData.parts) && patternData.parts.length > 0);

                  return (
                    <tr 
                      key={log._id} 
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* 1. PHOTO DU PRODUIT */}
                      <td className="py-3 px-3 text-center align-middle">
                        {imgUrl ? (
                          <div 
                            className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 shadow-2xs relative mx-auto group-hover:border-slate-400 transition-all cursor-pointer bg-white"
                            onClick={() => onPreviewImage && onPreviewImage({
                              url: imgUrl,
                              title: log.pattern_name,
                              sku: log.pattern_sku
                            })}
                            title="Cliquer pour agrandir la photo"
                          >
                            <img
                              src={imgUrl}
                              alt={log.pattern_name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Patron';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                            <Scissors className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                      </td>

                      {/* 2. NOM DU PRODUIT & SKU */}
                      <td className="py-3 px-4 align-middle">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                          {patternData.name_fr || log.pattern_name}
                        </div>
                        {patternData.name_ar && (
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5" dir="rtl">
                            {patternData.name_ar}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {log.pattern_sku || 'PAT'}
                          </span>
                          {patternData.category && (
                            <span className="text-[9px] font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200/60">
                              {patternData.category}
                            </span>
                          )}
                          {hasParts && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                              <Puzzle className="w-2.5 h-2.5 text-indigo-500" />
                              <span>{patternData.parts?.length || 2} parties</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. NOM DE L'OUVRIER */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {(log.user_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {log.user_name}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {log.user_role === 'admin' ? 'Direction' : 'Opérateur'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. QUANTITÉ AJOUTÉE */}
                      <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                          +{log.quantity_changed}
                        </span>
                      </td>

                      {/* 5. TARIF UNITAIRE */}
                      <td className="py-3 px-3 text-center align-middle whitespace-nowrap font-mono text-xs text-slate-600 font-semibold">
                        {unitRate.toFixed(3)} DT
                      </td>

                      {/* 6. MONTANT TOTAL (GAINS) */}
                      <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                        <span className="font-mono text-xs sm:text-sm font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 inline-block shadow-2xs">
                          +{totalGain.toFixed(3)} DT
                        </span>
                      </td>

                      {/* 7. HEURE DE L'AJOUT */}
                      <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-600 font-medium bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/80">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{timeStr}</span>
                        </span>
                      </td>

                      {/* 8. ACTION / SUPPRIMER */}
                      <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log)}
                          disabled={deletingId === log._id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Supprimer cette impression (حذف وإلغاء هذه العملية)"
                        >
                          {deletingId === log._id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* TABLE SUMMARY FOOTER */}
              <tfoot>
                <tr className="bg-slate-100/90 border-t-2 border-slate-200 font-bold text-xs text-slate-900">
                  <td colSpan={3} className="py-3 px-4">
                    <span>Total pour la sélection ({filteredLogs.length} ajouts) :</span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-extrabold text-blue-700">
                    +{filteredLogs.reduce((acc, l) => acc + (l.quantity_changed || 0), 0)} pcs
                  </td>
                  <td className="py-3 px-3 text-center text-slate-400">-</td>
                  <td className="py-3 px-4 text-center font-mono font-extrabold text-emerald-700 text-sm">
                    +{filteredLogs.reduce((acc, l) => {
                      const rate = typeof l.unit_price === 'number' ? l.unit_price : (l.pattern_id?.price || 0);
                      const gain = typeof l.total_price === 'number' ? l.total_price : ((l.quantity_changed || 0) * rate);
                      return acc + gain;
                    }, 0).toFixed(3)} DT
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400">-</td>
                  <td className="py-3 px-3 text-center text-slate-400">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      </div>

      {/* MODALS POUR LE RÈGLEMENT & HISTORIQUE DES IMPAYÉS */}
      <SettlementModal
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        worker={settleTargetWorker}
        onSettled={() => {
          notify.success('Règlement enregistré avec succès / تم تسجيل الخلاص بنجاح');
          refreshAllData();
        }}
      />

      <SettlementHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        workerId={historyWorkerId}
        workerName={historyWorkerName}
        onChanged={refreshAllData}
      />

      <UnpaidSettlementBreakdownModal
        isOpen={breakdownModalOpen}
        onClose={() => setBreakdownModalOpen(false)}
        worker={breakdownTargetWorker}
        onOpenSettleModal={(w) => {
          setSettleTargetWorker(w);
          setSettleModalOpen(true);
        }}
      />
    </div>
  );
}
