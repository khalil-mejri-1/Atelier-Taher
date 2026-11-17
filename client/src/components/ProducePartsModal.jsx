import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Scissors, 
  Layers, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  Loader2,
  PartyPopper
} from 'lucide-react';
import { patternsApi } from '../api';

export default function ProducePartsModal({
  isOpen,
  onClose,
  pattern,
  inProgressParts = [],
  onSuccess
}) {
  const [localPrinted, setLocalPrinted] = useState(inProgressParts || []);
  const [submittingPartId, setSubmittingPartId] = useState(null);
  const [submittingAll, setSubmittingAll] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'part' | 'completed', text: '' }
  const [completed, setCompleted] = useState(false);

  // Sync initial state whenever modal opens or pattern changes
  useEffect(() => {
    if (isOpen) {
      setLocalPrinted(inProgressParts || []);
      setSubmittingPartId(null);
      setSubmittingAll(false);
      setError('');
      setFeedback(null);
      setCompleted(false);
    }
  }, [isOpen, inProgressParts, pattern?.id]);

  if (!isOpen || !pattern) return null;

  const parts = Array.isArray(pattern.parts) && pattern.parts.length > 0
    ? pattern.parts
    : [
        { id: 'part_1', name: 'Partie 1 (Haut / Veste)', name_ar: 'القسم الأول (الجزء العلوي / الصدر)' },
        { id: 'part_2', name: 'Partie 2 (Bas / Pantalon)', name_ar: 'القسم الثاني (الجزء السفلي / الظهر)' }
      ];

  const totalParts = parts.length;
  const printedCount = localPrinted.length;
  const unitPrice = typeof pattern.price === 'number' ? pattern.price : 0;
  const isBusy = Boolean(submittingPartId || submittingAll);

  // Find next unprinted part
  const nextUnprintedPart = parts.find((p) => !localPrinted.includes(p.id));

  // Handle single part submission
  const handlePrintSinglePart = async (partId) => {
    const targetId = partId || nextUnprintedPart?.id;
    if (!targetId || isBusy || completed) return;

    setSubmittingPartId(targetId);
    setError('');
    setFeedback(null);

    try {
      const res = await patternsApi.producePart(pattern.id, targetId, false);
      
      const updatedList = res.printed_parts || Array.from(new Set([...localPrinted, targetId]));
      setLocalPrinted(updatedList);

      if (onSuccess) {
        onSuccess(res);
      }

      if (res.completed) {
        // All parts completed!
        setCompleted(true);
        setFeedback({
          type: 'completed',
          text: `🎉 مبروك! تم إنجاز وطباعة كافة أقسام الباترون بنجاح (+1 في المخزون وتمت إضافة +${unitPrice.toFixed(3)} DT إلى رصيدك)!`
        });

        // Automatically close after showing celebration
        setTimeout(() => {
          onClose();
        }, 2400);
      } else {
        // Intermediate part printed successfully: KEEP MODAL OPEN!
        const targetObj = parts.find((p) => p.id === targetId);
        const partName = targetObj ? (targetObj.name_ar || targetObj.name) : targetId;
        setFeedback({
          type: 'part',
          text: `✅ تم تسجيل طباعة "${partName}" بنجاح! (${updatedList.length}/${totalParts}) يرجى طباعة القسم التالي لاكتمال الباترون واحتساب رصيدك.`
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erreur lors de l’enregistrement de la partie / حدث خطأ أثناء التسجيل');
    } finally {
      setSubmittingPartId(null);
    }
  };

  // Handle complete all parts at once (+1 complete pattern)
  const handlePrintAllParts = async () => {
    if (isBusy || completed) return;

    setSubmittingAll(true);
    setError('');
    setFeedback(null);

    try {
      const res = await patternsApi.producePart(pattern.id, null, true, 'Impression de toutes les parties ensemble');
      setLocalPrinted(parts.map((p) => p.id));
      setCompleted(true);
      setFeedback({
        type: 'completed',
        text: `🎉 ممتاز! تم تأكيد إنجاز وطباعة كافة الأقسام معاً (+1 في المخزون وتمت إضافة +${unitPrice.toFixed(3)} DT إلى رصيدك)!`
      });

      if (onSuccess) {
        onSuccess(res);
      }

      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erreur lors de la validation du patron complet / خطأ أثناء التأكيد');
    } finally {
      setSubmittingAll(false);
    }
  };

  const progressPercentage = Math.min(100, Math.round((printedCount / totalParts) * 100));

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
                ? 'bg-emerald-500 text-white border-emerald-600' 
                : 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
            }`}>
              {completed ? <Sparkles className="w-5 h-5 text-white" /> : <Layers className="w-5 h-5 text-indigo-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Impression des parties du patron
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  completed ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {totalParts} parties
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                طباعة أقسام الباترون لاحتساب الإنتاج
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

        {/* Content Area */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Feedback & Progress Messages */}
          {feedback && (
            <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 animate-in zoom-in-95 duration-200 ${
              feedback.type === 'completed'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md font-bold'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold'
            }`}>
              {feedback.type === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              )}
              <div className="leading-relaxed" dir="rtl">
                {feedback.text}
              </div>
            </div>
          )}

          {/* Pattern Brief Card */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
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
              <span className="text-[10px] text-slate-400 block font-semibold">Tarif patron</span>
              <span className="text-xs sm:text-sm font-sku font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 inline-block">
                +{unitPrice.toFixed(3)} DT
              </span>
            </div>
          </div>

          {/* Progress Overview Bar */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            completed 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-indigo-50/70 border-indigo-100'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>Progression / نسبة الإنجاز :</span>
                <span className="font-sku text-indigo-700 font-extrabold">{printedCount} / {totalParts} parties</span>
              </span>
              <span className={`font-bold font-sku text-xs ${
                completed ? 'text-emerald-700' : 'text-indigo-700'
              }`}>
                {progressPercentage}%
              </span>
            </div>
            
            <div className="w-full h-3 bg-slate-200/70 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-400 ease-out ${
                  completed ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-600 mt-2 font-medium" dir="rtl">
              {printedCount === 0 
                ? `ℹ️ يتكون هذا الموديل من ${totalParts} أقسام. يجب طباعة كافة الأقسام لاحتساب الباترون في رصيدك.`
                : completed
                ? `🎉 اكتمل الباترون بنجاح! تم احتساب +1 قطعة و +${unitPrice.toFixed(3)} DT في رصيدك اليومي.`
                : printedCount === totalParts - 1
                ? `🔥 تبقت لك طباعة قسم واحد فقط لتأكيد إنجاز الباترون كاملاً والحصول على +${unitPrice.toFixed(3)} DT !`
                : `تمت طباعة ${printedCount} من أصل ${totalParts} أقسام.`}
            </p>
          </div>

          {/* Parts Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Sélectionnez la partie que vous venez d'imprimer / اضغط طباعة عند إنجاز القسم :
            </label>
            <div className="space-y-2.5">
              {parts.map((part, index) => {
                const isAlreadyPrinted = localPrinted.includes(part.id);
                const isPrintingThis = submittingPartId === part.id;
                const isNext = !isAlreadyPrinted && nextUnprintedPart?.id === part.id;

                return (
                  <div
                    key={part.id || index}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isAlreadyPrinted
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                        : isNext
                        ? 'bg-white border-indigo-400 ring-2 ring-indigo-100 shadow-xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status Icon */}
                      <div className="shrink-0">
                        {isAlreadyPrinted ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        ) : (
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-sku font-bold text-xs ${
                            isNext ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-slate-300 text-slate-400 bg-slate-50'
                          }`}>
                            {index + 1}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold truncate ${
                            isAlreadyPrinted ? 'text-emerald-950 line-through decoration-emerald-500/50' : 'text-slate-900'
                          }`}>
                            {part.name || `Partie ${index + 1}`}
                          </span>
                          {isAlreadyPrinted && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span>✓ Imprimée (تمت الطباعة)</span>
                            </span>
                          )}
                        </div>
                        {part.name_ar && (
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5" dir="rtl">
                            {part.name_ar}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Button for this part */}
                    <div className="shrink-0">
                      {isAlreadyPrinted ? (
                        <div className="px-3 py-1.5 bg-emerald-100/90 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Prêt</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy || completed}
                          onClick={() => handlePrintSinglePart(part.id)}
                          className={`px-3.5 py-2 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50 ${
                            isNext ? 'bg-indigo-600 hover:bg-indigo-700 ring-2 ring-indigo-200' : 'bg-slate-800 hover:bg-slate-900'
                          }`}
                        >
                          {isPrintingThis ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Enregistrement...</span>
                            </>
                          ) : (
                            <>
                              <Printer className="w-3.5 h-3.5" />
                              <span>Imprimer / طباعة</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer order-2 sm:order-1"
          >
            {completed ? 'Terminer & Fermer' : 'Fermer / إغلاق'}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            {/* Print All Parts Shortcut */}
            {!completed && (
              <button
                type="button"
                onClick={handlePrintAllParts}
                disabled={isBusy}
                className="w-full sm:w-auto py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                title="Valider toutes les parties ensemble si vous les avez imprimées"
              >
                {submittingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Validation du patron complet...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Tout imprimer (+1 complet)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
