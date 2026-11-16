import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckSquare, 
  Square, 
  Layers, 
  History, 
  Users, 
  AlertTriangle, 
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  Tag
} from 'lucide-react';
import { patternsApi, logsApi } from '../api';
import { socket } from '../socket';
import KpiCards from '../components/KpiCards';
import ActivityLogFeed from '../components/ActivityLogFeed';
import WorkerAccountsView from '../components/WorkerAccountsView';
import OrderFulfillModal from '../components/OrderFulfillModal';
import PatternEditModal from '../components/PatternEditModal';
import BulkActionModal from '../components/BulkActionModal';
import ImagePreviewModal from '../components/ImagePreviewModal';
import CategoryManageModal from '../components/CategoryManageModal';

export default function AdminDashboard() {
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

  // Modals
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderPattern, setOrderPattern] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPattern, setEditPattern] = useState(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Toast / feedback message
  const [feedback, setFeedback] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, filterLowStockOnly]);

  // Synchronisation temps réel
  useEffect(() => {
    function onStockUpdated(data) {
      setPatterns((prev) =>
        prev.map((p) => (p.id === data.pattern.id ? { ...p, current_stock: data.pattern.current_stock } : p))
      );
    }

    function onStatsUpdated(freshStats) {
      setStats(freshStats);
    }

    function onActivityLogged(payload) {
      if (payload?.log) {
        setLogs((prev) => [payload.log, ...prev.slice(0, 99)]);
      }
    }

    function onRefresh() {
      loadData();
    }

    socket.on('stock_updated', onStockUpdated);
    socket.on('stats_updated', onStatsUpdated);
    socket.on('activity_logged', onActivityLogged);
    socket.on('patterns_refresh', onRefresh);
    socket.on('categories_updated', onRefresh);

    return () => {
      socket.off('stock_updated', onStockUpdated);
      socket.off('stats_updated', onStatsUpdated);
      socket.off('activity_logged', onActivityLogged);
      socket.off('patterns_refresh', onRefresh);
      socket.off('categories_updated', onRefresh);
    };
  }, []);

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
    if (pattern.current_stock <= 0) {
      alert(`Désolé, le patron "${pattern.name_fr || pattern.name_ar}" est en rupture de stock`);
      return;
    }
    try {
      await patternsApi.deductOrder(pattern.id, 1, 'Expédition rapide -1');
      setFeedback(`1 pièce déduite pour "${pattern.name_fr || pattern.name_ar}"`);
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      alert(err.message || 'Échec de la déduction');
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
    if (!confirm(`Supprimer définitivement le patron "${pattern.name_fr || pattern.name_ar}" du catalogue ?`)) {
      return;
    }
    try {
      await patternsApi.delete(pattern.id);
      setFeedback(`Patron "${pattern.name_fr || pattern.name_ar}" supprimé`);
      setSelectedIds((prev) => prev.filter((id) => id !== pattern.id));
      await loadData();
      setTimeout(() => setFeedback(''), 3500);
    } catch (err) {
      alert(err.message || 'Échec de la suppression');
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
        <div className="sm:hidden mb-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-1.5 truncate">
              {activeTab === 'inventory' && (
                <>
                  <Layers className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>Stock ({patterns.length})</span>
                </>
              )}
              {activeTab === 'logs' && (
                <>
                  <History className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>Journal ({logs.length})</span>
                </>
              )}
              {activeTab === 'workers' && (
                <>
                  <Users className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>Opérateurs</span>
                </>
              )}
            </h2>

            {activeTab === 'inventory' && (
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
            )}
          </div>
        </div>

        {/* Desktop View Tabs Navigation */}
        <div className="hidden sm:flex items-center justify-between border-b border-[#E2E8F0] mb-5">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'inventory'
                  ? 'border-[#0F172A] text-[#0F172A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Stock & Commandes ({patterns.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'logs'
                  ? 'border-[#0F172A] text-[#0F172A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Journal d'audit ({logs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('workers')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'workers'
                  ? 'border-[#0F172A] text-[#0F172A]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Comptes opérateurs</span>
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

            {/* Patterns List / Cards */}
            <div className="bg-transparent sm:bg-white sm:rounded-2xl sm:border sm:border-[#E2E8F0] sm:shadow-xs sm:overflow-hidden">
              {/* Select All Control Bar */}
              <div className="p-3 bg-white sm:bg-[#F8F9FA] rounded-2xl sm:rounded-none border sm:border-0 sm:border-b border-[#E2E8F0] sm:border-slate-200 flex items-center justify-between text-xs text-slate-600 mb-3 sm:mb-0 shadow-xs sm:shadow-none">
                <div className="flex items-center gap-2">
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
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  Affichage de {patterns.length} modèle(s)
                </span>
              </div>

              {loading ? (
                <div className="py-20 text-center text-slate-400 text-xs bg-white rounded-2xl sm:rounded-none border sm:border-0 border-[#E2E8F0]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                  <span>Actualisation de l'inventaire...</span>
                </div>
              ) : patterns.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-2xl sm:rounded-none border sm:border-0 border-[#E2E8F0]">
                  Aucun patron ne correspond aux critères
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-0 sm:divide-y sm:divide-slate-100">
                  {patterns.map((pattern) => {
                    const isSelected = selectedIds.includes(pattern.id);
                    const isLowStock = pattern.current_stock <= pattern.low_stock_threshold;
                    const isOutOfStock = pattern.current_stock <= 0;

                    return (
                      <div
                        key={pattern.id}
                        className={`p-3 sm:p-3.5 bg-white rounded-xl sm:rounded-none border border-[#E2E8F0] sm:border-0 shadow-2xs sm:shadow-none hover:bg-[#F8F9FA]/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-2.5 ${
                          isSelected ? 'ring-2 ring-slate-800 bg-slate-50/60 sm:bg-slate-50 sm:ring-0' : ''
                        }`}
                      >
                        {/* Selection & Details */}
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <button
                            onClick={() => toggleSelectPattern(pattern.id)}
                            className="mt-0.5 text-slate-400 hover:text-slate-800 shrink-0 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#0F172A]" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Image Thumbnail */}
                          {pattern.image_url ? (
                            <img
                              src={pattern.image_url}
                              alt={pattern.name_fr}
                              onClick={() => setPreviewImage({ url: pattern.image_url, title: pattern.name_fr || pattern.name_ar, sku: pattern.sku })}
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg object-cover border border-slate-200 shadow-2xs hover:scale-105 cursor-pointer transition-transform shrink-0"
                              title="Cliquer pour agrandir la photo du patron"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Patron';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <span className="font-sku text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {pattern.sku}
                              </span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                {pattern.category}
                              </span>
                              {pattern.size_range && (
                                <span className="text-[10px] text-slate-400 font-sku">
                                  {pattern.size_range}
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-xs sm:text-sm text-[#0F172A] leading-snug">
                              {pattern.name_fr || pattern.name_ar}
                            </h4>
                            {pattern.name_ar && pattern.name_ar !== pattern.name_fr && (
                              <p className="text-[10px] text-slate-400 font-sku mt-0.5">
                                {pattern.name_ar}
                              </p>
                            )}
                            {pattern.notes && (
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                {pattern.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Mobile Actions: Touch-friendly & Non-overflowing */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 sm:hidden">
                          {/* Row 1: Stock Status Badge & Edit/Delete Buttons */}
                          <div className="flex items-center justify-between">
                            <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1.5 ${
                              isOutOfStock
                                ? 'bg-[#FEF2F2] text-[#B91C1C] border-red-200'
                                : isLowStock
                                ? 'bg-[#FFFBEB] text-[#B45309] border-amber-200'
                                : 'bg-[#F0FDF4] text-[#15803D] border-green-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isOutOfStock ? 'bg-[#B91C1C]' : isLowStock ? 'bg-[#B45309]' : 'bg-[#15803D]'
                              }`} />
                              <span className="font-sku text-xs font-extrabold">{pattern.current_stock} pcs</span>
                              <span className="text-[9px] font-normal text-slate-500">(seuil: {pattern.low_stock_threshold})</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditPattern(pattern);
                                  setEditModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Modifier le patron"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePattern(pattern)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer le patron"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Touch-friendly Quick Order Deduction Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleQuickDeductOne(pattern)}
                              disabled={isOutOfStock}
                              className="py-1.5 bg-[#FEF2F2] hover:bg-red-100 text-[#B91C1C] disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed text-xs font-bold rounded-lg border border-red-200 flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                            >
                              -1 Déduire
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
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden sm:flex items-center justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          
                          {/* Live Stock Count Badge */}
                          <div className="text-right">
                            <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${
                              isOutOfStock
                                ? 'bg-[#FEF2F2] text-[#B91C1C] border-red-200'
                                : isLowStock
                                ? 'bg-[#FFFBEB] text-[#B45309] border-amber-200'
                                : 'bg-[#F0FDF4] text-[#15803D] border-green-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isOutOfStock ? 'bg-[#B91C1C]' : isLowStock ? 'bg-[#B45309]' : 'bg-[#15803D]'
                              }`} />
                              <span className="font-sku text-xs font-bold">{pattern.current_stock}</span>
                              <span className="text-[10px] font-normal">pcs</span>
                            </div>
                            <div className="text-[9px] text-slate-400 text-center mt-0.5">
                              Seuil : {pattern.low_stock_threshold}
                            </div>
                          </div>

                          {/* Quick Order Deduction Buttons */}
                          <div className="flex items-center gap-1">
                            {/* Fast -1 Deduction */}
                            <button
                              onClick={() => handleQuickDeductOne(pattern)}
                              disabled={isOutOfStock}
                              title="Déduire 1 pièce (-1)"
                              className="px-2 py-1 bg-[#FEF2F2] hover:bg-red-100 text-[#B91C1C] disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed text-xs font-bold rounded-lg border border-red-200 transition-transform active:scale-95 cursor-pointer"
                            >
                              -1 Déduire
                            </button>

                            {/* Custom Order Deduction Modal */}
                            <button
                              onClick={() => {
                                setOrderPattern(pattern);
                                setOrderModalOpen(true);
                              }}
                              disabled={isOutOfStock}
                              title="Déduire une commande avec nom du client"
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed text-xs font-semibold rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer"
                            >
                              Déduire commande...
                            </button>
                          </div>

                          {/* Edit / Delete actions */}
                          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                            <button
                              onClick={() => {
                                setEditPattern(pattern);
                                setEditModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Modifier le patron"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePattern(pattern)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer le patron"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* Tab 2: Activity Logs Audit Trail */}
        {activeTab === 'logs' && (
          <ActivityLogFeed logs={logs} />
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
          onClick={() => setActiveTab('logs')}
          className={`flex flex-col items-center justify-center min-h-[48px] px-3 py-1 rounded-xl transition-colors ${
            activeTab === 'logs'
              ? 'text-[#0F172A] font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <History className={`w-5 h-5 mb-0.5 ${activeTab === 'logs' ? 'text-[#0F172A]' : 'text-slate-400'}`} />
          <span className="text-[10px]">Journal</span>
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
