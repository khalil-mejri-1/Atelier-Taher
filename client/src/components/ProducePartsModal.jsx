import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Scissors, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  Loader2,
  CheckCheck
} from 'lucide-react';
import { patternsApi } from '../api';

export default function ProducePartsModal({
  isOpen,
  onClose,
  pattern,
  onSuccess
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubmitting(false);
      setError('');
      setCompleted(false);
    }
  }, [isOpen, pattern?.id]);

  if (!isOpen || !pattern) return null;

  const parts = Array.isArray(pattern.parts) && pattern.parts.length > 0
    ? pattern.parts
    : [
        { id: 'part_1', name: 'Partie 1 (Haut / Veste)', name_ar: 'القسم الأول (الجزء العلوي / الصدر)' },
        { id: 'part_2', name: 'Partie 2 (Bas / Pantalon)', name_ar: 'القسم الثاني (الجزء السفلي / الظهر)' }
      ];

  const totalParts = parts.length;
  const unitPrice = typeof pattern.price === 'number' ? pattern.price : 0;

  // Single button handler: Completes ALL parts and tasks at once
  const handleCompleteAllTasks = async () => {
    if (submitting || completed) return;

    setSubmitting(true);
    setError('');

    try {
      // Validate all parts together
      const res = await patternsApi.producePart(
        pattern.id, 
        null, 
        true, 
        `Impression et confection de toutes les (${totalParts}) parties du patron`
      );

      setCompleted(true);

      if (onSuccess) {
        onSuccess(res);
      }

      // Automatically close after displaying celebration
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erreur lors de la validation des tâches / حدث خطأ أثناء تأكيد الإنجاز');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-150 text-left overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              completed 
                ? 'bg-emerald-600 text-white border-emerald-700' 
                : 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
            }`}>
              {completed ? <CheckCheck className="w-5 h-5 text-white stroke-[2.5]" /> : <Layers className="w-5 h-5 text-indigo-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Impression des parties du patron
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  completed ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {totalParts} parties / {totalParts} أقسام
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تأكيد إنجاز وطباعة أقسام الباترون لاحتساب الإنتاج
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Celebration Success Banner when completed */}
          {completed && (
            <div className="p-4 rounded-2xl bg-emerald-600 text-white border border-emerald-700 shadow-lg animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCheck className="w-6 h-6 text-white stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base" dir="rtl">
                    🎉 تم إنجاز وطباعة جميع المهام والأقسام بنجاح!
                  </h4>
                  <p className="text-xs text-emerald-100 mt-0.5" dir="rtl">
                    تمت إضافة <strong>+1 قطعة</strong> إلى المخزون، واحتساب <strong>+{unitPrice.toFixed(3)} DT</strong> في رصيدك.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pattern Card */}
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            {pattern.image_url ? (
              <img
                src={pattern.image_url}
                alt={pattern.name_fr}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Patron';
                }}
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <Scissors className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-sku text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {pattern.sku}
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  {pattern.category}
                </span>
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate mt-0.5">
                {pattern.name_fr || pattern.name_ar}
              </h4>
              {pattern.name_ar && pattern.name_ar !== pattern.name_fr && (
                <p className="text-[11px] text-slate-500 truncate" dir="rtl">
                  {pattern.name_ar}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Tarif pièce</span>
              <span className="text-xs sm:text-sm font-sku font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 inline-block">
                +{unitPrice.toFixed(3)} DT
              </span>
            </div>
          </div>

          {/* Parts List / Checklist overview (No confusing individual buttons!) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                الأقسام المكونة لهذا الباترون ({totalParts} أقسام) :
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {completed ? '✓ مكتمل' : 'مطلوب إنجازها معاً'}
              </span>
            </div>

            <div className="space-y-2">
              {parts.map((part, index) => (
                <div
                  key={part.id || index}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    completed
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-sku font-bold text-xs shrink-0 ${
                      completed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      {completed ? <Check className="w-4 h-4 stroke-[3]" /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">
                        {part.name || `Partie ${index + 1}`}
                      </div>
                      {part.name_ar && (
                        <p className="text-[11px] text-slate-500 font-medium truncate" dir="rtl">
                          {part.name_ar}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      completed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {completed ? '✓ تم الإنجاز' : 'مطلوب'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation Banner */}
          {!completed && (
            <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs text-amber-900" dir="rtl">
              💡 <strong>تنبيه :</strong> عند إنهائك لطباعة وقص كافة أقسام الباترون أعلاه، اضغط على الزر أدناه لتأكيد إنجاز الباترون كاملاً واحتساب السعر مباشرة في رصيدك.
            </div>
          )}

        </div>

        {/* Modal Action Area - ONE SINGLE PROMINENT BUTTON */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer order-2 sm:order-1"
          >
            {completed ? 'إغلاق النافذة' : 'إلغاء / Fermer'}
          </button>

          <div className="w-full sm:flex-1 order-1 sm:order-2">
            {!completed ? (
              <button
                type="button"
                onClick={handleCompleteAllTasks}
                disabled={submitting}
                className="w-full py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>جاري تسجيل إنجاز كافة الأقسام...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-5 h-5 text-white stroke-[2.5]" />
                    <span>تم إنجاز جميع المهام والأقسام (+1 كامل)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full py-2.5 px-4 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم تأكيد العملية واحتساب +{unitPrice.toFixed(3)} DT بنجاح!</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
