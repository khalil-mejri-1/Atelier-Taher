import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Scissors, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Layers,
  RefreshCw
} from 'lucide-react';
import { patternsApi, logsApi } from '../api';
import { socket } from '../socket';
import UndoToast from '../components/UndoToast';
import ProduceCustomModal from '../components/ProduceCustomModal';
import ImagePreviewModal from '../components/ImagePreviewModal';

export default function WorkerView() {
  const [patterns, setPatterns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);

  // Undo Toast state
  const [undoData, setUndoData] = useState(null);

  // Image preview lightbox state
  const [previewImage, setPreviewImage] = useState(null);

  // Custom modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);

  // Success alert indicator
  const [flashMessage, setFlashMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [patRes, catRes, statsRes] = await Promise.all([
        patternsApi.getAll({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          search: search.trim() || undefined,
        }),
        patternsApi.getCategories(),
        logsApi.getStats()
      ]);
      setPatterns(patRes.patterns || []);
      setCategories(catRes.categories || []);
      setTodayCount(statsRes.producedToday || 0);
    } catch (err) {
      console.error('Erreur chargement patrons opérateur :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, search]);

  // Synchronisation temps réel via Socket.io
  useEffect(() => {
    function onStockUpdated(data) {
      setPatterns((prev) => 
        prev.map((p) => (p.id === data.pattern.id ? { ...p, current_stock: data.pattern.current_stock } : p))
      );
    }

    function onStatsUpdated(stats) {
      if (stats.producedToday !== undefined) {
        setTodayCount(stats.producedToday);
      }
    }

    function onRefresh() {
      loadData();
    }

    socket.on('stock_updated', onStockUpdated);
    socket.on('stats_updated', onStatsUpdated);
    socket.on('patterns_refresh', onRefresh);
    socket.on('categories_updated', onRefresh);

    return () => {
      socket.off('stock_updated', onStockUpdated);
      socket.off('stats_updated', onStatsUpdated);
      socket.off('patterns_refresh', onRefresh);
      socket.off('categories_updated', onRefresh);
    };
  }, []);

  // One-Tap +1 Production
  const handleProduceOne = async (pattern) => {
    try {
      setPatterns((prev) =>
        prev.map((p) => (p.id === pattern.id ? { ...p, current_stock: p.current_stock + 1 } : p))
      );
      setTodayCount((prev) => prev + 1);

      const res = await patternsApi.produce(pattern.id, 1, 'Production rapide +1');
      
      setUndoData({
        logId: res.logId,
        patternId: pattern.id,
        patternName: pattern.name_fr || pattern.name_ar,
        quantity: 1
      });

      setFlashMessage(`+1 enregistré pour "${pattern.name_fr || pattern.name_ar}"`);
      setTimeout(() => setFlashMessage(''), 2500);
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  // Custom quantity production
  const handleCustomProduce = async (patternId, quantity, notes) => {
    const pattern = patterns.find((p) => p.id === patternId);
    try {
      setPatterns((prev) =>
        prev.map((p) => (p.id === patternId ? { ...p, current_stock: p.current_stock + quantity } : p))
      );
      setTodayCount((prev) => prev + quantity);

      const res = await patternsApi.produce(patternId, quantity, notes);

      setUndoData({
        logId: res.logId,
        patternId,
        patternName: pattern ? (pattern.name_fr || pattern.name_ar) : 'Patron',
        quantity
      });

      setFlashMessage(`+${quantity} enregistré(s) avec succès`);
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
      setFlashMessage(`Opération annulée et stock restauré avec succès`);
      setTimeout(() => setFlashMessage(''), 3000);
      loadData();
    } catch (err) {
      alert(err.message || 'Échec de l’annulation de l’opération');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 text-left">
      
      {/* Worker Production Header Banner */}
      <div className="bg-white border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Scissors className="w-4 h-4" />
                </span>
                <h1 className="text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight">
                  Enregistrement de la production de patrons
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Interface atelier pour enregistrer instantanément les patrons de couture découpés
              </p>
            </div>

            {/* Today Production Stat Badge */}
            <div className="flex items-center gap-3 bg-[#F8F9FA] p-2.5 rounded-2xl border border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] text-[#15803D] border border-green-200 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Total de la vacation
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-[#15803D] font-sku">
                    +{todayCount}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">patrons coupés</span>
                </div>
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
          <div className="mt-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom (Chemise, Pantalon, Robe...) ou code SKU (PAT-SHR-01)..."
                className="w-full pl-10 pr-4 py-3 bg-white text-xs sm:text-sm border border-[#E2E8F0] rounded-2xl focus:outline-hidden focus:border-slate-800 shadow-2xs placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded-lg bg-slate-100"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50'
                }`}
              >
                Tous les patrons ({patterns.length})
              </button>

              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Main Pattern Cards Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            <span>Chargement des patrons en cours...</span>
          </div>
        ) : patterns.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-[#E2E8F0] max-w-md mx-auto my-12">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm mb-1">Aucun patron trouvé</h3>
            <p className="text-xs text-slate-400 mb-4">Essayez de modifier votre recherche ou sélectionnez une autre catégorie</p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
            {patterns.map((pattern) => {
              const isLowStock = pattern.current_stock <= pattern.low_stock_threshold;
              const isCritical = pattern.current_stock <= 3;

              return (
                <div
                  key={pattern.id}
                  className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#E2E8F0] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  {/* Top info */}
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <span className="font-sku text-[10px] font-bold text-slate-500 bg-[#F8F9FA] px-1.5 py-0.2 rounded border border-slate-200">
                        {pattern.sku}
                      </span>

                      {/* Stock Badge */}
                      <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
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
                    <div className="flex items-start gap-2.5 mb-2.5">
                      {pattern.image_url ? (
                        <div 
                          onClick={() => setPreviewImage({ url: pattern.image_url, title: pattern.name_fr || pattern.name_ar, sku: pattern.sku })}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-slate-200 shadow-2xs hover:border-slate-400 cursor-pointer shrink-0 group relative bg-white"
                          title="Cliquer pour agrandir le croquis"
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
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white bg-black/60 px-1 py-0.5 rounded">Agrandir</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <Scissors className="w-4 h-4 mb-0.5 text-slate-400" />
                          <span className="text-[8px] font-sku text-slate-400 font-medium">Patron</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xs sm:text-sm text-[#0F172A] leading-snug truncate">
                          {pattern.name_fr || pattern.name_ar}
                        </h3>
                        {pattern.name_ar && pattern.name_ar !== pattern.name_fr && (
                          <p className="text-[10px] text-slate-400 mb-1 truncate">
                            {pattern.name_ar}
                          </p>
                        )}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {pattern.category}
                          </span>
                          {pattern.size_range && (
                            <span className="text-[9px] text-slate-400 font-sku">
                              {pattern.size_range}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meta Specifications */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 bg-[#F8F9FA] p-2 rounded-lg border border-slate-100 mb-2.5">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Matière :</span>
                        <span className="font-semibold text-slate-700 truncate block">{pattern.material_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Gradation :</span>
                        <span className="font-semibold text-slate-700 truncate block">{pattern.size_range || 'Standard'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Production Buttons */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {/* One-Tap +1 Button */}
                      <button
                        onClick={() => handleProduceOne(pattern)}
                        className="flex-1 h-10 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-emerald-400 stroke-[3]" />
                        <span>+1 Produit</span>
                      </button>

                      {/* Quick +5 or Custom stepper */}
                      <button
                        onClick={() => {
                          setSelectedPattern(pattern);
                          setCustomModalOpen(true);
                        }}
                        title="Enregistrer une quantité personnalisée"
                        className="h-10 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-transform active:scale-95 border border-slate-200 cursor-pointer"
                      >
                        <span>+5 / Autre</span>
                      </button>
                    </div>

                    {isLowStock && (
                      <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Stock faible (seuil : {pattern.low_stock_threshold})</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

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
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] px-4 py-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Vacation en cours :</span>
            <span className="text-sm font-extrabold text-[#15803D] font-sku">+{todayCount} patrons</span>
          </div>
        </div>

        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-3 py-1.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold active:scale-95 transition-transform"
        >
          Haut de page ↑
        </button>
      </nav>

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
