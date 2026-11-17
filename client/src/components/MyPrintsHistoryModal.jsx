import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Scissors, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Calendar,
  History,
  RotateCcw,
  Coins
} from 'lucide-react';
import { logsApi, patternsApi } from '../api';
import { useDialog } from '../context/DialogContext';

export default function MyPrintsHistoryModal({
  isOpen,
  onClose,
  onPrintsChanged
}) {
  const { confirm, showNotice, notify } = useDialog();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadMyLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await logsApi.getMyTodayLogs();
      setLogs(res.logs || []);
      setTotalQuantity(res.totalQuantity || 0);
      setTotalEarnings(res.totalEarnings || 0);
    } catch (err) {
      console.error('Erreur chargement des impressions :', err);
      setError('Impossible de charger vos impressions du jour');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMyLogs();
      setMessage('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeleteLog = async (log) => {
    const patternName = log.pattern_name || log.pattern_id?.name_fr || 'ce patron';
    const qty = log.quantity_changed || 1;
    const amount = typeof log.total_price === 'number' ? log.total_price : 0;

    const confirmed = await confirm({
      title: "Annuler cette impression",
      titleAr: "تأكيد حذف وإلغاء الطباعة",
      message: `Voulez-vous vraiment supprimer l'impression de "${patternName}" (${qty} pièce(s)) ?`,
      messageAr: `هل أنت متأكد من حذف هذه الطباعة؟ سيتم إنقاص (${qty}) قطعة من المخزون وخصم -${amount.toFixed(3)} DT من رصيدك.`,
      type: "danger",
      confirmText: "Oui, supprimer / نعم، احذف",
      cancelText: "Annuler / تراجع"
    });

    if (!confirmed) return;

    setDeletingId(log._id);
    setError('');
    setMessage('');

    try {
      await patternsApi.undoProduce(log._id);

      // Remove log from local state
      setLogs((prev) => prev.filter((l) => l._id !== log._id));
      setTotalQuantity((prev) => Math.max(0, prev - qty));
      setTotalEarnings((prev) => Math.max(0, prev - amount));

      const successMsg = `تم حذف وإلغاء طباعة "${patternName}" بنجاح وتحديث الرصيد.`;
      setMessage(successMsg);
      notify.success(successMsg);

      if (onPrintsChanged) {
        onPrintsChanged();
      }

      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      console.error(err);
      const errMsg = err.message || 'Échec de la suppression de l’impression';
      setError(errMsg);
      notify.error(errMsg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllPrints = async () => {
    if (deletingId || logs.length === 0) return;
    const count = logs.length;
    const confirmed = await confirm({
      title: "Annuler toutes mes impressions",
      titleAr: "تأكيد حذف جميع طباعاتي لليوم",
      message: `Voulez-vous vraiment supprimer toutes vos ${count} impressions d'aujourd'hui ?`,
      messageAr: `هل أنت متأكد من حذف جميع طباعاتك لليوم (${count} عملية)؟ سيتم خصم الكميات من المخزون وتعديل رصيدك.`,
      type: "danger",
      confirmText: `Oui, tout supprimer (${count}) / نعم، احذف الكل`,
      cancelText: "Annuler / تراجع",
    });

    if (!confirmed) return;

    setDeletingId('all');
    try {
      const logIds = logs.map((l) => l._id);
      try {
        await logsApi.bulkDeleteLogs(logIds);
      } catch (e) {
        for (const l of logs) {
          await patternsApi.undoProduce(l._id).catch(() => {});
        }
      }

      setLogs([]);
      setTotalQuantity(0);
      setTotalEarnings(0);
      notify.success(`Toutes les (${count}) impressions ont été supprimées`);
      if (onPrintsChanged) onPrintsChanged();
    } catch (err) {
      console.error(err);
      notify.error(err.message || 'Échec de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-150 text-left overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center shadow-xs shrink-0">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                    Mes impressions du jour
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                    {logs.length} {logs.length > 1 ? 'ajouts' : 'ajout'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-tight truncate sm:whitespace-normal" dir="rtl">
                  سجل طباعاتي اليومية • يمكنك حذف أي طباعة بالخطأ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Total Summary Counters (Responsive 2-box KPI grid) */}
        <div className="p-3 sm:px-6 sm:py-3.5 bg-slate-50/80 border-b border-slate-100 shrink-0">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {/* Total pièces */}
            <div className="p-2 sm:p-2.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold uppercase tracking-wider truncate">
                  Total imprimé
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-extrabold text-slate-900 font-sku text-sm sm:text-base leading-none">
                    {totalQuantity}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500 font-medium leading-none">
                    {totalQuantity > 1 ? 'pièces' : 'pièce'}
                  </span>
                </div>
              </div>
            </div>

            {/* Gains cumulés */}
            <div className="p-2 sm:p-2.5 bg-white rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] text-emerald-700 block font-bold uppercase tracking-wider truncate">
                  Gains cumulés
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-extrabold text-emerald-700 font-sku text-sm sm:text-base leading-none">
                    +{totalEarnings.toFixed(3)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-emerald-800 font-bold leading-none">
                    DT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
          {message && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in" dir="rtl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span>Chargement de votre historique d'impressions...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
              <Scissors className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Aucune impression enregistrée aujourd'hui</p>
              <p className="text-[11px] text-slate-400">
                لم تقم بتسجيل أي طباعة خلال هذا اليوم حتى الآن.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => {
                const pat = log.pattern_id || {};
                const imgUrl = pat.image_url;
                const qty = log.quantity_changed || 1;
                const unitRate = typeof log.unit_price === 'number' ? log.unit_price : (pat.price || 0);
                const totalAmount = typeof log.total_price === 'number' ? log.total_price : (qty * unitRate);
                const isDeleting = deletingId === log._id;

                const timeStr = log.created_at
                  ? new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '--:--';

                return (
                  <div
                    key={log._id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image */}
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={log.pattern_name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/100x100/f8f9fa/1e293b?text=Patron';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <Scissors className="w-5 h-5 text-slate-400" />
                        </div>
                      )}

                      {/* Pattern details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {pat.name_fr || log.pattern_name}
                          </h4>
                          <span className="font-sku text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {log.pattern_sku || pat.sku || 'PAT'}
                          </span>
                        </div>
                        {pat.name_ar && (
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5" dir="rtl">
                            {pat.name_ar}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{timeStr}</span>
                          </span>
                          <span>•</span>
                          <span>Tarif : {unitRate.toFixed(3)} DT/u</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Delete Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="font-sku font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs inline-block">
                          +{qty} pc{qty > 1 ? 's' : ''}
                        </span>
                        <span className="block font-sku font-bold text-emerald-700 text-xs mt-0.5">
                          +{totalAmount.toFixed(3)} DT
                        </span>
                      </div>

                      {/* Red Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteLog(log)}
                        disabled={isDeleting}
                        className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Supprimer cette impression et restaurer le stock"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Suppression...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Supprimer / حذف</span>
                          </>
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
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">
              {logs.length} opération(s) enregistrée(s)
            </span>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllPrints}
                disabled={deletingId !== null}
                className="px-2.5 py-1 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                title="Supprimer toutes mes impressions / حذف الكل"
              >
                <Trash2 className="w-3 h-3" />
                <span>حذف الكل ({logs.length})</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer / إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}

