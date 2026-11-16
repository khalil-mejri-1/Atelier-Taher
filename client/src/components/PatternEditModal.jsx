import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Layers, AlertCircle, Upload, Image as ImageIcon, Trash2, Link as LinkIcon, Sparkles, Tag, Plus } from 'lucide-react';
import { categoriesApi } from '../api';

const DEFAULT_CATEGORIES = [
  'Chemises',
  'Pantalons',
  'Robes',
  'Abayas & Djellabas',
  'Vestes & Manteaux',
  'Enfants',
  'Sportswear'
];

const PRESET_IMAGES = [
  { label: 'Chemise', url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=500&q=80' },
  { label: 'Pantalon', url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=500&q=80' },
  { label: 'Robe', url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=500&q=80' },
  { label: 'Abaya', url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=500&q=80' },
  { label: 'Veste / Blazer', url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=500&q=80' },
  { label: 'Hoodie', url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=500&q=80' },
  { label: 'Enfants', url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=500&q=80' },
  { label: 'Jean', url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=500&q=80' },
];

export default function PatternEditModal({ 
  isOpen, 
  onClose, 
  pattern, 
  onSave, 
  categories: initialCategories = [], 
  onOpenCategoryManager 
}) {
  const [categoryList, setCategoryList] = useState(
    initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES
  );
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const [formData, setFormData] = useState({
    sku: '',
    name_fr: '',
    name_ar: '',
    category: 'Chemises',
    current_stock: 0,
    low_stock_threshold: 10,
    price: 0,
    size_range: 'S - XXL',
    material_type: 'Carton Kraft 350g',
    notes: '',
    image_url: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url' | 'presets'
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialCategories.length > 0) {
      setCategoryList(initialCategories);
    }
  }, [initialCategories]);

  useEffect(() => {
    if (pattern) {
      setFormData({
        sku: pattern.sku || '',
        name_fr: pattern.name_fr || pattern.name_ar || '',
        name_ar: pattern.name_ar || '',
        category: pattern.category || (categoryList[0] || 'Chemises'),
        current_stock: pattern.current_stock ?? 0,
        low_stock_threshold: pattern.low_stock_threshold ?? 10,
        price: pattern.price ?? 0,
        size_range: pattern.size_range || 'S - XXL',
        material_type: pattern.material_type || 'Carton Kraft 350g',
        notes: pattern.notes || '',
        image_url: pattern.image_url || '',
      });
    } else {
      setFormData({
        sku: '',
        name_fr: '',
        name_ar: '',
        category: categoryList[0] || 'Chemises',
        current_stock: 10,
        low_stock_threshold: 8,
        price: 2.500,
        size_range: '38 - 48 (S - XXL)',
        material_type: 'Carton Kraft 350g',
        notes: '',
        image_url: '',
      });
    }
    setError('');
    setShowQuickAdd(false);
    setNewCategoryInput('');
  }, [pattern, isOpen]);

  const handleQuickAddCategory = async () => {
    if (!newCategoryInput.trim()) return;
    setAddingCategory(true);
    setError('');
    try {
      const res = await categoriesApi.create(newCategoryInput.trim());
      const newName = res.category.name;
      const updated = Array.from(new Set([...categoryList, newName])).sort();
      setCategoryList(updated);
      setFormData((prev) => ({ ...prev, category: newName }));
      setNewCategoryInput('');
      setShowQuickAdd(false);
    } catch (err) {
      setError(err.message || 'Erreur lors de l’ajout de la catégorie');
    } finally {
      setAddingCategory(false);
    }
  };

  if (!isOpen) return null;

  const isEdit = Boolean(pattern);

  // Handle local file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP)');
      return;
    }

    // Check size < 6MB
    if (file.size > 6 * 1024 * 1024) {
      setError('La taille de l’image ne doit pas dépasser 6 Mo');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({ ...prev, image_url: event.target.result }));
      setError('');
    };
    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name_fr || !formData.category) {
      setError('Veuillez remplir les champs obligatoires : Nom du patron et Catégorie');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSave(formData, pattern?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement du patron');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 border border-[#E2E8F0] shadow-xl relative animate-in zoom-in-95 duration-150 text-left my-4 sm:my-8"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0F172A] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">
                {isEdit ? 'Modifier le patron' : 'Ajouter un nouveau patron de couture'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEdit ? `Mise à jour : ${pattern.name_fr || pattern.sku}` : 'Enregistrer une nouvelle référence dans le catalogue'}
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

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Section Photo / Image du Patron */}
          <div className="p-3.5 bg-[#F8F9FA] rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-slate-600" />
                <span>Photo ou croquis technique du modèle :</span>
              </label>

              {/* Mode Selector Tabs */}
              <div className="flex gap-1 text-[11px] bg-white p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    imageMode === 'upload' ? 'bg-[#0F172A] text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Fichier
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    imageMode === 'url' ? 'bg-[#0F172A] text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Lien URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('presets')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    imageMode === 'presets' ? 'bg-[#0F172A] text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Modèles
                </button>
              </div>
            </div>

            {/* Image Preview & Upload Controls */}
            <div className="flex items-center gap-3">
              {formData.image_url ? (
                <div className="relative group shrink-0">
                  <img
                    src={formData.image_url}
                    alt="Aperçu patron"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-300 shadow-xs"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Erreur';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-700 transition-colors"
                    title="Supprimer la photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-6 h-6 stroke-1 mb-0.5" />
                  <span className="text-[9px]">Aucune</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                {imageMode === 'upload' && (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formData.image_url ? 'Changer l’image' : 'Importer depuis l’ordinateur'}</span>
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1">Formats : JPG, PNG, WebP (max 6 Mo)</p>
                  </div>
                )}

                {imageMode === 'url' && (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://exemple.com/patron.jpg"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Collez l'adresse web directe de l'image</p>
                  </div>
                )}

                {imageMode === 'presets' && (
                  <div>
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {PRESET_IMAGES.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: preset.url })}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 whitespace-nowrap transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Sélectionnez un croquis technique de référence</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Catégorie <span className="text-red-500">*</span> :
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-slate-500" />
                  <span>{showQuickAdd ? 'Fermer' : 'Nouvelle catégorie'}</span>
                </button>

                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryManager}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>Gérer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Add Inline Input */}
            {showQuickAdd && (
              <div className="mb-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in duration-150">
                <p className="text-[10px] font-semibold text-slate-500 mb-1">Ajouter une nouvelle catégorie au catalogue :</p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="Ex : Lingerie, Accessoires, Uniformes..."
                    disabled={addingCategory}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:border-slate-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddCategory}
                    disabled={addingCategory || !newCategoryInput.trim()}
                    className="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                  >
                    {addingCategory ? '...' : 'Ajouter'}
                  </button>
                </div>
              </div>
            )}

            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-hidden focus:border-slate-800"
            >
              {categoryList.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Name FR */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nom du patron (Français) <span className="text-red-500">*</span> :
            </label>
            <input
              type="text"
              required
              value={formData.name_fr}
              onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
              placeholder="Ex : Chemise Classique Homme Coupe Droite"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
            />
          </div>

          {/* Name AR (Optionnel) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nom en arabe (Optionnel) :
            </label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder="Ex : قميص رجالي كلاسيك"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
            />
          </div>

          {/* Price / Tarif de production de la pièce */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-emerald-900">
                Tarif / Prix de la pièce (DT) - سعر إنجاز القطعة للعامل :
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                {parseFloat(formData.price || 0).toFixed(3)} TND
              </span>
            </div>
            <input
              type="number"
              step="0.05"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              placeholder="Ex : 2.500"
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-white text-slate-900 border border-emerald-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-emerald-700 mt-1">
              💡 يضاف هذا المبلغ آلياً إلى رصيد وحساب العامل في كل مرة يقوم فيها بإنتاج قطعة من هذا الموديل.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Current Stock */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stock initial en entrepôt :
              </label>
              <input
                type="number"
                min="0"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 text-xs font-bold border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
              />
            </div>

            {/* Low stock threshold */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seuil d'alerte (Stock faible) :
              </label>
              <input
                type="number"
                min="1"
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-2 text-xs font-bold border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Size Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gradation des tailles :
              </label>
              <input
                type="text"
                value={formData.size_range}
                onChange={(e) => setFormData({ ...formData, size_range: e.target.value })}
                placeholder="Ex : 38 - 50 / S - 3XL"
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
              />
            </div>

            {/* Material */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Matière du patron :
              </label>
              <input
                type="text"
                value={formData.material_type}
                onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                placeholder="Ex : Carton Kraft 350g"
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes techniques ou repères de confection :
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ex : Comprend repères de montage, poche poitrine, parementure..."
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Enregistrement...' : (isEdit ? 'Mettre à jour' : 'Ajouter le patron')}</span>
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
