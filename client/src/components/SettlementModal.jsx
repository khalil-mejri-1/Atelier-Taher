import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Calendar, 
  Coins, 
  Package, 
  User, 
  X, 
  Loader2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { settlementsApi } from '../api';

export default function SettlementModal({ 
  isOpen, 
  onClose, 
  worker, 
  onSettled 
}) {
  if (!isOpen || !worker) return null;

  const totalDue = typeof worker.total_unpaid_amount === 'number'
    ? worker.total_unpaid_amount
    : (worker.balance || 0);

  const [amount, setAmount] = useState(totalDue.toFixed(3));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const unpaidDays = worker.unpaid_days || [];
  const piecesCount = worker.unpaid_pieces_count || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Veuillez saisir un montant valide supérieur à 0');
      return;
    }

    setLoading(true);
    try {
      const res = await settlementsApi.settleWorker({
        worker_id: worker.worker_id || worker.id || worker._id,
        amount: parsedAmount,
        notes: notes.trim(),
        dates: unpaidDays.map((d) => d.date),
      });

      if (onSettled) {
        onSettled(res);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erreur lors de l’enregistrement du règlement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-emerald-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <CreditCard className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Règlement du solde ouvrier / خلاص العامل
              </h3>
              <p className="text-[11px] text-emerald-200/90 font-arabic" dir="rtl">
                تسجيل دفع المستحقات وتصفير حساب الأيام غير الخالصة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-left">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Worker Info Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  {worker.worker_name || worker.name}
                </h4>
                <span className="text-[10px] text-slate-500 block truncate font-mono">
                  @{worker.username || 'ouvrier'}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Solde Dû / الإجمالي
              </span>
              <span className="font-mono text-base font-extrabold text-emerald-700">
                {totalDue.toFixed(3)} <span className="text-xs">DT</span>
              </span>
            </div>
          </div>

          {/* Summary Stats Pill Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/60 rounded-xl flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] text-emerald-800 font-semibold block">
                  Jours à régler / الأيام
                </span>
                <span className="font-bold text-slate-900">
                  {unpaidDays.length} jour{unpaidDays.length > 1 ? 's' : ''} impayé(s)
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-blue-50/60 border border-blue-200/60 rounded-xl flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-[10px] text-blue-800 font-semibold block">
                  Pièces produites / القطع
                </span>
                <span className="font-bold text-slate-900">
                  {piecesCount} pièce{piecesCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* List of Unpaid Days Included */}
          {unpaidDays.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Détail des journées à clôturer / الأيام المشمولة بالخلاص</span>
                <span className="text-[10px] font-normal text-slate-400 font-mono">
                  {unpaidDays.length} date{unpaidDays.length > 1 ? 's' : ''}
                </span>
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                {unpaidDays.map((d) => (
                  <div 
                    key={d.date} 
                    className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-slate-100 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-700 font-bold">{d.date}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({d.pieces} pcs)</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">
                      {d.amount.toFixed(3)} DT
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settlement Amount Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Montant versé / المبلغ المدفوع (DT)</span>
              <button
                type="button"
                onClick={() => setAmount(totalDue.toFixed(3))}
                className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
              >
                Régler la totalité ({totalDue.toFixed(3)} DT)
              </button>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 text-sm font-mono font-extrabold bg-[#F8F9FA] border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                DT
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Ce montant sera déduit du solde de l'ouvrier et les journées correspondantes seront archivées comme réglées.
            </p>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Note ou référence (Optionnel / اختياري)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Paiement espèces, virement, acompte semaine..."
              className="w-full px-3 py-2 text-xs bg-[#F8F9FA] border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-slate-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler / تراجع
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmer le règlement / تأكيد الخلاص</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
