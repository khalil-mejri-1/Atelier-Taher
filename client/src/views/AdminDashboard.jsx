import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckSquare, 
  Square, 
  Layers, 
  Users, 
  AlertTriangle, 
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  Tag,
  Table,
  LayoutGrid,
  Calendar,
  Coins,
  Puzzle,
  Loader2
} from 'lucide-react';
import { patternsApi, logsApi } from '../api';
import KpiCards from '../components/KpiCards';
import WorkerAccountsView from '../components/WorkerAccountsView';
import DailyProductionTracker from '../components/DailyProductionTracker';
import OrderFulfillModal from '../components/OrderFulfillModal';
import PatternEditModal from '../components/PatternEditModal';
import BulkActionModal from '../components/BulkActionModal';
import ImagePreviewModal from '../components/ImagePreviewModal';
import CategoryManageModal from '../components/CategoryManageModal';
import { useDialog } from '../context/DialogContext';

export default function AdminDashboard() {
  const { confirm, showNotice, notify } = useDialog();
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'logs' | 'workers'
  const [patterns, setPatterns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Image preview state
  const [previewImage, setPreviewImage] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Multi-select for Bulk Operations
  const [selectedIds, setSelectedIds] = useState([]);

  // View mode: 'table' or 'cards'
  const [viewMode, setViewMode] = useState('table');

  // Modals
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderPattern, setOrderPattern] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPattern, setEditPattern] = useState(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Toast / feedback message
  const [feedback, setFeedback] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionType, setActionType] = useState(''); // 'deduct' | 'delete'

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      const [patRes, catRes, statsRes, logsRes] = await Promise.all([
        patternsApi.getAll({
          search: search.trim() || undefined,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          low_stock: filterLowStockOnly ? true : undefined,
        }),
        patternsApi.getCategories(),
        logsApi.getStats(),
        logsApi.getLogs({ limit: 60 }),
      ]);

      setPatterns(patRes.patterns || []);
      setCategories(catRes.categories || []);
      setStats(statsRes || {});
      setLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Erreur chargement dashboard admin :', err);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData(false);
  }, [search, selectedCategory, filterLowStockOnly]);

  // Synchronisation silencieuse en arrière-plan sans rechargement visuel de la page
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      loadData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [search, selectedCategory, filterLowStockOnly]);

  // Selection toggle
  const toggleSelectPattern = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === patterns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(patterns.map((p) => p.id));
    }
  };

  // Quick -1 deduction
  const handleQuickDeductOne = async (pattern) => {
    if (actionLoadingId) return;
    const patternName = pattern.name_fr || pattern.name_ar;
    if (pattern.current_stock <= 0) {
      notify.warning(`Désolé, le patron "${patternName}" est en rupture de stock`);
      return;
    }
    setActionLoadingId(pattern.id);
    setActionType('deduct');
    try {
      await patternsApi.deductOrder(pattern.id, 1, 'Expédition rapide -1');
      notify.success(`1 pièce déduite pour "${patternName}"`);
      setFeedback(`1 pièce déduite pour "${patternName}"`);
      await loadData();
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      notify.error(err.message || 'Échec de la déduction');
    } finally {
      setActionLoadingId(null);
      setActionType('');
    }
  };

  // Fulfill order with custom details
  const handleOrderDeduct = async (patternId, quantity, clientName, notes) => {
    await patternsApi.deductOrder(patternId, quantity, clientName, notes);
    setFeedback(`(${quantity}) pièce(s) déduite(s) pour ${clientName || 'le client'}`);
    setTimeout(() => setFeedback(''), 3500);
  };

  // Save (Create or Update) Pattern
  const handleSavePattern = async (formData, id) => {
    if (id) {
      await patternsApi.update(id, formData);
      setFeedback('Patron mis à jour avec succès');
    } else {
      await patternsApi.create(formData);
      setFeedback('Nouveau patron ajouté au catalogue');
    }
    await loadData();
    setTimeout(() => setFeedback(''), 3500);
  };

  // Delete single pattern
  const handleDeletePattern = async (pattern) => {
    if (actionLoadingId) return;
    const patternName = pattern.name_fr || pattern.name_ar;
    const confirmed = await confirm({
      title: "Supprimer ce patron",
      titleAr: "تأكيد حذف الباترون نهائياً",
      message: `Êtes-vous sûr de vouloir supprimer définitivement le patron "${patternName}" (SKU: ${pattern.sku || 'N/A'}) du catalogue ?`,
      messageAr: `هل أنت متأكد من حذف موديل "${patternName}" نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذه العملية.`,
      type: "danger",
      confirmText: "Oui, supprimer définitivement / نعم، احذف الباترون",
      cancelText: "Annuler / تراجع"
    });

    if (!confirmed) {
      return;
    }
    setActionLoadingId(pattern.id);
    setActionType('delete');
    try {
      await patternsApi.delete(pattern.id);
      notify.success(`Patron "${patternName}" supprimé avec succès`);
      setFeedback(`Patron "${patternName}" supprimé`);
      setSelectedIds((prev) => prev.filter((id) => id !== pattern.id));
      await loadData();
      setTimeout(() => setFeedback(''), 3500);
    } catch (err) {
      notify.error(err.message || 'Échec de la suppression');
    } finally {
      setActionLoadingId(null);
      setActionType('');
    }
  };

  // Execute bulk operations
  const handleExecuteBulk = async (action, ids, value) => {
    await patternsApi.bulkOperation(action, ids, value);
    setSelectedIds([]);
    setFeedback(`Action groupée exécutée sur (${ids.length}) patron(s)`);
    await loadData();
    setTimeout(() => setFeedback(''), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 text-left overflow-x-hidden w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 w-full">
        
        {/* KPI Summary Cards */}
        <KpiCards
          stats={stats}
          onFilterLowStock={() => setFilterLowStockOnly(!filterLowStockOnly)}
          isFilteringLowStock={filterLowStockOnly}
        />

        {/* Global Feedback Banner */}
        {feedback && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{feedback}</span>
            </div>
            <span className="text-[10px] text-emerald-600">Synchronisé</span>
          </div>
        )}

        {/* Mobile View Header & Action Bar */}
        <div className="sm:hidden mb-4 space-y-2">
          {/* Mobile Tab Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'inventory'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-[#E2E8F0]'
              }`}
            >
              📦 Stock ({patterns.length})
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'daily'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-[#E2E8F0]'
              }`}
            >
              📅 Suivi Journalier
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'workers'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-[#E2E8F0]'
              }`}
            >
              👥 Utilisateurs
            </button>
          </div>

          {activeTab === 'inventory' && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-bold text-slate-700">Gestion du catalogue</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setCategoryModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] rounded-xl text-xs font-semibold shadow-2xs"
                  title="Gérer les catégories"
                >
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <span>Catégories</span>
                </button>

                <button
                  onClick={() => {
                    setEditPattern(null);
                    setEditModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-transform active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop View Tabs Navigation */}
        <div className="hidden sm:flex items-center justify-between border-b border-[#E2E8F0] mb-5">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'inventory'
                  ? 'border-[#0F172A] text-[#0F172A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Stock & Commandes ({patterns.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('daily')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'daily'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Suivi Journalier Ouvriers (Gains)</span>
            </button>

            <button
              onClick={() => setActiveTab('workers')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'workers'
                  ? 'border-[#0F172A] text-[#0F172A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Comptes & Utilisateurs</span>
            </button>
          </div>

          {activeTab === 'inventory' && (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setCategoryModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] rounded-xl text-xs font-semibold shadow-xs transition-colors"
                title="Gérer les catégories (Ajouter ou supprimer)"
              >
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>Gérer les catégories</span>
              </button>

              <button
                onClick={() => {
                  setEditPattern(null);
                  setEditModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un patron</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Inventory Management & Order Fulfillment */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            
            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
              
              {/* Quick Order Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher (nom du modèle, code)..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800 bg-[#F8F9FA]"
                />
              </div>

              {/* Category dropdown & Low Stock toggle */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 sm:flex-initial px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-hidden focus:border-slate-800 text-slate-700 min-w-0"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Low Stock Toggle button */}
                <button
                  onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
                    filterLowStockOnly
                      ? 'bg-[#FFFBEB] text-[#B45309] border-amber-300'
                      : 'bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">Stock faible</span>
                </button>
              </div>

            </div>

            {/* Bulk Selection Sticky Pill */}
            {selectedIds.length > 0 && (
              <div className="p-3 bg-[#0F172A] text-white rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>{selectedIds.length} patron(s) sélectionné(s)</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setBulkModalOpen(true)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-white text-[#0F172A] hover:bg-slate-100 rounded-xl text-xs font-bold transition-transform active:scale-95 text-center"
                  >
                    Action groupée...
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-2.5 py-2 text-xs text-slate-300 hover:text-white"
                  >
                    Désélectionner
                  </button>
                </div>
              </div>
            )}

            {/* Patterns Display: Table / Grid */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              {/* Table / Grid Controls Header */}
              <div className="p-3 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAll}
                    className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-black cursor-pointer"
                  >
                    {selectedIds.length === patterns.length && patterns.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-slate-900" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Sélectionner tout</span>
                  </button>
                  <span className="text-[11px] font-medium text-slate-400 border-l border-slate-200 pl-3">
                    {patterns.length} modèle(s)
                  </span>
                </div>

                {/* View Mode Switcher: Table vs Grid */}
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Affichage en tableau"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Tableau</span>
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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

              {loading ? (
                <div className="py-20 text-center text-slate-400 text-xs bg-white">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                  <span>Actualisation de l'inventaire...</span>
                </div>
              ) : patterns.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs bg-white">
                  Aucun patron ne correspond aux critères
                </div>
              ) : viewMode === 'table' ? (
                /* === TABLE VIEW === */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider select-none">
                        <th className="py-3 px-3 w-10 text-center">
                          <button
                            onClick={selectAll}
                            className="text-slate-500 hover:text-black cursor-pointer inline-flex items-center justify-center"
                            title="Sélectionner tout"
                          >
                            {selectedIds.length === patterns.length && patterns.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-slate-900" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-3 w-16 text-center">Photo</th>
                        <th className="py-3 px-3 w-28">Référence (SKU)</th>
                        <th className="py-3 px-4 min-w-[200px]">Modèle / Désignation</th>
                        <th className="py-3 px-3 min-w-[120px]">Catégorie</th>
                        <th className="py-3 px-3 min-w-[140px]">Tailles & Matière</th>
                        <th className="py-3 px-3 text-center min-w-[110px]">Tarif / Pièce</th>
                        <th className="py-3 px-4 text-center min-w-[140px]">Stock Disponible</th>
                        <th className="py-3 px-4 text-center min-w-[190px]">Déstockage Rapide</th>
                        <th className="py-3 px-4 text-right min-w-[90px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patterns.map((pattern) => {
                        const isSelected = selectedIds.includes(pattern.id);
                        const isLowStock = pattern.current_stock <= pattern.low_stock_threshold;
                        const isOutOfStock = pattern.current_stock <= 0;

                        return (
                          <tr
                            key={pattern.id}
                            className={`hover:bg-slate-50/80 transition-colors group ${
                              isSelected ? 'bg-slate-50/90 ring-1 ring-inset ring-slate-800' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-3 text-center align-middle">
                              <button
                                onClick={() => toggleSelectPattern(pattern.id)}
                                className="text-slate-400 hover:text-slate-800 cursor-pointer inline-flex items-center justify-center"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-[#0F172A]" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            {/* Photo / Thumbnail */}
                            <td className="py-3 px-3 text-center align-middle">
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
                                  className="w-11 h-11 rounded-lg object-cover border border-slate-200 shadow-2xs hover:scale-110 cursor-pointer transition-transform mx-auto"
                                  title="Cliquer pour agrandir la photo du patron"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Patron';
                                  }}
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                                  <ImageIcon className="w-4 h-4 text-slate-400" />
                                </div>
                              )}
                            </td>

                            {/* SKU */}
                            <td className="py-3 px-3 align-middle">
                              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/90 whitespace-nowrap inline-block">
                                {pattern.sku}
                              </span>
                            </td>

                            {/* Nom & Description */}
                            <td className="py-3 px-4 align-middle">
                              <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                                {pattern.name_fr || pattern.name_ar}
                              </div>
                              {pattern.name_ar && pattern.name_ar !== pattern.name_fr && (
                                <div className="text-[11px] text-slate-500 font-medium mt-0.5" dir="rtl">
                                  {pattern.name_ar}
                                </div>
                              )}
                              {pattern.has_parts && Array.isArray(pattern.parts) && pattern.parts.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                    title={`Composé de ${pattern.parts.length} parties : ${pattern.parts.map(p => p.name || p.name_ar).join(', ')}`}
                                  >
                                    <Puzzle className="w-3 h-3 text-indigo-500" />
                                    <span>{pattern.parts.length} parties</span>
                                  </span>
                                </div>
                              )}
                              {pattern.notes && (
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">
                                  {pattern.notes}
                                </p>
                              )}
                            </td>

                            {/* Catégorie */}
                            <td className="py-3 px-3 align-middle">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
                                {pattern.category}
                              </span>
                            </td>

                            {/* Gradation & Matière */}
                            <td className="py-3 px-3 align-middle text-[11px]">
                              <div className="text-slate-700 font-medium truncate max-w-[140px]" title={pattern.size_range || 'Standard'}>
                                <span className="text-slate-400 text-[10px]">Tailles : </span>
                                {pattern.size_range || 'Standard'}
                              </div>
                              <div className="text-slate-500 text-[10px] truncate max-w-[140px]" title={pattern.material_type || '-'}>
                                <span className="text-slate-400">Matière : </span>
                                {pattern.material_type || '-'}
                              </div>
                            </td>

                            {/* Tarif / Pièce */}
                            <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block shadow-2xs">
                                {parseFloat(pattern.price || 0).toFixed(3)} DT
                              </span>
                            </td>

                            {/* Stock Disponible */}
                            <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                isOutOfStock
                                  ? 'bg-[#FEF2F2] text-[#B91C1C] border-red-200'
                                  : isLowStock
                                  ? 'bg-[#FFFBEB] text-[#B45309] border-amber-200'
                                  : 'bg-[#F0FDF4] text-[#15803D] border-green-200'
                              }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                  isOutOfStock ? 'bg-[#B91C1C]' : isLowStock ? 'bg-[#B45309]' : 'bg-[#15803D]'
                                }`} />
                                <span className="font-mono font-extrabold text-sm">{pattern.current_stock}</span>
                                <span className="text-[10px] font-medium">pcs</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                {isOutOfStock ? (
                                  <span className="text-red-500 font-semibold">Rupture totale</span>
                                ) : isLowStock ? (
                                  <span className="text-amber-600 font-semibold">Seuil : {pattern.low_stock_threshold}</span>
                                ) : (
                                  <span>Seuil : {pattern.low_stock_threshold}</span>
                                )}
                              </div>
                            </td>

                            {/* Déstockage Rapide */}
                            <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                <button
                                  onClick={() => handleQuickDeductOne(pattern)}
                                  disabled={isOutOfStock || (actionLoadingId === pattern.id && actionType === 'deduct')}
                                  title="Déduire 1 pièce (-1)"
                                  className="px-2.5 py-1.5 bg-[#FEF2F2] hover:bg-red-100 text-[#B91C1C] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold rounded-lg border border-red-200 transition-all active:scale-95 cursor-pointer shadow-2xs inline-flex items-center gap-1"
                                >
                                  {actionLoadingId === pattern.id && actionType === 'deduct' ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B91C1C]" />
                                      <span>Déduction...</span>
                                    </>
                                  ) : (
                                    <span>-1 Déduire</span>
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setOrderPattern(pattern);
                                    setOrderModalOpen(true);
                                  }}
                                  disabled={isOutOfStock}
                                  title="Déduire une commande avec nom du client"
                                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed text-xs font-semibold rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer shadow-2xs"
                                >
                                  Commande...
                                </button>
                              </div>
                            </td>

                            {/* Actions (Modifier / Supprimer) */}
                            <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditPattern(pattern);
                                    setEditModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Modifier le patron"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePattern(pattern)}
                                  disabled={actionLoadingId === pattern.id && actionType === 'delete'}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Supprimer le patron"
                                >
                                  {actionLoadingId === pattern.id && actionType === 'delete' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* === GRID / CARDS VIEW === */
                <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {patterns.map((pattern) => {
                    const isSelected = selectedIds.includes(pattern.id);
                    const isLowStock = pattern.current_stock <= pattern.low_stock_threshold;
                    const isOutOfStock = pattern.current_stock <= 0;

                    return (
                      <div
                        key={pattern.id}
                        className={`p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between ${
                          isSelected ? 'ring-2 ring-slate-800 bg-slate-50/70' : ''
                        }`}
                      >
                        <div>
                          {/* Top Card Row */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => toggleSelectPattern(pattern.id)}
                                className="text-slate-400 hover:text-slate-800 cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-[#0F172A]" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {pattern.sku}
                              </span>
                            </div>

                            {/* Stock Badge */}
                            <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                              isOutOfStock
                                ? 'bg-[#FEF2F2] text-[#B91C1C] border-red-200'
                                : isLowStock
                                ? 'bg-[#FFFBEB] text-[#B45309] border-amber-200'
                                : 'bg-[#F0FDF4] text-[#15803D] border-green-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isOutOfStock ? 'bg-[#B91C1C]' : isLowStock ? 'bg-[#B45309]' : 'bg-[#15803D]'
                              }`} />
                              <span className="font-mono text-xs font-bold">{pattern.current_stock} pcs</span>
                            </div>
                          </div>

                          {/* Pattern Details with Image */}
                          <div className="flex items-start gap-2.5 mb-2.5">
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
                                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-2xs hover:scale-105 cursor-pointer transition-transform shrink-0"
                                title="Agrandir"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Patron';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs sm:text-sm text-[#0F172A] leading-snug line-clamp-1">
                                {pattern.name_fr || pattern.name_ar}
                              </h4>
                              {pattern.name_ar && pattern.name_ar !== pattern.name_fr && (
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate" dir="rtl">
                                  {pattern.name_ar}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium inline-block">
                                  {pattern.category}
                                </span>
                                {pattern.has_parts && Array.isArray(pattern.parts) && pattern.parts.length > 0 && (
                                  <span 
                                    className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200"
                                    title={`Composé de ${pattern.parts.length} parties`}
                                  >
                                    <Puzzle className="w-2.5 h-2.5 text-indigo-500" />
                                    <span>{pattern.parts.length} parties</span>
                                  </span>
                                )}
                                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block">
                                  {parseFloat(pattern.price || 0).toFixed(3)} DT
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Material & Sizes */}
                          <div className="text-[10px] text-slate-500 bg-[#F8F9FA] p-2 rounded-lg border border-slate-100 mb-2.5 space-y-0.5">
                            <div className="truncate"><span className="text-slate-400">Taille :</span> {pattern.size_range || 'Standard'}</div>
                            <div className="truncate"><span className="text-slate-400">Matière :</span> {pattern.material_type || '-'}</div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleQuickDeductOne(pattern)}
                              disabled={isOutOfStock || (actionLoadingId === pattern.id && actionType === 'deduct')}
                              className="py-1.5 bg-[#FEF2F2] hover:bg-red-100 text-[#B91C1C] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold rounded-lg border border-red-200 flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                            >
                              {actionLoadingId === pattern.id && actionType === 'deduct' ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B91C1C]" />
                                  <span>Déduction...</span>
                                </>
                              ) : (
                                <span>-1 Déduire</span>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setOrderPattern(pattern);
                                setOrderModalOpen(true);
                              }}
                              disabled={isOutOfStock}
                              className="py-1.5 bg-white hover:bg-slate-50 text-slate-700 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed text-xs font-semibold rounded-lg border border-[#E2E8F0] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            >
                              Commande...
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-[10px] text-slate-400">Seuil alerte: {pattern.low_stock_threshold}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditPattern(pattern);
                                  setEditModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePattern(pattern)}
                                disabled={actionLoadingId === pattern.id && actionType === 'delete'}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Supprimer"
                              >
                                {actionLoadingId === pattern.id && actionType === 'delete' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Daily Production & Worker Earnings Tracker */}
        {activeTab === 'daily' && (
          <DailyProductionTracker onPreviewImage={setPreviewImage} />
        )}

        {/* Tab 3: Worker Account Management */}
        {activeTab === 'workers' && (
          <WorkerAccountsView />
        )}

      </div>

      {/* Modals */}
      <OrderFulfillModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        pattern={orderPattern}
        onDeduct={handleOrderDeduct}
      />

      <PatternEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        pattern={editPattern}
        onSave={handleSavePattern}
        categories={categories}
        onOpenCategoryManager={() => setCategoryModalOpen(true)}
      />

      <BulkActionModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        onExecuteBulk={handleExecuteBulk}
        categories={categories}
      />

      <CategoryManageModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCategoriesChanged={loadData}
      />

      {/* Image Preview Lightbox */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url}
        title={previewImage?.title}
        sku={previewImage?.sku}
      />

      {/* Sticky Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] px-3 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center min-h-[48px] px-3 py-1 rounded-xl transition-colors ${
            activeTab === 'inventory'
              ? 'text-[#0F172A] font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <Layers className={`w-5 h-5 mb-0.5 ${activeTab === 'inventory' ? 'text-[#0F172A]' : 'text-slate-400'}`} />
          <span className="text-[10px]">Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('daily')}
          className={`flex flex-col items-center justify-center min-h-[48px] px-3 py-1 rounded-xl transition-colors ${
            activeTab === 'daily'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <Calendar className={`w-5 h-5 mb-0.5 ${activeTab === 'daily' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="text-[10px]">Production</span>
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className={`flex flex-col items-center justify-center min-h-[48px] px-3 py-1 rounded-xl transition-colors ${
            activeTab === 'workers'
              ? 'text-[#0F172A] font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <Users className={`w-5 h-5 mb-0.5 ${activeTab === 'workers' ? 'text-[#0F172A]' : 'text-slate-400'}`} />
          <span className="text-[10px]">Opérateurs</span>
        </button>
      </nav>

    </div>
  );
}
