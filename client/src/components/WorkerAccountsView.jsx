import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  ShieldCheck, 
  Scissors, 
  Users
} from 'lucide-react';
import { workersApi } from '../api';
import WorkerManageModal from './WorkerManageModal';

export default function WorkerAccountsView() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [message, setMessage] = useState('');

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const res = await workersApi.getAll();
      setWorkers(res.workers || []);
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
      setMessage('Compte opérateur mis à jour avec succès');
    } else {
      await workersApi.create(formData);
      setMessage('Nouvel opérateur créé avec succès');
    }
    await loadWorkers();
    setTimeout(() => setMessage(''), 4000);
  };

  const handleToggleStatus = async (worker) => {
    const nextStatus = worker.status === 'active' ? 'suspended' : 'active';
    try {
      await workersApi.update(worker.id, { status: nextStatus });
      await loadWorkers();
    } catch (err) {
      alert(err.message || 'Échec du changement de statut');
    }
  };

  const handleDelete = async (worker) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de "${worker.name}" ?`)) {
      return;
    }
    try {
      await workersApi.delete(worker.id);
      setMessage(`Compte de ${worker.name} supprimé`);
      await loadWorkers();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      alert(err.message || 'Échec de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Add Button */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0F172A]" />
            <h2 className="font-bold text-base text-[#0F172A]">Gestion des opérateurs de production</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gérez les comptes des agents de coupe, les codes PIN rapides et les droits de saisie
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedWorker(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Ajouter un opérateur</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {/* Workers Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Chargement des comptes opérateurs...
          </div>
        ) : workers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Aucun compte enregistré
          </div>
        ) : (
          workers.map((worker) => {
            const isAdmin = worker.role === 'admin';
            const isActive = worker.status === 'active';

            return (
              <div 
                key={worker.id}
                className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isAdmin ? 'bg-[#0F172A] text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-[#0F172A] truncate">{worker.name}</h4>
                        <span className="text-[10px] font-sku text-slate-400 block truncate">@{worker.username}</span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <button
                      onClick={() => !isAdmin && handleToggleStatus(worker)}
                      disabled={isAdmin}
                      title={isAdmin ? 'Impossible de désactiver le compte admin' : 'Cliquer pour changer le statut'}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition-colors shrink-0 ${
                        isActive 
                          ? 'bg-[#F0FDF4] text-[#15803D] border-green-200' 
                          : 'bg-[#FEF2F2] text-[#B91C1C] border-red-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#15803D]' : 'bg-[#B91C1C]'}`} />
                      <span>{isActive ? 'Actif' : 'Suspendu'}</span>
                    </button>
                  </div>

                  {/* Worker Details / Stats */}
                  <div className="space-y-1.5 py-1.5 border-y border-slate-100 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-400">Rôle :</span>
                      <span className="font-semibold text-slate-700 truncate">
                        {isAdmin ? 'Direction (Admin)' : 'Opérateur coupe'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-400">Code PIN :</span>
                      <span className="font-sku font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {worker.pin || 'Non défini'}
                      </span>
                    </div>

                    {!isAdmin && (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-slate-400">Total production :</span>
                        <span className="font-bold text-emerald-700 font-sku">
                          {worker.total_operations || 0} op.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-1 pt-2 mt-1">
                  <button
                    onClick={() => {
                      setSelectedWorker(worker);
                      setModalOpen(true);
                    }}
                    className="px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                    title="Modifier le compte ou réinitialiser le mot de passe"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Modifier</span>
                  </button>

                  {!isAdmin && (
                    <button
                      onClick={() => handleDelete(worker)}
                      className="px-2 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                      title="Supprimer le compte"
                    >
                      <Trash2 className="w-3 h-3" />
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
    </div>
  );
}
