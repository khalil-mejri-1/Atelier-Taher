import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Scissors, 
  Layers, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Coins
} from 'lucide-react';
import { patternsApi } from '../api';

export default function ProducePartsModal({
  isOpen,
  onClose,
  pattern,
  inProgressParts = [],
  onSuccess
}) {
  const [selectedPartId, setSelectedPartId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !pattern) return null;

  const parts = Array.isArray(pattern.parts) && pattern.parts.length > 0
    ? pattern.parts
    : [
        { id: 'part_1', name: 'Partie 1 (Haut)', name_ar: 'القسم الأول (الصدر/علوي)' },
        { id: 'part_2', name: 'Partie 2 (Bas)', name_ar: 'القسم الثاني (الظهر/سفلي)' }
      ];

  const totalParts = parts.length;
  const printedCount = inProgressParts.length;
  const unitPrice = typeof pattern.price === 'number' ? pattern.price : 0;

  // Find next unprinted part
  const nextUnprintedPart = parts.find((p) => !inProgressParts.includes(p.id));

  // Handle single part submission
  const handlePrintSinglePart = async (partId) => {
    const targetId = partId || selectedPartId || nextUnprintedPart?.id;
    if (!targetId) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await patternsApi.producePart(pattern.id, targetId, false);
      if (onSuccess) {
        onSuccess(res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement de la partie');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle complete all parts at once (+1 complete pattern)
  const handlePrintAllParts = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await patternsApi.producePart(pattern.id, null, true, 'Impression de toutes les parties ensemble');
      if (onSuccess) {
        onSuccess(res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de la validation du patron complet');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-150 text-left overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200/60">
              <Layers className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Impression des parties du patron
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
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
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Pattern Brief Card */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            {pattern.image_url ? (
              <img
                src={pattern.image_url}
                alt={pattern.name_fr}
                className="w-14 h-14 rounded-lg object-cover border border-slate-200 shadow-2xs"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Patron';
                }}
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400">
                <Scissors className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
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
              <span className="text-[10px] text-slate-400 block">Tarif patron</span>
              <span className="text-xs sm:text-sm font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                +{unitPrice.toFixed(3)} DT
              </span>
            </div>
          </div>

          {/* Progress Overview Bar */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <span>Progression :</span>
                <span className="font-mono">{printedCount} / {totalParts} parties imprimées</span>
              </span>
              <span className="font-bold text-indigo-700 font-mono text-[11px]">
                {Math.round((printedCount / totalParts) * 100)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-indigo-200/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${(printedCount / totalParts) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-indigo-900 mt-2" dir="rtl">
              {printedCount === 0 
                ? `ℹ️ يتكون هذا الموديل من ${totalParts} أقسام. يجب طباعة كافة الأقسام لاحتساب الباترون في رصيدك.`
                : printedCount === totalParts - 1
                ? `🔥 تبقت لك طباعة قسم واحد فقط لتأكيد إنجاز الباترون كاملاً والحصول على +${unitPrice.toFixed(3)} DT !`
                : `تمت طباعة ${printedCount} من أصل ${totalParts} أقسام.`}
            </p>
          </div>

          {/* Parts Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Sélectionnez la partie que vous venez d'imprimer :
            </label>
            <div className="space-y-2">
              {parts.map((part, index) => {
                const isAlreadyPrinted = inProgressParts.includes(part.id);
                const isSelected = selectedPartId === part.id || (!selectedPartId && nextUnprintedPart?.id === part.id && !isAlreadyPrinted);

                return (
                  <div
                    key={part.id || index}
                    onClick={() => {
                      if (!isAlreadyPrinted) {
                        setSelectedPartId(part.id);
                      }
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isAlreadyPrinted
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 cursor-default'
                        : isSelected
                        ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-200 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {isAlreadyPrinted ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-400 font-mono text-xs">
                            {index + 1}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-800">
                            {part.name || `Partie ${index + 1}`}
                          </span>
                          {isAlreadyPrinted && (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                              Imprimée ✓
                            </span>
                          )}
                        </div>
                        {part.name_ar && (
                          <p className="text-[11px] text-slate-500 font-medium" dir="rtl">
                            {part.name_ar}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isAlreadyPrinted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintSinglePart(part.id);
                        }}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimer</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer order-2 sm:order-1"
          >
            Fermer
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            {/* Print All Parts Shortcut */}
            <button
              type="button"
              onClick={handlePrintAllParts}
              disabled={submitting}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Tout imprimer (+1 complet)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

