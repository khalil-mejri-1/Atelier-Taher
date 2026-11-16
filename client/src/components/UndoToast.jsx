import React, { useEffect, useState } from 'react';
import { Undo2, X, CheckCircle2 } from 'lucide-react';

export default function UndoToast({ undoData, onUndo, onDismiss }) {
  const [timeLeft, setTimeLeft] = useState(6);

  useEffect(() => {
    if (!undoData) return;

    setTimeLeft(6);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [undoData]);

  if (!undoData) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-[#0F172A] text-white rounded-2xl p-4 shadow-2xl border border-slate-700 relative overflow-hidden">
        
        {/* Progress bar countdown */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <div 
            className="h-full bg-emerald-400 transition-all ease-linear"
            style={{ width: `${(timeLeft / 6) * 100}%`, transitionDuration: '1000ms' }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>+{undoData.quantity} enregistré avec succès</span>
                <span className="text-[10px] text-slate-400 font-sku">({timeLeft}s)</span>
              </div>
              <div className="text-[11px] text-slate-300 truncate max-w-[180px] sm:max-w-[220px]">
                {undoData.patternName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tactile Undo Button */}
            <button
              onClick={() => onUndo(undoData.logId)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0F172A] hover:bg-slate-100 font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Annuler</span>
            </button>

            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
