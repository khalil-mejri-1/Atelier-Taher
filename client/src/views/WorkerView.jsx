import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Scissors, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Layers,
  RefreshCw,
  Table,
  LayoutGrid,
  Coins,
  Puzzle,
  History,
  Loader2,
  X
} from 'lucide-react';
import { patternsApi, logsApi, tasksApi } from '../api';
import UndoToast from '../components/UndoToast';
import ProduceCustomModal from '../components/ProduceCustomModal';
import ProducePartsModal from '../components/ProducePartsModal';
import ImagePreviewModal from '../components/ImagePreviewModal';
import MyPrintsHistoryModal from '../components/MyPrintsHistoryModal';
import WorkerTaskPopupModal from '../components/WorkerTaskPopupModal';
import WorkerTasksHistoryModal from '../components/WorkerTasksHistoryModal';
import { playNotificationSound } from '../utils/sound';
import { useDialog } from '../context/DialogContext';

export default function WorkerView() {
  const { notify } = useDialog();
  const [patterns, setPatterns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filters & Ultra-Fast Debounced Search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setIsSearching(false);
    }, 180);
    return () => clearTimeout(timer);
  }, [search]);

  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Undo Toast state
  const [undoData, setUndoData] = useState(null);

  // Image preview lightbox state
  const [previewImage, setPreviewImage] = useState(null);

  // Custom modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);

  // Produce parts modal state (for multi-part patterns)
  const [partsModalOpen, setPartsModalOpen] = useState(false);
  const [partsModalPattern, setPartsModalPattern] = useState(null);
  const [myProgress, setMyProgress] = useState([]);

  // My prints history modal state
  const [printsModalOpen, setPrintsModalOpen] = useState(false);

  // Tâches assignées par l'administrateur
  const [pendingTaskPopup, setPendingTaskPopup] = useState(null);
  const [tasksHistoryModalOpen, setTasksHistoryModalOpen] = useState(false);
  const [myTasksCount, setMyTasksCount] = useState(0);

  // Success alert indicator
  const [flashMessage, setFlashMessage] = useState('');
  const [producingId, setProducingId] = useState(null);

  // Pagination & Infinite Scroll: 50 on initial load, +20 on each scroll down
  const [hasMore, setHasMore] = useState(false);
  const [totalPatterns, setTotalPatterns] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const patternsRef = useRef([]);
  patternsRef.current = patterns;
  const isFetchingRef = useRef(false);
  const sentinelRef = useRef(null);

  // Chargement ultra-rapide des patrons seuls (optimisé avec verrou de concurrence)
  const fetchPatternsData = async (isBackground = false) => {
    if (isFetchingRef.current && isBackground) return;

    try {
      isFetchingRef.current = true;
      if (!isBackground && patternsRef.current.length === 0) {
        setLoading(true);
      }
      setIsSearching(true);

      const isSearchActive = Boolean(debouncedSearch.trim());
      const currentLimit = isSearchActive
        ? 50
        : (isBackground ? Math.max(50, patternsRef.current.length) : 50);

      const patRes = await patternsApi.getAll({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: debouncedSearch.trim() || undefined,
        limit: currentLimit,
        skip: 0,
      });

      setPatterns(patRes.patterns || []);
      setHasMore(Boolean(patRes.hasMore));
      setTotalPatterns(patRes.total ?? (patRes.patterns || []).length);
    } catch (err) {
      console.error('Erreur chargement patrons opérateur :', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Chargement des métadonnées (catégories, statistiques et progression)
  const loadWorkerMeta = async () => {
    try {
      const [catRes, statsRes, dailyRes, progRes] = await Promise.all([
        patternsApi.getCategories(),
        logsApi.getStats(),
        logsApi.getDailyProduction().catch(() => ({ totalEarnings: 0 })),
        patternsApi.getMyProgress().catch(() => ({ progress: [] })),
      ]);
      setCategories(catRes.categories || []);
      setTodayCount(statsRes.producedToday || 0);
      setTodayEarnings(dailyRes?.totalEarnings || 0);
      setMyProgress(progRes?.progress || []);
    } catch (err) {
      console.error('Erreur chargement métadonnées ouvrier :', err);
    }
  };

  const loadData = async (isBackground = false) => {
    await Promise.all([
      fetchPatternsData(isBackground),
      loadWorkerMeta(),
    ]);
  };

  useEffect(() => {
    loadWorkerMeta();
  }, []);

  // Vérification instantanée et continue des tâches en attente assignées à l'ouvrier
  const checkPendingTask = async () => {
    try {
      const res = await tasksApi.getPendingPopup();
      if (res && res.hasPending && res.task) {
        setPendingTaskPopup((prev) => {
          // Si c'est une nouvelle tâche non encore affichée, émettre un bip sonore
          if (!prev || (prev._id || prev.id) !== (res.task._id || res.task.id)) {
            playNotificationSound();
          }
          return res.task;
        });
      } else {
        setPendingTaskPopup(null);
      }
    } catch (err) {
      // Ignorer silencieusement en arrière-plan
    }
  };

  const loadMyTasksCount = async () => {
    try {
      const res = await tasksApi.getAll();
      setMyTasksCount(res.total || 0);
    } catch (err) {}
  };

  // Chargement initial des tâches de l'ouvrier
  useEffect(() => {
    checkPendingTask();
    loadMyTasksCount();
  }, []);

  // Détection en temps réel (toutes les 3.5 secondes) des nouvelles tâches envoyées sans rechargement
  useEffect(() => {
    const taskInterval = setInterval(() => {
      checkPendingTask();
    }, 3500);

    const handleFocusOrVisible = () => {
      if (!document.hidden) {
        checkPendingTask();
        loadMyTasksCount();
      }
    };

    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);

    return () => {
      clearInterval(taskInterval);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
    };
  }, []);

  // Gestion du clic sur "اطلعت عليها"
  const handleAcknowledgeTask = async (taskId) => {
    try {
      await tasksApi.acknowledge(taskId);
      setPendingTaskPopup(null);
      notify.success('تم تأكيد الاطلاع وإشعار الإدارة بنجاح / Accusé de réception envoyé à l’administrateur');
      await loadMyTasksCount();
      // Vérifier s'il reste une autre tâche en file d'attente
      setTimeout(() => {
        checkPendingTask();
      }, 400);
    } catch (err) {
      notify.error(err.message || 'Erreur lors de la validation');
    }
  };

  useEffect(() => {
    fetchPatternsData(false);
  }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchPatternsData(true);
      loadWorkerMeta();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedCategory, debouncedSearch]);

  // Load next 20 patterns on scroll down
  const loadMorePatterns = async () => {
    if (loadingMore || !hasMore || isFetchingRef.current) return;
    setLoadingMore(true);
    try {
      const currentCount = patternsRef.current.length;
      const patRes = await patternsApi.getAll({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: debouncedSearch.trim() || undefined,
        limit: 20,
        skip: currentCount,
      });

      const newItems = patRes.patterns || [];
      if (newItems.length > 0) {
        setPatterns((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const fresh = newItems.filter((p) => !existingIds.has(p.id));
          return [...prev, ...fresh];
        });
      }
      setHasMore(Boolean(patRes.hasMore));
      setTotalPatterns(patRes.total ?? (currentCount + newItems.length));
    } catch (err) {
      console.error('Erreur chargement plus de patrons :', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Filtrage local instantané à 0ms pendant la frappe (trié par stock décroissant)
  const displayedPatterns = useMemo(() => {
    let list = patterns;
    const term = search.trim().toLowerCase();
    if (term) {
      const matches = patterns.filter((p) => {
        const fr = (p.name_fr || '').toLowerCase();
        const ar = (p.name_ar || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return fr.includes(term) || ar.includes(term) || sku.includes(term);
      });
      list = matches.length > 0 ? matches : patterns;
    }
    // Tri décroissant : le produit avec le stock le plus élevé apparaît en premier
    return [...list].sort((a, b) => (b.current_stock || 0) - (a.current_stock || 0));
  }, [patterns, search]);

  // Infinite scroll observer on scrolling down
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          loadMorePatterns();
        }
      },
      { rootMargin: '250px' }
    );

    const target = sentinelRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, loadingMore, loading, patterns.length, selectedCategory, debouncedSearch]);

  // Helper to get worker's printed parts for a pattern
  const getPatternInProgressParts = (patternId) => {
    const found = myProgress.find(
      (p) => (p.pattern_id?._id || p.pattern_id || p.pattern_id?.id) === patternId
    );
    return found?.printed_parts || [];
  };

  const handleProducePartsSuccess = (res) => {
    if (res.completed) {
      setTodayCount((prev) => prev + 1);
      setTodayEarnings((prev) => prev + (res.earned || 0));
      setFlashMessage(res.message || 'Patron complet validé avec succès !');
      if (res.logId) {
        setUndoData({
          logId: res.logId,
          patternId: partsModalPattern?.id,
          patternName: partsModalPattern?.name_fr || partsModalPattern?.name_ar,
          quantity: 1,
        });
      }
      if (partsModalPattern?.id) {
        setPatterns((prev) =>
          prev.map((p) => (p.id === partsModalPattern.id ? { ...p, current_stock: p.current_stock + 1 } : p))
        );
        setMyProgress((prev) =>
          prev.filter((p) => (p.pattern_id?._id || p.pattern_id || p.pattern_id?.id) !== partsModalPattern.id)
        );
      }
    } else {
      setFlashMessage(res.message || 'Partie enregistrée !');
      if (partsModalPattern?.id && res.printed_parts) {
        setMyProgress((prev) => {
          const targetPid = partsModalPattern.id;
          const idx = prev.findIndex((p) => (p.pattern_id?._id || p.pattern_id || p.pattern_id?.id) === targetPid);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], printed_parts: res.printed_parts };
            return next;
          } else {
            return [...prev, { pattern_id: targetPid, printed_parts: res.printed_parts }];
          }
        });
      }
    }
    setTimeout(() => setFlashMessage(''), 3000);
    loadData();
  };

  // One-Tap +1 Production
  const handleProduceOne = async (pattern) => {
    if (producingId) return;
    setProducingId(pattern.id);
    try {
      const unitPrice = pattern.price || 0;
      setPatterns((prev) =>
        prev.map((p) => (p.id === pattern.id ? { ...p, current_stock: p.current_stock + 1 } : p))
      );
      setTodayCount((prev) => prev + 1);
      setTodayEarnings((prev) => prev + unitPrice);

      const res = await patternsApi.produce(pattern.id, 1, 'Production rapide +1');
      
      setUndoData({
        logId: res.logId,
        patternId: pattern.id,
        patternName: pattern.name_fr || pattern.name_ar,
        quantity: 1
      });

      const priceMsg = unitPrice > 0 ? ` (+${unitPrice.toFixed(3)} DT)` : '';
      setFlashMessage(`+1 enregistré pour "${pattern.name_fr || pattern.name_ar}"${priceMsg}`);
      setTimeout(() => setFlashMessage(''), 2500);
    } catch (err) {
      console.error(err);
      loadData();
    } finally {
      setProducingId(null);
    }
  };

  // Custom quantity production
  const handleCustomProduce = async (patternId, quantity, notes) => {
    const pattern = patterns.find((p) => p.id === patternId);
    const unitPrice = pattern?.price || 0;
    const addedAmount = quantity * unitPrice;

    try {
      setPatterns((prev) =>
        prev.map((p) => (p.id === patternId ? { ...p, current_stock: p.current_stock + quantity } : p))
      );
      setTodayCount((prev) => prev + quantity);
      setTodayEarnings((prev) => prev + addedAmount);

      const res = await patternsApi.produce(patternId, quantity, notes);

      setUndoData({
        logId: res.logId,
        patternId,
        patternName: pattern ? (pattern.name_fr || pattern.name_ar) : 'Patron',
        quantity
      });

      const priceMsg = addedAmount > 0 ? ` (+${addedAmount.toFixed(3)} DT)` : '';
      setFlashMessage(`+${quantity} pièce(s) enregistrée(s)${priceMsg}`);
      setTimeout(() => setFlashMessage(''), 2500);
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  // Undo Production
  const handleUndo = async (logId) => {
    try {
      await patternsApi.undoProduce(logId);
      setUndoData(null);
      notify.success('Opération annulée et stock restauré avec succès');
      setFlashMessage(`Opération annulée et stock restauré avec succès`);
      setTimeout(() => setFlashMessage(''), 3000);
      loadData();
    } catch (err) {
      notify.error(err.message || 'Échec de l’annulation de l’opération');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28 sm:pb-24 text-left">
      
      {/* Worker Production Header Banner */}
      <div className="bg-white border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <Scissors className="w-4 h-4" />
                </span>
                <h1 className="text-base sm:text-xl font-extrabold text-[#0F172A] tracking-tight">
                  Enregistrement de la production
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Interface atelier pour enregistrer les patrons découpés
              </p>
            </div>

            {/* Today Production & Earnings Stat Badge (Mobile 2-col + Full button, Desktop inline) */}
            <div className="bg-[#F8F9FA] p-2 sm:p-2.5 rounded-2xl border border-slate-200 w-full sm:w-auto">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4">
                {/* Pièces du jour */}
                <div className="flex items-center gap-2 bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-slate-100">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F0FDF4] text-[#15803D] border border-green-200 flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="block text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                      Pièces du jour
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base sm:text-xl font-extrabold text-[#15803D] font-sku">
                        +{todayCount}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-600 font-medium">pcs</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block h-7 w-px bg-slate-200" />

                {/* Gains du jour */}
                <div className="flex items-center gap-2 bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-slate-100">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="block text-[9px] sm:text-[10px] text-emerald-700 font-bold uppercase tracking-wider truncate">
                      Gains du jour
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base sm:text-xl font-extrabold text-emerald-700 font-mono">
                        {todayEarnings.toFixed(3)}
                      </span>
                      <span className="text-[10px] sm:text-xs text-emerald-800 font-bold">DT</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block h-7 w-px bg-slate-200" />

                {/* View/Delete My Prints History Button */}
                <button
                  type="button"
                  onClick={() => setPrintsModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer w-full sm:w-auto"
                  title="Voir la liste de mes impressions et supprimer les erreurs"
                >
                  <History className="w-4 h-4 text-emerald-600" />
                  <span>Mes impressions ({todayCount})</span>
                </button>

                {/* View My Assigned Tasks Button */}
                <button
                  type="button"
                  onClick={() => setTasksHistoryModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer w-full sm:w-auto"
                  title="Voir la liste des tâches et modèles assignés par l'administration"
                >
                  <Layers className="w-4 h-4 text-amber-700" />
                  <span>مهامي المرسلة ({myTasksCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Notice Banner if flashMessage */}
          {flashMessage && (
            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{flashMessage}</span>
              </div>
              <span className="text-[10px] text-emerald-600">Mise à jour directe</span>
            </div>
          )}

          {/* Search Bar & Category Filters */}
          <div className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Recherche instantanée (nom ou code SKU)... / بحث فوري..."
                className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white text-xs sm:text-sm border border-[#E2E8F0] rounded-2xl focus:outline-hidden focus:border-slate-800 shadow-2xs placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 transition-all"
              />
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              ) : search ? (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Effacer / مسح"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Category Filter Pills & View Switcher (Clean Stacked on Mobile) */}
            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
              {/* Category Filter Pills: Smooth horizontal scroll */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs flex-1 min-w-0 w-full sm:w-auto -mx-1 px-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold whitespace-nowrap transition-all shrink-0 ${
                    selectedCategory === 'all'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  Tous ({totalPatterns || patterns.length})
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-semibold whitespace-nowrap transition-all shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#0F172A] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* View Switcher: Table vs Grid */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-slate-400 sm:hidden">
                  Vue :
                </span>
                <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Affichage en liste"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Tableau</span>
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'cards'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Affichage en cartes"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grille</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Pattern Content: Table or Cards Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {loading && patterns.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            <span>Chargement des patrons en cours...</span>
          </div>
        ) : displayedPatterns.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-[#E2E8F0] max-w-md mx-auto my-12">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm mb-1">Aucun patron trouvé</h3>
            <p className="text-xs text-slate-400 mb-4">Essayez de modifier votre recherche ou sélectionnez une autre catégorie</p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* === WORKER TABLE VIEW (TABLE LAYOUT PRESERVED ON ALL SCREEN SIZES) === */
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full relative">
              <table className="w-full text-left text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider select-none">
                    <th className="py-2 px-1 w-[76px] min-w-[76px] max-w-[76px] text-center whitespace-nowrap sticky left-0 z-20 bg-slate-50 border-b border-slate-200 border-r border-slate-200 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] text-[10px]">
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span>PHOTO</span>
                        <span className="text-[9px] font-mono text-slate-400 font-normal">SKU</span>
                      </div>
                    </th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 min-w-[160px] sm:min-w-[200px] whitespace-nowrap bg-slate-50/80 border-b border-slate-200">Modèle / Désignation</th>
                    <th className="py-2.5 sm:py-3 px-2.5 sm:px-3 min-w-[110px] whitespace-nowrap bg-slate-50/80 border-b border-slate-200">Catégorie</th>
                    <th className="py-2.5 sm:py-3 px-2.5 sm:px-3 min-w-[130px] whitespace-nowrap bg-slate-50/80 border-b border-slate-200">Tailles & Matière</th>
                    <th className="py-2.5 sm:py-3 px-2.5 sm:px-3 text-center whitespace-nowrap min-w-[95px] bg-slate-50/80 border-b border-slate-200">Tarif / Pièce</th>
                    <th className="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center whitespace-nowrap min-w-[95px] bg-slate-50/80 border-b border-slate-200">Stock Actuel</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center whitespace-nowrap min-w-[170px] sm:min-w-[200px] bg-slate-50/80 border-b border-slate-200">Enregistrement Production</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPatterns.map((pattern) => {
                    const isLowStock = pattern.current_stock <= pattern.low_stock_threshold;
                    const isCritical = pattern.current_stock <= 3;
                    const isMultiPart = Boolean(pattern.has_parts && Array.isArray(pattern.parts) && pattern.parts.length > 1);
                    const printedParts = getPatternInProgressParts(pattern.id);

                    return (
                      <tr
                        key={pattern.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Thumbnail & SKU Combined (Sticky Left 0 with Right Shadow Divider) */}
                        <td className="py-2 px-1 w-[76px] min-w-[76px] max-w-[76px] text-center align-middle sticky left-0 z-10 border-b border-slate-100 border-r border-slate-200 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] bg-white group-hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col items-center justify-center gap-1 mx-auto">
                            {pattern.image_url ? (
                              <img
                                src={pattern.image_url}
                                alt={pattern.name_fr}
                                onClick={() =>
                                  setPreviewImage({
                                    url: pattern.image_url,
                                    title: pattern.name_fr || pattern.name_ar,
                                    sku: pattern.sku,
                                  })
                                }
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-2xs hover:scale-105 cursor-pointer transition-transform"
                                title="Agrandir"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Patron';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                <Scissors className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <span 
                              className="font-mono text-[9px] font-bold text-slate-700 bg-slate-100/90 hover:bg-slate-200 px-1 py-0.5 rounded border border-slate-200/90 whitespace-nowrap block max-w-[70px] truncate text-center leading-tight tracking-tight shadow-3xs cursor-default"
                              title={pattern.sku}
                            >
                              {pattern.sku}
                            </span>
                          </div>
                        </td>

                        {/* Nom */}
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 align-middle border-b border-slate-100">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                              {pattern.name_fr || pattern.name_ar}
                            </span>
                            <span className="hidden sm:inline-block font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200 font-semibold">
                              {pattern.sku}
                            </span>
                          </div>
                          {pattern.name_ar && pattern.name_ar !== pattern.name_fr && (
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5" dir="rtl">
                              {pattern.name_ar}
                            </div>
                          )}
                          {isMultiPart && (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Puzzle className="w-3 h-3 text-indigo-500" />
                                <span>{pattern.parts.length} parties</span>
                              </span>
                              {printedParts.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <span>En cours : {printedParts.length}/{pattern.parts.length}</span>
                                </span>
                              )}
                            </div>
                          )}
                          {pattern.notes && (
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">
                              {pattern.notes}
                            </p>
                          )}
                        </td>

                        {/* Catégorie */}
                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-3 align-middle border-b border-slate-100">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
                            {pattern.category}
                          </span>
                        </td>

                        {/* Tailles & Matière */}
                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-3 align-middle text-[11px] border-b border-slate-100">
                          <div className="text-slate-700 font-medium truncate max-w-[130px]">
                            <span className="text-slate-400 text-[10px]">Taille : </span>
                            {pattern.size_range || 'Standard'}
                          </div>
                          <div className="text-slate-500 text-[10px] truncate max-w-[130px]">
                            <span className="text-slate-400">Matière : </span>
                            {pattern.material_type || '-'}
                          </div>
                        </td>

                        {/* Tarif unitaire */}
                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-3 text-center align-middle whitespace-nowrap border-b border-slate-100">
                          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {parseFloat(pattern.price || 0).toFixed(3)} DT
                          </span>
                        </td>

                        {/* Stock */}
                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center align-middle whitespace-nowrap border-b border-slate-100">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isCritical
                              ? 'bg-[#FEF2F2] text-[#B91C1C] border-red-200'
                              : isLowStock
                              ? 'bg-[#FFFBEB] text-[#B45309] border-amber-200'
                              : 'bg-[#F0FDF4] text-[#15803D] border-green-200'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              isCritical ? 'bg-[#B91C1C]' : isLowStock ? 'bg-[#B45309]' : 'bg-[#15803D]'
                            }`} />
                            <span className="font-mono font-extrabold text-sm">{pattern.current_stock}</span>
                            <span className="text-[10px] font-medium">pcs</span>
                          </div>
                          {isLowStock && (
                            <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                              Seuil : {pattern.low_stock_threshold}
                            </div>
                          )}
                        </td>

                        {/* Fast Produce Buttons */}
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center align-middle whitespace-nowrap border-b border-slate-100">
                          {isMultiPart ? (
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              <button
                                onClick={() => {
                                  setPartsModalPattern(pattern);
                                  setPartsModalOpen(true);
                                }}
                                className="px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                <Puzzle className="w-3.5 h-3.5 text-white" />
                                <span>Imprimer parties ({pattern.parts.length})</span>
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 justify-center">
                              <button
                                onClick={() => handleProduceOne(pattern)}
                                disabled={producingId === pattern.id}
                                className="px-3 py-2 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-75 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                              >
                                {producingId === pattern.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                    <span>Enregistrement...</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                    <span>+1 Produit</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPattern(pattern);
                                  setCustomModalOpen(true);
                                }}
                                title="Quantité personnalisée"
                                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-transform active:scale-95 border border-slate-200 cursor-pointer"
                              >
                                <span>+5 / Autre</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* === WORKER CARDS GRID VIEW (COMPACT & SLEEK) === */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {displayedPatterns.map((pattern) => {
              const isLowStock = pattern.current_stock <= pattern.low_stock_threshold;
              const isCritical = pattern.current_stock <= 3;
              const isMultiPart = Boolean(pattern.has_parts && Array.isArray(pattern.parts) && pattern.parts.length > 1);
              const printedParts = getPatternInProgressParts(pattern.id);

              return (
                <div
                  key={pattern.id}
                  className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#E2E8F0] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  {/* Top info: SKU + Multi-part + Stock */}
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-mono text-[9px] font-bold text-slate-600 bg-[#F8F9FA] px-1.5 py-0.5 rounded border border-slate-200">
                          {pattern.sku}
                        </span>
                        {isMultiPart && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                            <Puzzle className="w-2.5 h-2.5 text-indigo-500" />
                            <span>{pattern.parts.length} parties</span>
                          </span>
                        )}
                        {printedParts.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                            <span>{printedParts.length}/{pattern.parts.length}</span>
                          </span>
                        )}
                      </div>

                      {/* Stock Badge */}
                      <div className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                        isCritical
                          ? 'bg-[#FEF2F2] text-[#B91C1C] border-red-200'
                          : isLowStock
                          ? 'bg-[#FFFBEB] text-[#B45309] border-amber-200'
                          : 'bg-[#F0FDF4] text-[#15803D] border-green-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isCritical ? 'bg-[#B91C1C]' : isLowStock ? 'bg-[#B45309]' : 'bg-[#15803D]'
                        }`} />
                        <span>{pattern.current_stock} pcs</span>
                      </div>
                    </div>

                    {/* Pattern Header with Image & Title */}
                    <div className="flex items-center gap-2.5 mb-2">
                      {pattern.image_url ? (
                        <div 
                          onClick={() => setPreviewImage({ url: pattern.image_url, title: pattern.name_fr || pattern.name_ar, sku: pattern.sku })}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden border border-slate-200 shadow-2xs hover:border-slate-400 cursor-pointer shrink-0 group relative bg-white"
                          title="Agrandir"
                        >
                          <img
                            src={pattern.image_url}
                            alt={pattern.name_fr}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Patron';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <Scissors className="w-4 h-4 text-slate-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xs sm:text-sm text-[#0F172A] leading-tight truncate">
                          {pattern.name_fr || pattern.name_ar}
                        </h3>
                        {pattern.name_ar && pattern.name_ar !== pattern.name_fr && (
                          <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5" dir="rtl">
                            {pattern.name_ar}
                          </p>
                        )}
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {pattern.category}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {parseFloat(pattern.price || 0).toFixed(3)} DT
                          </span>
                          {pattern.size_range && (
                            <span className="text-[9px] text-slate-400 font-sku">
                              {pattern.size_range}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Compact Meta Specifications Strip */}
                    {(pattern.material_type || pattern.size_range) && (
                      <div className="flex items-center justify-between text-[10px] text-slate-500 bg-[#F8F9FA] px-2 py-1 rounded-lg border border-slate-100 mb-2">
                        <span className="truncate max-w-[48%]">
                          <span className="text-slate-400 text-[9px]">Matière : </span>
                          <span className="font-semibold text-slate-700">{pattern.material_type || '-'}</span>
                        </span>
                        <span className="truncate max-w-[48%] text-right">
                          <span className="text-slate-400 text-[9px]">Grad : </span>
                          <span className="font-semibold text-slate-700">{pattern.size_range || 'Standard'}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Compact Production Buttons */}
                  <div className="space-y-1 pt-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {isMultiPart ? (
                        <button
                          onClick={() => {
                            setPartsModalPattern(pattern);
                            setPartsModalOpen(true);
                          }}
                          className="flex-1 h-8.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Puzzle className="w-3.5 h-3.5 text-white" />
                          <span>Imprimer parties ({pattern.parts.length})</span>
                        </button>
                      ) : (
                        <>
                          {/* One-Tap +1 Button */}
                          <button
                            onClick={() => handleProduceOne(pattern)}
                            disabled={producingId === pattern.id}
                            className="flex-1 h-8.5 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-75 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                          >
                            {producingId === pattern.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                <span>Enregistrement...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                <span>+1 Produit</span>
                              </>
                            )}
                          </button>

                          {/* Quick +5 or Custom stepper */}
                          <button
                            onClick={() => {
                              setSelectedPattern(pattern);
                              setCustomModalOpen(true);
                            }}
                            title="Enregistrer une quantité personnalisée"
                            className="h-8.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-transform active:scale-95 border border-slate-200 cursor-pointer"
                          >
                            <span>+5 / Autre</span>
                          </button>
                        </>
                      )}
                    </div>

                    {isLowStock && (
                      <div className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                        <span>Stock faible ({pattern.current_stock}/{pattern.low_stock_threshold})</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Infinite Scroll Sentinel & Load More Indicator */}
        <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center gap-2">
          {loadingMore && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in">
              <Loader2 className="w-4 h-4 animate-spin text-[#0F172A]" />
              <span>Chargement de 10 patrons supplémentaires... / جاري جلب 10 منتجات أخرى...</span>
            </div>
          )}

          {!loadingMore && hasMore && (
            <button
              type="button"
              onClick={loadMorePatterns}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Charger 10 de plus ({patterns.length} sur {totalPatterns})</span>
            </button>
          )}

          {!hasMore && patterns.length > 5 && (
            <div className="text-[11px] font-semibold text-slate-400 bg-white px-3.5 py-1 rounded-full border border-slate-200/60 shadow-2xs">
              ✓ Tous les patrons sont affichés ({patterns.length} / {totalPatterns}) • تم جلب كافة المنتجات
            </div>
          )}
        </div>
      </main>

      {/* Produce Parts Modal (for multi-part patterns) */}
      <ProducePartsModal
        isOpen={partsModalOpen}
        onClose={() => setPartsModalOpen(false)}
        pattern={partsModalPattern}
        onSuccess={handleProducePartsSuccess}
      />

      {/* Safety Undo Toast (6 seconds countdown) */}
      <UndoToast
        undoData={undoData}
        onUndo={handleUndo}
        onDismiss={() => setUndoData(null)}
      />

      {/* Custom Quantity Modal */}
      <ProduceCustomModal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        pattern={selectedPattern}
        onProduce={handleCustomProduce}
      />

      {/* Sticky Mobile Worker Bottom Status Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] px-3.5 py-2.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-semibold truncate leading-none">Vacation :</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-extrabold text-[#15803D] font-sku leading-none">+{todayCount}</span>
              <span className="text-[11px] font-bold text-emerald-700 font-mono leading-none">({todayEarnings.toFixed(3)} DT)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTasksHistoryModalOpen(true)}
            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center gap-1 cursor-pointer border border-amber-200"
          >
            <Layers className="w-3.5 h-3.5 text-amber-700" />
            <span>مهامي ({myTasksCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setPrintsModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center gap-1 cursor-pointer border border-slate-200"
          >
            <History className="w-3.5 h-3.5 text-emerald-600" />
            <span>سجل الطباعات</span>
          </button>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-8 h-8 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center justify-center cursor-pointer shadow-xs"
            title="Remonter en haut"
          >
            ↑
          </button>
        </div>
      </nav>

      {/* Modal popup obligatoire et centrée pour l'ouvrier dès qu'une tâche est reçue */}
      {pendingTaskPopup && (
        <WorkerTaskPopupModal
          key={pendingTaskPopup._id || pendingTaskPopup.id}
          task={pendingTaskPopup}
          onAcknowledge={handleAcknowledgeTask}
          onPreviewImage={(url, title) => setPreviewImage({ url, title, sku: '' })}
        />
      )}

      {/* Modal d'historique de toutes les tâches de l'ouvrier */}
      <WorkerTasksHistoryModal
        isOpen={tasksHistoryModalOpen}
        onClose={() => setTasksHistoryModalOpen(false)}
        onPreviewImage={(url, title) => setPreviewImage({ url, title, sku: '' })}
      />

      {/* My Prints History Modal (View & Delete Prints) */}
      <MyPrintsHistoryModal
        isOpen={printsModalOpen}
        onClose={() => setPrintsModalOpen(false)}
        onPrintsChanged={loadData}
      />

      {/* Image Preview Lightbox */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url}
        title={previewImage?.title}
        sku={previewImage?.sku}
      />

    </div>
  );
}
