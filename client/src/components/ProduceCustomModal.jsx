import React, { useState } from 'react';
import { Plus, Minus, X, Check, Scissors, Loader2 } from 'lucide-react';

export default function ProduceCustomModal({ isOpen, onClose, pattern, onProduce }) {
  const [quantity, setQuantity] = useState(5);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !pattern) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quantity <= 0) return;
    setIsSubmitting(true);
    try {
      await onProduce(pattern.id, quantity, notes);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-sm w-full p-5 border border-[#E2E8F0] shadow-xl relative animate-in zoom-in-95 duration-150 text-left my-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">Production de lot personnalisé</h3>
              <p className="text-[11px] text-slate-400 font-sku">{pattern.sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-700 mb-0.5">{pattern.name_fr || pattern.name_ar}</div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between bg-[#F8F9FA] p-2 rounded-xl border border-slate-100">
            <span>Stock actuel en entrepôt :</span>
            <span className="font-bold text-[#0F172A]">{pattern.current_stock} pièces</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quantity Stepper */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Quantité produite :</label>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg active:scale-95 transition-transform"
              >
                <Minus className="w-5 h-5" />
              </button>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24 h-12 text-center text-2xl font-extrabold text-[#0F172A] border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
              />

              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg active:scale-95 transition-transform"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Quick preset buttons */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[2, 5, 10, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuantity(preset)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    quantity === preset
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Optional notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Note opérationnelle (optionnel) :</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : Lot découpe matinale / Kraft 350g"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Enregistrement en cours...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmer +{quantity}</span>
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
