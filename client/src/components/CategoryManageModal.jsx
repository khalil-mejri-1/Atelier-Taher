import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, Trash2, AlertCircle, Check, Folder, Layers } from 'lucide-react';
import { categoriesApi } from '../api';
import { useDialog } from '../context/DialogContext';

export default function CategoryManageModal({ isOpen, onClose, onCategoriesChanged }) {
  const { confirm, notify } = useDialog();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await categoriesApi.getAll();
      setCategories(res.categories || []);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setNewCategoryName('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setError('Veuillez saisir un nom pour la catégorie');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await categoriesApi.create(newCategoryName.trim());
      setSuccess(res.message || 'Catégorie ajoutée avec succès');
      setNewCategoryName('');
      await fetchCategories();
      if (onCategoriesChanged) {
        onCategoriesChanged();
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Échec de l’ajout de la catégorie');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const hasPatterns = cat.patternCount > 0;
    const confirmed = await confirm({
      title: "Supprimer la catégorie",
      titleAr: "تأكيد حذف الفئة",
      message: hasPatterns
        ? `Cette catégorie contient ${cat.patternCount} patron(s). En la supprimant, ces patrons seront automatiquement conservés et déplacés vers la catégorie "Autre".`
        : `Êtes-vous sûr de vouloir supprimer définitivement la catégorie "${cat.name}" ?`,
      messageAr: hasPatterns
        ? `تحتوي هذه الفئة على (${cat.patternCount}) باترون. سيتم نقل هذه الباترونات تلقائياً إلى فئة "Autre" لحمايتها من الضياع.`
        : `هل أنت متأكد من حذف فئة "${cat.name}" نهائياً من النظام؟`,
      type: "danger",
      confirmText: "Oui, supprimer / نعم، احذف الفئة",
      cancelText: "Annuler / تراجع"
    });

    if (!confirmed) {
      return;
    }

    setDeletingId(cat.id || cat._id);
    setError('');
    setSuccess('');

    try {
      const res = await categoriesApi.delete(cat.id || cat._id, 'Autre');
      const successMsg = res.message || `Catégorie "${cat.name}" supprimée`;
      setSuccess(successMsg);
      notify.success(successMsg);
      await fetchCategories();
      if (onCategoriesChanged) {
        onCategoriesChanged();
      }
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      const errorMsg = err.message || 'Échec de la suppression de la catégorie';
      setError(errorMsg);
      notify.error(errorMsg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 border border-[#E2E8F0] shadow-xl relative animate-in zoom-in-95 duration-150 text-left my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0F172A] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">
                Gestion des catégories
              </h3>
              <p className="text-[11px] text-slate-400">
                Ajoutez de nouvelles catégories ou supprimez les catégories inutilisées
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form to Add New Category */}
        <form onSubmit={handleAddCategory} className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Ajouter une nouvelle catégorie :
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex : Lingerie, Accessoires, Uniformes..."
                disabled={submitting}
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800 bg-[#F8F9FA]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !newCategoryName.trim()}
              className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{submitting ? 'Ajout...' : 'Ajouter'}</span>
            </button>
          </div>
        </form>

        {/* Categories List */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Catégories existantes ({categories.length})</span>
            <span className="text-[11px] text-slate-400">Patrons rattachés</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-50">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Chargement des catégories...
              </div>
            ) : categories.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Aucune catégorie enregistrée.
              </div>
            ) : (
              categories.map((cat) => {
                const hasPatterns = cat.patternCount > 0;
                const isDeleting = deletingId === (cat.id || cat._id);

                return (
                  <div
                    key={cat.id || cat._id || cat.name}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                        <Folder className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{cat.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                          hasPatterns
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {cat.patternCount} patron{cat.patternCount !== 1 ? 's' : ''}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={isDeleting}
                        title={
                          hasPatterns 
                            ? `Supprimer "${cat.name}" (${cat.patternCount} patrons seront déplacés vers "Autre")` 
                            : `Supprimer "${cat.name}"`
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

