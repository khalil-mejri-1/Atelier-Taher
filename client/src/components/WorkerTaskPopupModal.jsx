import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Package, 
  MessageSquare, 
  Sparkles, 
  AlertTriangle,
  Layers,
  Check,
  Loader2,
  ExternalLink
} from 'lucide-react';

export default function WorkerTaskPopupModal({ task, onAcknowledge, onPreviewImage }) {
  const [loading, setLoading] = useState(false);

  // Réinitialiser systématiquement l'état de chargement dès qu'une tâche est affichée
  useEffect(() => {
    setLoading(false);
  }, [task?._id, task?.id]);

  if (!task) return null;

  const handleConfirm = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loading) return;
    setLoading(true);
    try {
      await onAcknowledge(task._id || task.id);
    } catch (err) {
      console.error('Erreur confirmation tâche :', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formattedDue = formatDueDate(task.due_date);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200"
      // Interdire toute fermeture en cliquant à l'extérieur
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-amber-300 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec bandeau d'alerte prioritaire */}
        <div className="bg-linear-to-r from-amber-500 via-amber-600 to-amber-700 px-5 py-4 text-white shrink-0 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
            <BellRing className="w-28 h-28" />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
              <BellRing className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">
                  مهمة جديدة من الإدارة
                </span>
                <span className="text-[10px] text-amber-100 font-mono">
                  {new Date(task.created_at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                Nouvelle tâche assignée • تعليمات عمل جديدة
              </h2>
            </div>
          </div>
        </div>

        {/* Corps déroulant */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm">
          
          {/* Information émetteur & Délai */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Émetteur */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">
                {task.admin_name ? task.admin_name[0] : 'A'}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">المرسل (Direction)</div>
                <div className="font-bold text-slate-800 text-xs truncate">
                  {task.admin_name || "L'administration"}
                </div>
              </div>
            </div>

            {/* Échéance / Temps imparti */}
            <div className={`rounded-2xl p-3 border flex items-center gap-2.5 ${
              formattedDue 
                ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                formattedDue ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
              }`}>
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-500">
                  الوقت المحدد للإنجاز
                </div>
                <div className="font-black text-xs truncate">
                  {formattedDue ? formattedDue : 'اختياري (sans délai strict)'}
                </div>
              </div>
            </div>
          </div>

          {/* Message de l'admin (si présent) */}
          {task.message && (
            <div className="bg-amber-50/90 border-2 border-amber-200 rounded-2xl p-3.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span>رسالة الإدارة / Instructions de l'atelier :</span>
              </div>
              <p className="text-slate-800 text-xs sm:text-sm whitespace-pre-line leading-relaxed font-medium bg-white/70 p-2.5 rounded-xl border border-amber-100">
                {task.message}
              </p>
            </div>
          )}

          {/* Liste des patrons à découper / confectionner */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>النماذج المطلوب إنجازها ({task.patterns?.length || 0}) :</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Patrons requis</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {task.patterns?.map((item, idx) => {
                const hasImg = Boolean(item.image_url);
                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition-colors gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Image Thumbnail */}
                      <div 
                        onClick={() => hasImg && onPreviewImage && onPreviewImage(item.image_url, item.name_fr || item.name_ar)}
                        className={`w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden ${hasImg ? 'cursor-pointer hover:opacity-80' : ''}`}
                      >
                        {hasImg ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      {/* Info patron */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                            {item.sku || 'PAT'}
                          </span>
                          {item.category && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              • {item.category}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-slate-900 truncate mt-0.5">
                          {item.name_fr || item.name_ar || 'Modèle patron'}
                        </div>
                        {item.name_ar && item.name_fr && (
                          <div className="text-[10px] text-slate-500 truncate font-arabic">
                            {item.name_ar}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantité demandée */}
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400">الكمية المطلوبة</div>
                      <span className="inline-block px-2.5 py-1 rounded-xl bg-[#0F172A] text-white font-mono font-bold text-xs shadow-2xs">
                        × {item.target_quantity || 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rappel d'action obligatoire */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-[11px] text-blue-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
            <span>
              يرجى النقر على زر <strong>"اطلعت عليها"</strong> في الأسفل لتأكيد استلامك للمهمة وإشعار الإدارة فوراً.
            </span>
          </div>

        </div>

        {/* Footer avec le bouton OBLIGATOIRE "اطلعت عليها" */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={(e) => handleConfirm(e)}
            className="w-full py-3.5 px-4 bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري إشعار الإدارة...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span className="tracking-wide">اطلعت عليها / J'ai pris connaissance</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

