import React from 'react';
import { 
  Calendar, 
  X, 
  Coins, 
  Package, 
  CreditCard, 
  User, 
  AlertCircle,
  Clock
} from 'lucide-react';

export default function UnpaidSettlementBreakdownModal({
  isOpen,
  onClose,
  worker,
  onOpenSettleModal,
}) {
  if (!isOpen || !worker) return null;

  const unpaidDays = worker.unpaid_days || [];
  const totalAmount = typeof worker.total_unpaid_amount === 'number'
    ? worker.total_unpaid_amount
    : (worker.balance || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Clock className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Détail des jours impayés / الأيام غير الخالصة
              </h3>
              <p className="text-[11px] text-amber-200/90 font-arabic" dir="rtl">
                تفاصيل الأيام والقطع المستحقة للعامل : {worker.worker_name || worker.name}
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

        {/* Worker Summary Banner */}
        <div className="p-4 bg-amber-50/60 border-b border-amber-200/60 flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                {worker.worker_name || worker.name}
              </h4>
              <span className="text-[11px] text-amber-900 font-arabic" dir="rtl">
                {unpaidDays.length} يوم عمل ينتظر الخلاص ({worker.unpaid_pieces_count || 0} قطعة)
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-amber-800/80 block">
              Total dû / الإجمالي
            </span>
            <span className="font-mono text-base font-extrabold text-amber-900">
              {totalAmount.toFixed(3)} <span className="text-xs">DT</span>
            </span>
          </div>
        </div>

        {/* Unpaid Days List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 text-left">
          {unpaidDays.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">Aucun jour impayé</p>
              <p className="text-[11px] text-slate-400 font-arabic" dir="rtl">
                هذا العامل ليس لديه أي مستحقات غير خالصة
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {unpaidDays.map((d, index) => (
                <div
                  key={d.date}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{d.date}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        غير مدفوع / En attente
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs sm:text-sm font-extrabold text-emerald-700">
                        {d.amount.toFixed(3)} DT
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {d.pieces} pièce{d.pieces > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Patterns Breakdown on this day */}
                  {Array.isArray(d.patterns) && d.patterns.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Modèles confectionnés / الموديلات المنجزة :
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {d.patterns.map((p, pIdx) => (
                          <div 
                            key={pIdx}
                            className="p-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 truncate block">
                                {p.name || p.sku}
                              </span>
                              <span className="text-[9.5px] text-slate-400 font-mono block">
                                {p.quantity} pcs × {p.unit_price.toFixed(3)} DT
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-700 shrink-0">
                              {p.amount.toFixed(3)} DT
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            Fermer / إغلاق
          </button>

          {totalAmount > 0 && onOpenSettleModal && (
            <button
              onClick={() => {
                onClose();
                onOpenSettleModal(worker);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>خلاص هذا العامل الآن ({totalAmount.toFixed(3)} DT)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
