import React, { useState } from 'react';
import { X, Check, Trash2, ArrowUpDown, Tag, AlertTriangle, Loader2 } from 'lucide-react';

const CATEGORIES = [
  'Chemises',
  'Pantalons',
  'Robes',
  'Abayas & Djellabas',
  'Vestes & Manteaux',
  'Enfants',
  'Sportswear'
];

export default function BulkActionModal({ 
  isOpen, 
  onClose, 
  selectedCount, 
  selectedIds, 
  onExecuteBulk,
  categories: availableCategories = []
}) {
  const categoryList = availableCategories.length > 0 ? availableCategories : CATEGORIES;
  const [activeAction, setActiveAction] = useState('adjust_stock'); // 'adjust_stock' | 'change_category' | 'delete'
  const [stockAdjustment, setStockAdjustment] = useState(5);
  const [targetCategory, setTargetCategory] = useState(categoryList[0] || 'Chemises');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || selectedCount === 0) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      let val = null;
      if (activeAction === 'adjust_stock') {
        val = stockAdjustment;
      } else if (activeAction === 'change_category') {
        val = targetCategory;
      }
      await onExecuteBulk(activeAction, selectedIds, val);
      onClose();
    } catch (err) {
      setError(err.message || 'Échec de l’exécution de l’action groupée');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 border border-[#E2E8F0] shadow-xl relative animate-in zoom-in-95 duration-150 text-left my-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="font-bold text-sm text-[#0F172A]">Action groupée sur les patrons sélectionnés</h3>
            <p className="text-[11px] text-slate-500">({selectedCount}) patron(s) sélectionné(s)</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
            {error}
          </div>
        )}

        {/* Action Type Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F8F9FA] rounded-xl border border-slate-200 mb-4">
          <button
            type="button"
            onClick={() => setActiveAction('adjust_stock')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeAction === 'adjust_stock'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Ajuster stock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAction('change_category')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeAction === 'change_category'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Catégorie</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAction('delete')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeAction === 'delete'
                ? 'bg-red-50 text-red-700 shadow-xs border border-red-200'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Supprimer</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeAction === 'adjust_stock' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Ajustement à appliquer (+ ou -) pour chaque patron sélectionné :
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(parseInt(e.target.value, 10) || 0)}
                  placeholder="Ex : +10 ou -5"
                  className="w-full px-3 py-2 text-sm font-bold border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {[+5, +10, +20, -5, -10].map((adj) => (
                  <button
                    key={adj}
                    type="button"
                    onClick={() => setStockAdjustment(adj)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                      stockAdjustment === adj
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {adj > 0 ? `+${adj}` : adj}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Cette valeur sera ajoutée à l'ensemble des {selectedCount} patrons sélectionnés. Le stock ne descendra jamais sous zéro.
              </p>
            </div>
          )}

          {activeAction === 'change_category' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Sélectionnez la nouvelle catégorie cible :
              </label>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-hidden focus:border-slate-800"
              >
                {categoryList.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-2">
                Les {selectedCount} patrons sélectionnés seront immédiatement transférés dans la catégorie "{targetCategory}".
              </p>
            </div>
          )}

          {activeAction === 'delete' && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex gap-2.5 items-start">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <div className="font-bold mb-1">Attention : Suppression irréversible</div>
                <div>
                  Vous vous apprêtez à supprimer définitivement ({selectedCount}) patron(s) ainsi que leur historique d'inventaire.
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                activeAction === 'delete'
                  ? 'bg-red-700 hover:bg-red-800 text-white'
                  : 'bg-[#0F172A] hover:bg-slate-800 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {activeAction === 'delete' 
                      ? `Confirmer la suppression (${selectedCount})` 
                      : `Appliquer aux (${selectedCount}) patrons`}
                  </span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
