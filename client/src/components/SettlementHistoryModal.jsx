import React, { useState, useEffect } from 'react';
import { 
  History, 
  X, 
  Calendar, 
  CreditCard, 
  Trash2, 
  Loader2, 
  User, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { settlementsApi } from '../api';
import { useDialog } from '../context/DialogContext';

export default function SettlementHistoryModal({ 
  isOpen, 
  onClose, 
  workerId = 'all', 
  workerName = '',
  onChanged 
}) {
  const { confirm, notify } = useDialog();
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await settlementsApi.getHistory(workerId);
      setSettlements(res.settlements || []);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger l’historique des règlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, workerId]);

  if (!isOpen) return null;

  const handleCancelSettlement = async (settlement) => {
    if (deletingId) return;

    const confirmed = await confirm({
      title: "Annuler ce règlement",
      titleAr: "تأكيد إلغاء دفعة الخلاص واسترجاع المستحقات",
      message: `Voulez-vous vraiment annuler le règlement de ${settlement.amount.toFixed(3)} DT pour ${settlement.worker_name} ?`,
      messageAr: `المبلغ : ${settlement.amount.toFixed(3)} DT • العامل : ${settlement.worker_name} • سيتم إعادة فتح الأيام غير الخالصة وإرجاع المبلغ إلى رصيد العامل.`,
      type: "danger",
      confirmText: "Oui, annuler / نعم، ألغِ الدفعة",
      cancelText: "Retour / تراجع"
    });

    if (!confirmed) return;

    setDeletingId(settlement._id);
    try {
      await settlementsApi.cancelSettlement(settlement._id);
      notify.success(`Règlement de ${settlement.amount.toFixed(3)} DT annulé`);
      await loadHistory();
      if (onChanged) onChanged();
    } catch (err) {
      notify.error(err.message || 'Échec de l’annulation du règlement');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
              <History className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Historique des règlements / سجل خلاص العمال
              </h3>
              <p className="text-[11px] text-slate-400 font-arabic" dir="rtl">
                {workerName 
                  ? `أرشيف دفعات خلاص العامل : ${workerName}` 
                  : 'أرشيف جميع دفعات الخلاص المسجلة للعمال'}
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

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 text-left">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
              <span>Chargement de l'historique...</span>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 text-red-700 rounded-2xl text-xs text-center border border-red-200">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <span>{error}</span>
            </div>
          ) : settlements.length === 0 ? (
            <div className="py-16 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 mb-1">
                Aucun règlement enregistré
              </h4>
              <p className="text-xs text-slate-400 font-arabic" dir="rtl">
                لم يتم تسجيل أي عملية خلاص سابقة لهذا العامل حتى الآن
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {settlements.map((s) => {
                const dateFormatted = new Date(s.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={s._id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/90 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {s.worker_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Payé / تم الخلاص
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {dateFormatted}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>Par : <strong>{s.admin_name}</strong></span>
                        {s.days_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{s.days_count} jour{s.days_count > 1 ? 's' : ''} ({s.pieces_count} pcs)</span>
                          </>
                        )}
                        {s.notes && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 italic font-arabic">"{s.notes}"</span>
                          </>
                        )}
                      </div>

                      {Array.isArray(s.settled_dates) && s.settled_dates.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className="text-[9.5px] text-slate-400 uppercase font-semibold">Dates :</span>
                          {s.settled_dates.map((d) => (
                            <span key={d} className="px-1.5 py-0.2 bg-white border border-slate-200 text-slate-600 rounded text-[10px] font-mono">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Montant réglé
                        </span>
                        <span className="font-mono text-base font-extrabold text-emerald-700">
                          {s.amount.toFixed(3)} <span className="text-xs">DT</span>
                        </span>
                      </div>

                      <button
                        onClick={() => handleCancelSettlement(s)}
                        disabled={deletingId === s._id}
                        title="Annuler ce règlement / إلغاء هذه الدفعة"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200 disabled:opacity-50"
                      >
                        {deletingId === s._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Fermer / إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
