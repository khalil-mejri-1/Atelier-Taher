import React, { useState } from 'react';
import { PackageMinus, X, Check, AlertCircle } from 'lucide-react';

export default function OrderFulfillModal({ isOpen, onClose, pattern, onDeduct }) {
  const [quantity, setQuantity] = useState(1);
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !pattern) return null;

  const currentStock = pattern.current_stock || 0;
  const isOutOfStock = currentStock <= 0;
  const isExceeding = quantity > currentStock;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Veuillez saisir une quantité valide');
      return;
    }
    if (quantity > currentStock) {
      setError(`Le stock disponible (${currentStock}) est insuffisant pour déduire (${quantity}) pièces`);
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onDeduct(pattern.id, quantity, clientName, notes);
      onClose();
    } catch (err) {
      setError(err.message || 'Échec de la déduction de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 border border-[#E2E8F0] shadow-xl relative animate-in zoom-in-95 duration-150 text-left"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center border border-red-200">
              <PackageMinus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">Déduire une commande client</h3>
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
          
          <div className="mt-2.5 p-2.5 rounded-xl border flex items-center justify-between text-xs bg-[#F8F9FA] border-slate-200">
            <span className="text-slate-500">Stock disponible actuellement :</span>
            <span className={`font-bold ${isOutOfStock ? 'text-red-600' : 'text-[#0F172A]'}`}>
              {currentStock} pièces
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Quantité à déduire / expédier :</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={currentStock}
                value={quantity}
                onChange={(e) => {
                  setQuantity(parseInt(e.target.value, 10) || 1);
                  setError('');
                }}
                disabled={isOutOfStock}
                className="w-full px-3 py-2 text-sm font-bold border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-red-400"
              />
              <div className="flex gap-1">
                {[1, 2, 5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={isOutOfStock || preset > currentStock}
                    onClick={() => {
                      setQuantity(preset);
                      setError('');
                    }}
                    className={`px-2.5 py-2 text-xs font-semibold rounded-xl border ${
                      quantity === preset
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    -{preset}
                  </button>
                ))}
              </div>
            </div>
            {isExceeding && (
              <p className="text-[11px] text-red-600 mt-1">La quantité demandée dépasse le stock disponible</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nom du client / Usine destinataire :</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex : Confection Élégance / Atelier Al-Ofoq"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">N° de bon ou note d'expédition (optionnel) :</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : Bon de livraison #812 - Expédition express"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isOutOfStock || isExceeding}
              className="flex-1 py-2.5 px-4 bg-[#B91C1C] hover:bg-red-800 text-white disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Déduction en cours...' : `Confirmer déduction (${quantity} pcs)`}</span>
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
