import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  UserCheck, 
  Layers, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Search, 
  Check, 
  Plus, 
  Trash2, 
  Package,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { workersApi, patternsApi, tasksApi } from '../api';
import { useDialog } from '../context/DialogContext';

export default function TaskAssignModal({ isOpen, onClose, onTaskCreated }) {
  const { notify } = useDialog();

  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  // Recherche et sélection des patrons
  const [allPatterns, setAllPatterns] = useState([]);
  const [patternSearch, setPatternSearch] = useState('');
  const [selectedPatterns, setSelectedPatterns] = useState([]); // [{ pattern_id, target_quantity, ... }]
  const [loadingPatterns, setLoadingPatterns] = useState(false);

  // Temps limite & Message
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Charger les ouvriers
    const loadWorkers = async () => {
      setLoadingWorkers(true);
      try {
        const res = await workersApi.getAll();
        // Filtrer uniquement les ouvriers actifs (ou tous les ouvriers)
        const activeWorkers = (res.workers || []).filter(
          (w) => w.role === 'worker' && w.status !== 'suspended'
        );
        setWorkers(activeWorkers.length > 0 ? activeWorkers : (res.workers || []));
        if (activeWorkers.length > 0 && !selectedWorkerId) {
          setSelectedWorkerId(activeWorkers[0].id || activeWorkers[0]._id);
        }
      } catch (err) {
        console.error('Erreur chargement ouvriers :', err);
      } finally {
        setLoadingWorkers(false);
      }
    };

    // Charger les patrons pour la sélection
    const loadPatterns = async () => {
      setLoadingPatterns(true);
      try {
        const res = await patternsApi.getAll({ limit: 100 });
        setAllPatterns(res.patterns || []);
      } catch (err) {
        console.error('Erreur chargement patrons :', err);
      } finally {
        setLoadingPatterns(false);
      }
    };

    loadWorkers();
    loadPatterns();
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrer les patrons selon la recherche
  const filteredPatterns = allPatterns.filter((p) => {
    if (!patternSearch.trim()) return true;
    const q = patternSearch.toLowerCase();
    return (
      p.sku?.toLowerCase().includes(q) ||
      p.name_fr?.toLowerCase().includes(q) ||
      p.name_ar?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  const isPatternSelected = (patternId) => {
    return selectedPatterns.some((item) => item.pattern_id === patternId);
  };

  const toggleSelectPattern = (pattern) => {
    if (isPatternSelected(pattern.id)) {
      setSelectedPatterns((prev) => prev.filter((it) => it.pattern_id !== pattern.id));
    } else {
      setSelectedPatterns((prev) => [
        ...prev,
        {
          pattern_id: pattern.id,
          sku: pattern.sku,
          name_fr: pattern.name_fr,
          name_ar: pattern.name_ar,
          category: pattern.category,
          image_url: pattern.image_url,
          target_quantity: 1,
        },
      ]);
    }
  };

  const updateQuantity = (patternId, qty) => {
    const val = Math.max(1, parseInt(qty, 10) || 1);
    setSelectedPatterns((prev) =>
      prev.map((item) => (item.pattern_id === patternId ? { ...item, target_quantity: val } : item))
    );
  };

  // Raccourcis pour la date limite
  const setQuickDueDate = (hoursToAdd, targetHour = null) => {
    const d = new Date();
    if (targetHour !== null) {
      if (hoursToAdd > 0) d.setDate(d.getDate() + 1);
      d.setHours(targetHour, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + hoursToAdd);
    }
    // Format YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setDueDate(localISOTime);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorkerId) {
      notify.error('Veuillez sélectionner un ouvrier / يرجى اختيار العامل');
      return;
    }
    if (selectedPatterns.length === 0) {
      notify.error('Veuillez sélectionner au moins un patron / يرجى تحديد باترون واحد على الأقل');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        worker_id: selectedWorkerId,
        pattern_items: selectedPatterns.map((item) => ({
          pattern_id: item.pattern_id,
          target_quantity: item.target_quantity || 1,
        })),
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        message: message.trim(),
      };

      const res = await tasksApi.create(payload);
      notify.success('Tâche envoyée avec succès à l’ouvrier ! / تم إرسال المهمة بنجاح');
      
      // Réinitialiser le formulaire
      setSelectedPatterns([]);
      setMessage('');
      setDueDate('');
      
      if (onTaskCreated) onTaskCreated(res.task);
      onClose();
    } catch (err) {
      notify.error(err.message || 'Erreur lors de l’envoi de la tâche');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center">
              <Send className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                إرسال مهمة باترونات لعامل
              </h2>
              <p className="text-[11px] text-slate-500">
                Assigner des patrons à découper ou confectionner à un ouvrier
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Étape 1 : Choisir l'ouvrier */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>1. اختيار العامل المعني (Sélectionner l'ouvrier) :</span>
              </span>
              <span className="text-[10px] text-amber-600 font-normal">* إجباري</span>
            </label>

            {loadingWorkers ? (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement des comptes ouvriers...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {workers.map((w) => {
                  const isSelected = selectedWorkerId === (w.id || w._id);
                  return (
                    <div
                      key={w.id || w._id}
                      onClick={() => setSelectedWorkerId(w.id || w._id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">{w.name}</div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                          @{w.username} {w.role === 'admin' ? '(Admin)' : ''}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-300 shrink-0 ml-1" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Étape 2 : Sélectionner les patrons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>2. تحديد الباترونات المطلوبة (Patrons à confectionner) :</span>
              </label>
              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                {selectedPatterns.length} محدد
              </span>
            </div>

            {/* Barre de recherche dans le catalogue */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={patternSearch}
                onChange={(e) => setPatternSearch(e.target.value)}
                placeholder="بحث في الباترونات بالاسم أو الكود (SKU)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-800 transition-colors"
              />
            </div>

            {/* Liste de sélection avec scroll */}
            <div className="border border-slate-200 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
              {loadingPatterns ? (
                <div className="p-4 text-center text-xs text-slate-400">Chargement des modèles...</div>
              ) : filteredPatterns.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Aucun modèle ne correspond à la recherche</div>
              ) : (
                filteredPatterns.map((p) => {
                  const selected = isPatternSelected(p.id);
                  const selectedItem = selectedPatterns.find((it) => it.pattern_id === p.id);
                  return (
                    <div
                      key={p.id}
                      className={`p-2 sm:p-2.5 flex items-center justify-between gap-2 transition-colors ${
                        selected ? 'bg-amber-50/60' : 'hover:bg-white'
                      }`}
                    >
                      <div 
                        onClick={() => toggleSelectPattern(p)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-0 cursor-pointer pointer-events-none"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                              {p.sku}
                            </span>
                            <span className="font-bold text-xs text-slate-800 truncate">
                              {p.name_fr || p.name_ar}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {p.category} • Stock dispo : {p.current_stock}
                          </div>
                        </div>
                      </div>

                      {/* Contrôle de la quantité si sélectionné */}
                      {selected && (
                        <div className="flex items-center gap-1.5 shrink-0 bg-white border border-amber-200 rounded-lg p-1 shadow-2xs">
                          <span className="text-[10px] text-slate-400 font-bold">Qté :</span>
                          <input
                            type="number"
                            min="1"
                            value={selectedItem?.target_quantity || 1}
                            onChange={(e) => updateQuantity(p.id, e.target.value)}
                            className="w-12 py-0.5 px-1 text-center font-mono font-bold text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-hidden"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Étape 3 : Délai / Heure limite (Optionnel) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>3. الوقت المحدد للإنجاز (Délai / Heure limite) :</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">اختياري (Optionnel)</span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-800 transition-colors font-mono"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="px-2.5 py-2 text-xs text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                >
                  مسح التاريخ
                </button>
              )}
            </div>

            {/* Boutons raccourcis rapides */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-400 font-semibold">اختصارات سريعة :</span>
              <button
                type="button"
                onClick={() => setQuickDueDate(2)}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                + ساعتين
              </button>
              <button
                type="button"
                onClick={() => setQuickDueDate(0, 18)}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                اليوم 18:00
              </button>
              <button
                type="button"
                onClick={() => setQuickDueDate(1, 10)}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                غداً 10:00
              </button>
              <button
                type="button"
                onClick={() => setQuickDueDate(1, 18)}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                غداً 18:00
              </button>
            </div>
          </div>

          {/* Étape 4 : Message ou consigne (Optionnel) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>4. رسالة أو تعليمات إضافية للعامل (Consignes particulières) :</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">اختياري (Optionnel)</span>
            </label>

            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="مثال: يرجى البدء بهذا الموديل أولاً والتأكد من مطابقة أبعاد الياقة..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-800 transition-colors leading-relaxed"
            />
          </div>

          {/* Bouton de validation */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || selectedPatterns.length === 0}
              className="w-full py-3 px-4 bg-[#0F172A] hover:bg-slate-800 active:scale-[0.98] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-300" />
                  <span>إرسال المهمة للعامل الآن ({selectedPatterns.length} باترون)</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

