import React, { useState, useEffect } from 'react';
import { X, Check, UserPlus, KeyRound, Shield, AlertCircle } from 'lucide-react';

export default function WorkerManageModal({ 
  isOpen, 
  onClose, 
  worker, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    pin: '',
    role: 'worker',
    status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(worker);

  useEffect(() => {
    if (worker) {
      setFormData({
        name: worker.name || '',
        username: worker.username || '',
        password: '',
        pin: worker.pin || '1234',
        role: worker.role || 'worker',
        status: worker.status || 'active'
      });
    } else {
      setFormData({
        name: '',
        username: '',
        password: '',
        pin: '1234',
        role: 'worker',
        status: 'active'
      });
    }
    setError('');
  }, [worker, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Veuillez renseigner le nom de l’opérateur');
      return;
    }
    if (!isEdit && (!formData.username || !formData.password)) {
      setError('L’identifiant et le mot de passe sont requis pour créer un nouveau compte');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSave(formData, worker?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement de l’opérateur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E2E8F0] shadow-xl relative animate-in zoom-in-95 duration-150 text-left"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0F172A] flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">
                {isEdit ? `Modifier le compte : ${worker.name}` : 'Ajouter un nouvel opérateur machine'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEdit ? 'Modifier les accès ou réinitialiser le mot de passe et code PIN' : 'Créer un accès dédié à la saisie de production'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nom complet de l'opérateur <span className="text-red-500">*</span> :
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex : Samir Jaziri"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Identifiant (Login) <span className="text-red-500">*</span> :
              </label>
              <input
                type="text"
                required
                disabled={isEdit}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                placeholder="samir_coupe"
                className="w-full px-3 py-2 text-xs font-sku border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800 disabled:bg-slate-50"
              />
            </div>

            {/* Quick PIN */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Code PIN rapide (4 chiffres) :
              </label>
              <input
                type="text"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                placeholder="3333"
                className="w-full px-3 py-2 text-xs font-sku text-center tracking-widest font-bold border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEdit ? 'Nouveau mot de passe (laisser vide pour conserver l’actuel) :' : 'Mot de passe :'}
            </label>
            <input
              type="password"
              required={!isEdit}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEdit ? '••••••••' : 'Définir un mot de passe sécurisé'}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle & Permissions :</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-hidden focus:border-slate-800"
              >
                <option value="worker">Opérateur (Saisie production uniquement)</option>
                <option value="admin">Administrateur (Accès complet)</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Statut du compte :</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-hidden focus:border-slate-800"
              >
                <option value="active">Actif</option>
                <option value="suspended">Suspendu</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Enregistrement...' : (isEdit ? 'Enregistrer les modifications' : 'Créer l’opérateur')}</span>
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
