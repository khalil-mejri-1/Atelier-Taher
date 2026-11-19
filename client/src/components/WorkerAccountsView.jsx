import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  ShieldCheck, 
  Scissors, 
  Users,
  Search,
  Filter,
  Coins,
  Loader2,
  CreditCard,
  History
} from 'lucide-react';
import { workersApi, settlementsApi } from '../api';
import WorkerManageModal from './WorkerManageModal';
import SettlementModal from './SettlementModal';
import SettlementHistoryModal from './SettlementHistoryModal';
import UnpaidSettlementBreakdownModal from './UnpaidSettlementBreakdownModal';
import { useDialog } from '../context/DialogContext';

export default function WorkerAccountsView() {
  const { confirm, notify } = useDialog();
  const [workers, setWorkers] = useState([]);
  const [unpaidMap, setUnpaidMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'worker'
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionType, setActionType] = useState(''); // 'delete' | 'toggle'

  // Modals de règlement & historique
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleTargetWorker, setSettleTargetWorker] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyWorkerId, setHistoryWorkerId] = useState('all');
  const [historyWorkerName, setHistoryWorkerName] = useState('');
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [breakdownTargetWorker, setBreakdownTargetWorker] = useState(null);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const [res, unpaidRes] = await Promise.all([
        workersApi.getAll(),
        settlementsApi.getUnpaidSummary('all').catch(() => null),
      ]);
      setWorkers(res.workers || []);

      if (unpaidRes && Array.isArray(unpaidRes.workers)) {
        const map = {};
        unpaidRes.workers.forEach((w) => {
          map[w.worker_id] = w;
        });
        setUnpaidMap(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const handleSaveWorker = async (formData, id) => {
    if (id) {
      await workersApi.update(id, formData);
      setMessage('Compte utilisateur mis à jour avec succès');
    } else {
      await workersApi.create(formData);
      setMessage(`Nouveau compte ${formData.role === 'admin' ? 'Administrateur' : 'Opérateur'} créé avec succès`);
    }
    await loadWorkers();
    setTimeout(() => setMessage(''), 4000);
  };

  const handleToggleStatus = async (worker) => {
    if (actionLoadingId) return;
    const nextStatus = worker.status === 'active' ? 'suspended' : 'active';
    const statusTextFr = nextStatus === 'active' ? 'activé' : 'suspendu';
    setActionLoadingId(worker.id);
    setActionType('toggle');
    try {
      await workersApi.update(worker.id, { status: nextStatus });
      notify.success(`Compte "${worker.name}" ${statusTextFr} avec succès`);
      await loadWorkers();
    } catch (err) {
      notify.error(err.message || 'Échec du changement de statut');
    } finally {
      setActionLoadingId(null);
      setActionType('');
    }
  };

  const handleDelete = async (worker) => {
    if (actionLoadingId) return;
    const confirmed = await confirm({
      title: "Supprimer ce compte",
      titleAr: "تأكيد حذف الحساب نهائياً",
      message: `Êtes-vous sûr de vouloir supprimer définitivement le compte de "${worker.name}" (@${worker.username}) ? Cette action est irréversible.`,
      messageAr: `هل أنت متأكد من حذف حساب "${worker.name}" (@${worker.username}) نهائياً؟ سيتم إلغاء صلاحية الوصول إلى النظام.`,
      type: "danger",
      confirmText: "Oui, supprimer définitivement / نعم، احذف الحساب",
      cancelText: "Annuler / تراجع"
    });
    if (!confirmed) {
      return;
    }
    setActionLoadingId(worker.id);
    setActionType('delete');
    try {
      await workersApi.delete(worker.id);
      notify.success(`Compte de ${worker.name} supprimé définitivement`);
      setMessage(`Compte de ${worker.name} supprimé définitivement`);
      await loadWorkers();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      notify.error(err.message || 'Échec de la suppression');
    } finally {
      setActionLoadingId(null);
      setActionType('');
    }
  };

  // Filtered workers list
  const filteredWorkers = workers.filter((w) => {
    const matchesSearch = 
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.username.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = 
      roleFilter === 'all' ? true : w.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const adminCount = workers.filter((w) => w.role === 'admin').length;
  const workerCount = workers.filter((w) => w.role === 'worker').length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Management Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5 text-slate-100" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-[#0F172A]">
                Gestion des utilisateurs & des comptes
              </h2>
              <span className="text-xs text-slate-500 block">
                إدارة المستخدمين والحسابات • تحديد الأدوار (أدمن أو عامل) والصلاحيات
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setHistoryWorkerId('all');
              setHistoryWorkerName('Tous les ouvriers (جميع العمال)');
              setHistoryModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>سجل خلاص العمال (Historique)</span>
          </button>

          <button
            onClick={() => {
              setSelectedWorker(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter un utilisateur / إضافة مستخدم</span>
          </button>
        </div>
      </div>

      {/* KPI Counters & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0]">
        
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou identifiant..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-800"
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-[#0F172A] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({workers.length})
          </button>

          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              roleFilter === 'admin'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Admins ({adminCount})</span>
          </button>

          <button
            onClick={() => setRoleFilter('worker')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              roleFilter === 'worker'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ouvriers ({workerCount})</span>
          </button>
        </div>

      </div>

      {message && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Workers / Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Chargement des comptes utilisateurs...
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="col-span-full py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center space-y-2 p-6">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Aucun compte trouvé</p>
            <p className="text-[11px] text-slate-400">
              Cliquez sur "Ajouter un utilisateur" pour enregistrer un nouvel ouvrier ou administrateur.
            </p>
          </div>
        ) : (
          filteredWorkers.map((worker) => {
            const isAdmin = worker.role === 'admin';
            const isActive = worker.status === 'active';
            const isMasterAdmin = worker.username === 'admin';

            return (
              <div 
                key={worker.id}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  isAdmin 
                    ? 'border-slate-300 shadow-xs ring-1 ring-slate-100' 
                    : 'border-[#E2E8F0] shadow-xs hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top user row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isAdmin 
                          ? 'bg-[#0F172A] text-white shadow-2xs' 
                          : 'bg-emerald-600 text-white shadow-2xs'
                      }`}>
                        {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-[#0F172A] truncate flex items-center gap-1.5">
                          <span>{worker.name}</span>
                          {isMasterAdmin && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-normal">Principal</span>
                          )}
                        </h4>
                        <span className="text-[10px] font-sku text-slate-400 block truncate">
                          @{worker.username}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <button
                      onClick={() => !isMasterAdmin && handleToggleStatus(worker)}
                      disabled={isMasterAdmin || (actionLoadingId === worker.id && actionType === 'toggle')}
                      title={isMasterAdmin ? 'Impossible de désactiver le compte admin principal' : 'Cliquer pour changer le statut'}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${
                        isMasterAdmin ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isActive 
                          ? 'bg-[#F0FDF4] text-[#15803D] border-green-200' 
                          : 'bg-[#FEF2F2] text-[#B91C1C] border-red-200'
                      }`}
                    >
                      {actionLoadingId === worker.id && actionType === 'toggle' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#15803D]' : 'bg-[#B91C1C]'}`} />
                      )}
                      <span>{isActive ? 'Actif' : 'Suspendu'}</span>
                    </button>
                  </div>

                  {/* Worker Details / Stats */}
                  <div className="space-y-1.5 py-2 border-y border-slate-100 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-400">Rôle / الدور :</span>
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                        isAdmin 
                          ? 'bg-slate-100 text-slate-900 border border-slate-200' 
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isAdmin ? 'Administrateur (أدمن)' : 'Opérateur (عامل)'}
                      </span>
                    </div>

                    {!isAdmin && (
                      <>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-slate-400">Total production :</span>
                          <span className="font-bold text-slate-700 font-sku">
                            {worker.total_operations || 0} op.
                          </span>
                        </div>

                        {/* Solde impayé pour cet ouvrier */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-dashed border-slate-200">
                          <span className="text-slate-500 font-medium">المستحقات غير الخالصة :</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded-lg border ${
                              (worker.balance || 0) > 0 || (unpaidMap[worker.id]?.total_unpaid_amount || 0) > 0
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {(unpaidMap[worker.id]?.total_unpaid_amount ?? worker.balance ?? 0).toFixed(3)} DT
                            </span>
                            {unpaidMap[worker.id]?.unpaid_days_count > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBreakdownTargetWorker(unpaidMap[worker.id] || worker);
                                  setBreakdownModalOpen(true);
                                }}
                                className="text-[10px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
                                title="Voir les jours impayés"
                              >
                                ({unpaidMap[worker.id].unpaid_days_count} j)
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-1.5 pt-2.5 mt-1 border-t border-slate-50 flex-wrap">
                  {!isAdmin && ((worker.balance || 0) > 0 || (unpaidMap[worker.id]?.total_unpaid_amount || 0) > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSettleTargetWorker(unpaidMap[worker.id] || {
                          worker_id: worker.id,
                          name: worker.name,
                          balance: worker.balance || 0,
                        });
                        setSettleModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title="Enregistrer le خلاص de cet ouvrier"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>خلاص ({(unpaidMap[worker.id]?.total_unpaid_amount ?? worker.balance ?? 0).toFixed(3)} DT)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedWorker(worker);
                      setModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Modifier le compte ou réinitialiser le mot de passe"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>

                  {!isMasterAdmin && (
                    <button
                      onClick={() => handleDelete(worker)}
                      disabled={actionLoadingId === worker.id && actionType === 'delete'}
                      className="px-2.5 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Supprimer définitivement le compte"
                    >
                      {actionLoadingId === worker.id && actionType === 'delete' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Edit/Create Modal */}
      <WorkerManageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        worker={selectedWorker}
        onSave={handleSaveWorker}
      />

      {/* Settlement Modals */}
      <SettlementModal
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        worker={settleTargetWorker}
        onSettled={() => {
          notify.success('Règlement enregistré avec succès / تم تسجيل الخلاص بنجاح');
          loadWorkers();
        }}
      />

      <SettlementHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        workerId={historyWorkerId}
        workerName={historyWorkerName}
        onChanged={loadWorkers}
      />

      <UnpaidSettlementBreakdownModal
        isOpen={breakdownModalOpen}
        onClose={() => setBreakdownModalOpen(false)}
        worker={breakdownTargetWorker}
        onOpenSettleModal={(w) => {
          setSettleTargetWorker(w);
          setSettleModalOpen(true);
        }}
      />
    </div>
  );
}
