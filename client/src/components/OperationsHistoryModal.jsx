import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Trash2,
  Scissors,
  Package,
  Clock,
  Search,
  AlertCircle,
  Loader2,
  Calendar,
  Filter,
  Layers,
  User as UserIcon,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  PackageCheck,
  CheckCircle2
} from 'lucide-react';
import { logsApi, patternsApi } from '../api';
import { useDialog } from '../context/DialogContext';

export default function OperationsHistoryModal({
  isOpen,
  onClose,
  pattern = null,
  initialFilter = 'all', // 'all' | 'production' | 'order'
  initialToday = false,
  onOperationDeleted,
  onPreviewImage,
}) {
  const { confirm, notify } = useDialog();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [activeTab, setActiveTab] = useState(initialFilter); // 'all' | 'production' | 'order'
  const [todayOnly, setTodayOnly] = useState(initialToday);
  const [selectedPattern, setSelectedPattern] = useState(pattern);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const requestIdRef = useRef(0);

  // Synchroniser l'état quand les props changent à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialFilter || 'all');
      setTodayOnly(Boolean(initialToday));
      setSelectedPattern(pattern || null);
      setSearch('');
      setError('');
    }
  }, [isOpen, initialFilter, initialToday, pattern]);

  // Charger les opérations depuis l'API avec protection anti-concurrence (race condition guard)
  const fetchOperations = async () => {
    if (!isOpen) return;
    const currentReqId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError('');

      const params = {
        limit: 150,
      };

      if (activeTab === 'production') {
        params.action_type = 'production';
      } else if (activeTab === 'order') {
        params.action_type = 'order';
      }

      if (todayOnly) {
        params.today = true;
      }

      if (selectedPattern?._id || selectedPattern?.id) {
        params.pattern_id = selectedPattern._id || selectedPattern.id;
      }

      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await logsApi.getLogs(params);
      // Ignorer si une requête plus récente a déjà été lancée
      if (currentReqId !== requestIdRef.current) return;
      setLogs(res.logs || []);
    } catch (err) {
      if (currentReqId !== requestIdRef.current) return;
      console.error('Erreur chargement opérations :', err);
      setError('Impossible de charger les opérations.');
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOperations();
    }
  }, [isOpen, activeTab, todayOnly, selectedPattern, search]);

  // Filtrage strict côté client pour garantir la cohérence d'affichage selon l'onglet actif
  const displayedLogs = useMemo(() => {
    return logs.filter((log) => {
      if (activeTab === 'production') {
        return (
          log.action_type === 'production_increment' ||
          log.action_type === 'production_custom'
        );
      }
      if (activeTab === 'order') {
        return log.action_type === 'order_deduct';
      }
      return true;
    });
  }, [logs, activeTab]);

  // Calcul des totaux de la liste courante affichée
  const { totalProduced, totalDeducted, totalLogsCount } = useMemo(() => {
    let prod = 0;
    let ded = 0;
    displayedLogs.forEach((log) => {
      const qty = Math.abs(log.quantity_changed || 1);
      if (log.action_type === 'order_deduct') {
        ded += qty;
      } else if (
        log.action_type === 'production_increment' ||
        log.action_type === 'production_custom'
      ) {
        prod += qty;
      }
    });
    return {
      totalProduced: prod,
      totalDeducted: ded,
      totalLogsCount: displayedLogs.length,
    };
  }, [displayedLogs]);

  // Action de suppression / annulation d'une opération
  const handleDeleteOperation = async (log) => {
    if (deletingId) return;

    const patternName =
      log.pattern_name ||
      log.pattern_id?.name_fr ||
      log.pattern_id?.name_ar ||
      'ce modèle';
    const rawQty = log.quantity_changed || 1;
    const qty = Math.abs(rawQty);
    const isOrder = log.action_type === 'order_deduct';
    const amount = typeof log.total_price === 'number' ? Math.abs(log.total_price) : 0;

    const confirmed = await confirm({
      title: isOrder ? 'Annuler cette expédition' : 'Supprimer cette production',
      titleAr: isOrder ? 'تأكيد إلغاء خروج هذه الطلبية' : 'تأكيد حذف وإلغاء هذه العملية',
      message: isOrder
        ? `Voulez-vous vraiment annuler cette expédition de "${patternName}" (${qty} pièce(s)) ? Le stock sera réaugmenté de +${qty}.`
        : `Voulez-vous vraiment supprimer la production de "${patternName}" (${qty} pièce(s)) ? Le stock sera diminué de -${qty}${amount > 0 ? ` et -${amount.toFixed(3)} DT seront déduits de l'ouvrier` : ''}.`,
      messageAr: isOrder
        ? `هل تريد فعلاً إلغاء هذه الطلبية وإرجاع (${qty}) قطعة إلى المخزون؟`
        : `هل أنت متأكد من حذف هذه العملية؟ سيتم خصم (${qty}) قطعة من المخزون${amount > 0 ? ` وتعديل حساب العامل (-${amount.toFixed(3)} DT)` : ''}.`,
      type: 'danger',
      confirmText: 'Oui, supprimer / نعم، احذف',
      cancelText: 'Annuler / تراجع',
    });

    if (!confirmed) return;

    setDeletingId(log._id);
    try {
      // Appel de l'API de suppression / annulation avec fallback
      let res;
      try {
        res = await patternsApi.undoProduce(log._id);
      } catch (firstErr) {
        // Fallback vers logsApi.deleteLog
        res = await logsApi.deleteLog(log._id);
      }

      // Mise à jour immédiate de l'état local
      setLogs((prev) => prev.filter((item) => item._id !== log._id));

      const successMsg = res?.message || (
        isOrder
          ? `Expédition annulée avec succès (+${qty} remis en stock)`
          : `Opération supprimée avec succès (-${qty} pièces)`
      );
      notify.success(successMsg);

      // Notification au composant parent pour rafraîchir les cartes et le stock
      if (onOperationDeleted) {
        onOperationDeleted(log);
      }
    } catch (err) {
      console.error('Erreur suppression opération :', err);
      notify.error(err.message || 'Échec de la suppression de l’opération');
    } finally {
      setDeletingId(null);
    }
  };

  // Suppression groupée de toutes les opérations affichées (حذف الكل)
  const handleDeleteAllOperations = async () => {
    if (isDeletingAll || deletingId !== null || displayedLogs.length === 0) return;

    const count = displayedLogs.length;
    const isOrder = activeTab === 'order';
    const isProd = activeTab === 'production';

    const confirmed = await confirm({
      title: isOrder
        ? "Supprimer toutes les expéditions"
        : isProd
        ? "Supprimer toutes les productions"
        : "Supprimer toutes les opérations",
      titleAr: isOrder
        ? `تأكيد حذف جميع عمليات الشحن المعروضة (${count})`
        : isProd
        ? `تأكيد حذف جميع عمليات الإنتاج المعروضة (${count})`
        : `تأكيد حذف جميع العمليات المعروضة (${count})`,
      message: `Voulez-vous vraiment supprimer et annuler TOUTES les ${count} opérations affichées ? Le stock sera automatiquement réajusté pour chacune.`,
      messageAr: `هل أنت متأكد من حذف جميع العمليات المعروضة (${count} عملية)؟ سيتم استرجاع المخزون وتعديل الأرصدة تلقائياً لكل عملية.`,
      type: "danger",
      confirmText: `Oui, tout supprimer (${count}) / نعم، احذف الكل`,
      cancelText: "Annuler / تراجع",
    });

    if (!confirmed) return;

    setIsDeletingAll(true);
    try {
      const logIds = displayedLogs.map((l) => l._id);
      try {
        await logsApi.bulkDeleteLogs(logIds);
      } catch (bulkErr) {
        // Fallback séquentiel si le endpoint bulk rencontre un imprévu
        for (const log of displayedLogs) {
          try {
            await patternsApi.undoProduce(log._id);
          } catch (e) {
            await logsApi.deleteLog(log._id).catch(() => {});
          }
        }
      }

      setLogs((prev) => prev.filter((l) => !logIds.includes(l._id)));
      notify.success(`Toutes les (${count}) opérations ont été supprimées avec succès`);

      if (onOperationDeleted) {
        onOperationDeleted(null);
      }
    } catch (err) {
      console.error('Erreur suppression totale :', err);
      notify.error(err.message || 'Échec de la suppression groupée des opérations');
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Formattage de la date et de l'heure
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      const isToday =
        d.toDateString() === new Date().toDateString();
      const timeStr = d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (isToday) {
        return `Aujourd'hui à ${timeStr}`;
      }
      return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} à ${timeStr}`;
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* 1. MODAL HEADER */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeTab === 'production'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : activeTab === 'order'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-slate-100 text-slate-800 border border-slate-200'
            }`}>
              {activeTab === 'production' ? (
                <TrendingUp className="w-5 h-5" />
              ) : activeTab === 'order' ? (
                <PackageCheck className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A] truncate">
                  {selectedPattern
                    ? `Opérations : ${selectedPattern.name_fr || selectedPattern.name_ar}`
                    : activeTab === 'production'
                    ? "Opérations de Production"
                    : activeTab === 'order'
                    ? "Opérations d'Expédition"
                    : "Historique des Opérations"}
                </h3>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                  {totalLogsCount}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5" dir="rtl">
                سجل العمليات • يمكنك حذف أو إلغاء أي عملية لاسترجاع المخزون
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. PATTERN CONTEXT BANNER (if filtering by a specific pattern) */}
        {selectedPattern && (
          <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {selectedPattern.image_url ? (
                <img
                  src={selectedPattern.image_url}
                  alt={selectedPattern.name_fr}
                  onClick={() =>
                    onPreviewImage &&
                    onPreviewImage({
                      url: selectedPattern.image_url,
                      title: selectedPattern.name_fr || selectedPattern.name_ar,
                      sku: selectedPattern.sku,
                    })
                  }
                  className="w-9 h-9 rounded-lg object-cover border border-slate-200 cursor-pointer shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 shrink-0 text-xs font-bold">
                  {selectedPattern.sku || 'PAT'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {selectedPattern.name_fr || selectedPattern.name_ar}
                  </span>
                  <span className="font-mono text-[10px] bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-600 font-bold">
                    {selectedPattern.sku}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>Stock : <strong className="text-slate-800">{selectedPattern.current_stock || 0} pcs</strong></span>
                  <span>•</span>
                  <span>Prix : <strong className="text-emerald-700">{parseFloat(selectedPattern.price || 0).toFixed(3)} DT</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedPattern(null)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              Tous les patrons / عرض الكل
            </button>
          </div>
        )}

        {/* 3. TOOLBAR: TABS + DATE FILTER + SEARCH */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-white space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Toutes / الكل
              </button>
              <button
                onClick={() => setActiveTab('production')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'production'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Scissors className="w-3 h-3" />
                <span>Production</span>
              </button>
              <button
                onClick={() => setActiveTab('order')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'order'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Package className="w-3 h-3" />
                <span>Expéditions</span>
              </button>
            </div>

            {/* Date filter pill */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTodayOnly(!todayOnly)}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  todayOnly
                    ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{todayOnly ? "Aujourd'hui / اليوم" : "Tout l'historique / كل الأيام"}</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par ouvrier, patron, note... / ابحث باسم العامل أو الباترون..."
              className="w-full pl-9 pr-9 py-1.5 sm:py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Summary Counts & Tout Supprimer (حذف الكل) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
              <span className="font-semibold text-slate-700">{totalLogsCount} opérations</span>
              {activeTab !== 'order' && totalProduced > 0 && (
                <>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    +{totalProduced} pièces produites
                  </span>
                </>
              )}
              {activeTab !== 'production' && totalDeducted > 0 && (
                <>
                  <span>•</span>
                  <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    -{totalDeducted} expédiées
                  </span>
                </>
              )}
            </div>

            {displayedLogs.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllOperations}
                disabled={isDeletingAll || deletingId !== null}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
                title="Supprimer toutes les opérations affichées / حذف كل العمليات المعروضة"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Suppression de tout...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Tout supprimer / حذف الكل ({displayedLogs.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 4. OPERATIONS LIST */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
              <span className="text-xs font-semibold">Chargement des opérations... / جاري جلب العمليات</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : displayedLogs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700">Aucune opération trouvée</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                لا توجد أي عملية مسجلة مطابقة لهذا البحث أو التاريخ
              </p>
            </div>
          ) : (
            displayedLogs.map((log) => {
              const isOrder = log.action_type === 'order_deduct';
              const rawQty = log.quantity_changed || 1;
              const qty = Math.abs(rawQty);
              const patImg = log.pattern_id?.image_url;
              const patName =
                log.pattern_name ||
                log.pattern_id?.name_fr ||
                log.pattern_id?.name_ar ||
                'Modèle';
              const patSku = log.pattern_sku || log.pattern_id?.sku || '';
              const isDeleting = deletingId === log._id;

              return (
                <div
                  key={log._id}
                  className="bg-white hover:bg-slate-50/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Info */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Pattern Thumbnail */}
                    {patImg ? (
                      <img
                        src={patImg}
                        alt={patName}
                        onClick={() =>
                          onPreviewImage &&
                          onPreviewImage({
                            url: patImg,
                            title: patName,
                            sku: patSku,
                          })
                        }
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                        title="Agrandir"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        {isOrder ? (
                          <Package className="w-5 h-5 text-red-500" />
                        ) : (
                          <Scissors className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-extrabold text-[#0F172A] truncate">
                          {patName}
                        </span>
                        {patSku && (
                          <span className="font-mono text-[9.5px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200 font-bold">
                            {patSku}
                          </span>
                        )}

                        {/* Action Badge */}
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                            isOrder
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isOrder ? (
                            <>
                              <Package className="w-3 h-3" />
                              <span>-{qty} expédiée</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3 h-3" />
                              <span>+{qty} coupé(s)</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Subtitle details */}
                      <div className="flex items-center gap-2.5 text-[10.5px] text-slate-500 mt-1 flex-wrap">
                        {/* Worker */}
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <UserIcon className="w-3 h-3 text-slate-400" />
                          <span>{log.user_name || 'Admin'}</span>
                        </span>

                        <span>•</span>

                        {/* Time */}
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(log.created_at)}</span>
                        </span>

                        {/* Notes if present */}
                        {log.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-500 truncate max-w-xs" title={log.notes}>
                              « {log.notes} »
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Delete Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    {/* Amount / Price */}
                    <div className="text-right">
                      {typeof log.total_price === 'number' && log.total_price > 0 && (
                        <div className="font-mono text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          +{log.total_price.toFixed(3)} DT
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono">
                        Stock: {log.new_stock !== undefined ? `${log.new_stock} pcs` : '-'}
                      </div>
                    </div>

                    {/* RED DELETE BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleDeleteOperation(log)}
                      disabled={isDeleting}
                      title="Supprimer cette opération et ajuster le stock / حذف العملية واسترجاع المخزون"
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Suppression...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer / حذف</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. MODAL FOOTER */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-slate-500 font-medium">
              {displayedLogs.length} opération(s) affichée(s)
            </span>
            {displayedLogs.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllOperations}
                disabled={isDeletingAll || deletingId !== null}
                className="px-2.5 py-1 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                title="Supprimer toutes les opérations / حذف الكل"
              >
                <Trash2 className="w-3 h-3" />
                <span>حذف الكل ({displayedLogs.length})</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            Fermer / إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
