import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Check, 
  Layers, 
  AlertCircle, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Link as LinkIcon, 
  Sparkles, 
  Tag, 
  Plus, 
  Coins, 
  Boxes, 
  Scissors, 
  FileText,
  Puzzle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
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

const QUICK_PRICES = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0];

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
    has_parts: false,
    parts: [],
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
      const patternParts = Array.isArray(pattern.parts) && pattern.parts.length > 0
        ? pattern.parts.map((p, idx) => ({
            id: p.id || `part_${idx + 1}`,
            name: p.name || `Partie ${idx + 1}`,
            name_ar: p.name_ar || `القسم ${idx + 1}`,
          }))
        : [];

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
        has_parts: Boolean(pattern.has_parts || patternParts.length > 0),
        parts: patternParts,
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
        has_parts: false,
        parts: [],
      });
    }
    setError('');
    setShowQuickAdd(false);
    setNewCategoryInput('');
  }, [pattern, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  // Sub-parts helper actions
  const handleToggleHasParts = (enabled) => {
    if (enabled && (!formData.parts || formData.parts.length === 0)) {
      setFormData((prev) => ({
        ...prev,
        has_parts: true,
        parts: [
          { id: 'part_1', name: 'Partie 1 (Haut / Devant)', name_ar: 'القسم الأول (الصدر / علوي)' },
          { id: 'part_2', name: 'Partie 2 (Bas / Dos)', name_ar: 'القسم الثاني (الظهر / سفلي)' },
        ],
      }));
    } else {
      setFormData((prev) => ({ ...prev, has_parts: enabled }));
    }
  };

  const handleAddPart = () => {
    const nextNum = (formData.parts?.length || 0) + 1;
    setFormData((prev) => ({
      ...prev,
      has_parts: true,
      parts: [
        ...(prev.parts || []),
        {
          id: `part_${nextNum}_${Math.random().toString(36).substring(2, 7)}`,
          name: `Partie ${nextNum}`,
          name_ar: `القسم ${nextNum}`,
        },
      ],
    }));
  };

  const handleRemovePart = (index) => {
    const updated = [...(formData.parts || [])];
    updated.splice(index, 1);
    setFormData((prev) => ({
      ...prev,
      parts: updated,
      has_parts: updated.length > 0,
    }));
  };

  const handleUpdatePart = (index, field, value) => {
    const updated = [...(formData.parts || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setFormData((prev) => ({ ...prev, parts: updated }));
    }
  };

  const handleApplyPartPreset = (presetType) => {
    let presetParts = [];
    if (presetType === 'haut_bas') {
      presetParts = [
        { id: 'part_1', name: 'Partie 1 : Haut / Veste / Devant', name_ar: 'القسم 1 : الجزء العلوي / سترة' },
        { id: 'part_2', name: 'Partie 2 : Bas / Pantalon / Jupe', name_ar: 'القسم 2 : الجزء السفلي / سروال' },
      ];
    } else if (presetType === 'devant_dos') {
      presetParts = [
        { id: 'part_1', name: 'Partie 1 : Devant et Col', name_ar: 'القسم 1 : الصدر والياقة' },
        { id: 'part_2', name: 'Partie 2 : Dos et Manches', name_ar: 'القسم 2 : الظهر والأكمام' },
      ];
    } else if (presetType === 'trois_pieces') {
      presetParts = [
        { id: 'part_1', name: 'Partie 1 : Veste / Manteau', name_ar: 'القسم 1 : السترة / معطف' },
        { id: 'part_2', name: 'Partie 2 : Pantalon', name_ar: 'القسم 2 : السروال' },
        { id: 'part_3', name: 'Partie 3 : Gilet / Accessoire', name_ar: 'القسم 3 : الصديري / ملحقات' },
      ];
    }
    setFormData((prev) => ({
      ...prev,
      has_parts: true,
      parts: presetParts,
    }));
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-200">
      {/* Click outside backdrop handler */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] sm:max-h-[88vh] my-auto overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Sticky Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#0F172A] flex items-center justify-center shrink-0 border border-slate-200/60">
              <Layers className="w-5 h-5 text-slate-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#0F172A]">
                  {isEdit ? 'Modifier le patron' : 'Ajouter un nouveau patron de couture'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isEdit ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isEdit ? 'Édition' : 'Nouveau'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit 
                  ? `Mise à jour de la référence : ${pattern.sku || pattern.name_fr}` 
                  : 'Enregistrer une nouvelle référence de patron de confection'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="pattern-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Section 1: Photo & Croquis technique */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-600" />
                <span>Photo ou croquis technique du modèle :</span>
              </label>

              {/* Mode Selector Tabs */}
              <div className="flex gap-1 text-[11px] bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto shadow-2xs">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    imageMode === 'upload' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fichier
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    imageMode === 'url' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lien URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('presets')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    imageMode === 'presets' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Modèles types
                </button>
              </div>
            </div>

            {/* Image Preview & Controls */}
            <div className="flex items-center gap-4">
              {formData.image_url ? (
                <div className="relative group shrink-0">
                  <img
                    src={formData.image_url}
                    alt="Aperçu patron"
                    className="w-18 h-18 rounded-xl object-cover border border-slate-300 shadow-sm"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Erreur';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                    title="Supprimer la photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-18 h-18 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-6 h-6 stroke-1 mb-1 text-slate-400" />
                  <span className="text-[10px] font-medium">Aucune</span>
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
                      className="py-2 px-3.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-slate-500" />
                      <span>{formData.image_url ? 'Remplacer l’image' : 'Importer depuis l’ordinateur'}</span>
                    </button>
                    <p className="text-[11px] text-slate-500 mt-1.5">Formats acceptés : JPG, PNG, WebP (jusqu'à 6 Mo)</p>
                  </div>
                )}

                {imageMode === 'url' && (
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          placeholder="https://exemple.com/image-patron.jpg"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Collez l'adresse web directe (URL) de l'image</p>
                  </div>
                )}

                {imageMode === 'presets' && (
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_IMAGES.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: preset.url })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                            formData.image_url === preset.url
                              ? 'bg-[#0F172A] text-white border-[#0F172A]'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">Choisissez un modèle prêt à l'emploi</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Désignation & Catégorie */}
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Name FR */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nom du patron (Français) <span className="text-red-500">*</span> :
                </label>
                <input
                  type="text"
                  required
                  value={formData.name_fr}
                  onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                  placeholder="Ex : Chemise Classique Homme"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              {/* Name AR */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nom en arabe (Optionnel) :
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="مثال : قميص رجالي كلاسيك"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-arabic text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Catégorie <span className="text-red-500">*</span> :
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(!showQuickAdd)}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-slate-500" />
                      <span>{showQuickAdd ? 'Fermer' : 'Ajouter'}</span>
                    </button>
                    {onOpenCategoryManager && (
                      <button
                        type="button"
                        onClick={onOpenCategoryManager}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>Gérer</span>
                      </button>
                    )}
                  </div>
                </div>

                {showQuickAdd && (
                  <div className="mb-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200 animate-in fade-in duration-150">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="Ex : Lingerie, Uniformes..."
                        disabled={addingCategory}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
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
                        className="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        {addingCategory ? '...' : 'Créer'}
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  {categoryList.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* SKU / Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Code référence (SKU) :
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  placeholder="Généré automatiquement si vide (ex: PAT-SHR-01)"
                  className="w-full px-3.5 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: NOUVEAU - Composants & Découpage en sous-parties (أقسام وأجزاء الباترون) */}
          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Puzzle className="w-4 h-4 text-indigo-700" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">
                    Composants & Parties à imprimer
                  </h4>
                  <p className="text-[11px] text-indigo-700 font-arabic" dir="rtl">
                    أقسام وأجزاء الباترون (يجب طباعة كافة الأقسام لاحتساب الباترون للعامل)
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => handleToggleHasParts(!formData.has_parts)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  formData.has_parts ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    formData.has_parts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {!formData.has_parts ? (
              /* Non-split / Standard 1-piece model */
              <div className="flex items-center justify-between p-3 bg-white/80 rounded-xl border border-indigo-100 text-xs">
                <div className="text-slate-600">
                  <span className="font-bold text-slate-800">Modèle standard (1 seule pièce) : </span>
                  <span className="text-[11px]">L'ouvrier valide l'impression du patron en une seule fois.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleHasParts(true)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 text-[11px] transition-colors cursor-pointer shrink-0"
                >
                  + Activer les sous-parties
                </button>
              </div>
            ) : (
              /* Multi-parts configuration */
              <div className="space-y-3 pt-1">
                {/* Presets and Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/90 p-2.5 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-indigo-900">
                      {formData.parts.length} parties définies
                    </span>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      Obligatoires pour valider 1 patron
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold">Modèles rapides :</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPartPreset('haut_bas')}
                      className="px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 text-indigo-700 border border-slate-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Haut + Bas (2)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPartPreset('devant_dos')}
                      className="px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 text-indigo-700 border border-slate-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Devant + Dos (2)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPartPreset('trois_pieces')}
                      className="px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 text-indigo-700 border border-slate-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      3 Pièces (3)
                    </button>
                  </div>
                </div>

                {/* Parts dynamic list */}
                <div className="space-y-2">
                  {formData.parts.map((part, index) => (
                    <div 
                      key={part.id || index}
                      className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs"
                    >
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                        <input
                          type="text"
                          value={part.name}
                          onChange={(e) => handleUpdatePart(index, 'name', e.target.value)}
                          placeholder={`Nom partie ${index + 1} (ex: Devant & Col)`}
                          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          dir="rtl"
                          value={part.name_ar}
                          onChange={(e) => handleUpdatePart(index, 'name_ar', e.target.value)}
                          placeholder={`الاسم بالعربية (مثال: الصدر والياقة)`}
                          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-arabic text-right"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePart(index)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Supprimer cette partie"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Part Button */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="py-1.5 px-3 bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une partie (إضافة قسم)</span>
                  </button>

                  <span className="text-[11px] text-indigo-600 font-medium">
                    {formData.parts.length} parties à imprimer
                  </span>
                </div>

                {/* Explanatory Banner */}
                <div className="p-2.5 rounded-xl bg-indigo-100/60 border border-indigo-200/80 text-[11px] text-indigo-950 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold" dir="rtl">
                      💡 ملاحظة هامة: عند تفعيل هذا الخيار، يجب على العامل طباعة وتأكيد إنجاز جميع الأجزاء ({formData.parts.length}) حتى يتم احتساب الباترون في المخزون وتُضاف أجرته إلى رصيده.
                    </p>
                    <p className="text-indigo-800 text-[10px]">
                      L'ouvrier cochera chaque partie au fur et à mesure de l'impression, et le stock (+1) ainsi que la rémunération ne seront validés qu'une fois les {formData.parts.length} parties terminées.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Tarif de production de la pièce (سعر إنجاز القطعة) */}
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>Tarif de fabrication pour l'ouvrier</span>
                <span className="text-emerald-700 font-normal">/ سعر إنجاز القطعة للعامل</span>
              </label>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  {parseFloat(formData.price || 0).toFixed(3)}
                </span>
                <span className="text-[10px] font-bold text-emerald-600">TND</span>
              </div>
            </div>

            <div className="relative mb-2">
              <input
                type="number"
                step="0.05"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="2.500"
                className="w-full pl-3.5 pr-20 py-2.5 text-sm font-mono font-bold bg-white text-slate-900 border border-emerald-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 shadow-2xs"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                DT / قطعة
              </div>
            </div>

            {/* Quick Price Shortcuts */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className="text-[10px] font-semibold text-emerald-800">Tarifs rapides :</span>
              {QUICK_PRICES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, price: p })}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    formData.price === p
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {p.toFixed(3)}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-emerald-800 flex items-center gap-1.5" dir="rtl">
              <span>💡</span>
              <span>يُضاف هذا المبلغ تلقائياً إلى رصيد وحساب العامل في كل مرة يسجل فيها إنتاج قطعة من هذا الموديل.</span>
            </p>
          </div>

          {/* Section 5: Stock & Alertes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Current Stock */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Stock initial disponible :
              </label>
              <div className="relative">
                <Boxes className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value, 10) || 0 })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>

            {/* Low stock threshold */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Seuil d'alerte (Stock faible) :
              </label>
              <div className="relative">
                <AlertCircle className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value, 10) || 1 })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Tailles, Matière et Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Size Range */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Gradation des tailles :
              </label>
              <input
                type="text"
                value={formData.size_range}
                onChange={(e) => setFormData({ ...formData, size_range: e.target.value })}
                placeholder="Ex : 38 - 50 / S - 3XL"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>

            {/* Material */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Matière du patron :
              </label>
              <input
                type="text"
                value={formData.material_type}
                onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                placeholder="Ex : Carton Kraft 350g"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notes techniques ou repères de confection :
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ex : Repères de montage col, crans de montage manches, parementure..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white resize-none"
            />
          </div>
        </form>

        {/* Pinned Sticky Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Appuyez sur <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">Échap</kbd> pour fermer
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="pattern-form"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial py-2.5 px-5 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{isEdit ? 'Mise à jour en cours...' : 'Enregistrement en cours...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isEdit ? 'Mettre à jour' : 'Enregistrer le patron'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
