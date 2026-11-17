import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  UserPlus, 
  ShieldCheck, 
  Scissors, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Lock,
  User,
  Loader2
} from 'lucide-react';

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
    role: 'worker', // 'worker' | 'admin'
    status: 'active'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(worker);
  const isMasterAdmin = worker?.username === 'admin';

  useEffect(() => {
    if (worker) {
      setFormData({
        name: worker.name || '',
        username: worker.username || '',
        password: '',
        role: worker.role || 'worker',
        status: worker.status || 'active'
      });
    } else {
      setFormData({
        name: '',
        username: '',
        password: '',
        role: 'worker',
        status: 'active'
      });
    }
    setError('');
    setShowPassword(false);
  }, [worker, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Veuillez renseigner le nom complet de l’utilisateur / يرجى إدخال الاسم الكامل');
      return;
    }
    if (!isEdit && (!formData.username.trim() || !formData.password.trim())) {
      setError('L’identifiant et le mot de passe sont obligatoires pour créer un compte / اسم المستخدم وكلمة المرور إلزاميان');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSave(formData, worker?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement / حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-[#E2E8F0] shadow-2xl relative animate-in zoom-in-95 duration-150 text-left my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${
              formData.role === 'admin' ? 'bg-[#0F172A]' : 'bg-emerald-600'
            }`}>
              {formData.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <Scissors className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#0F172A]">
                {isEdit ? `Modifier le compte : ${worker.name}` : 'Créer un nouveau compte utilisateur'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEdit ? 'تعديل بيانات الحساب وتحديث الصلاحيات' : 'إضافة مستخدم جديد وتحديد دوره (عامل أو مسؤول)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2 shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-1">
          
          {/* Role Selector Cards (The core requirement) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Rôle & Permissions / تحديد دور الحساب <span className="text-red-500">*</span> :
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Option 1: Worker */}
              <div
                onClick={() => !isMasterAdmin && setFormData({ ...formData, role: 'worker' })}
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  formData.role === 'worker'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                } ${isMasterAdmin ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      formData.role === 'worker' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172A]">Opérateur machine</h4>
                      <span className="text-[10px] text-emerald-700 font-semibold">عامل إنتاج</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    formData.role === 'worker' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {formData.role === 'worker' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  تسجيل الإنتاج، تفصيل الباترونات وأقسامها، وحساب مستحقاته المالية تلقائياً.
                </p>
              </div>

              {/* Option 2: Admin */}
              <div
                onClick={() => setFormData({ ...formData, role: 'admin' })}
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  formData.role === 'admin'
                    ? 'border-[#0F172A] bg-slate-50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      formData.role === 'admin' ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172A]">Administrateur</h4>
                      <span className="text-[10px] text-slate-700 font-semibold">مدير / مسؤول</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    formData.role === 'admin' ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'border-slate-300'
                  }`}>
                    {formData.role === 'admin' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  إدارة كاملة للمخزون، إضافة الباترونات وتحديد الأسعار، ومتابعة الإنتاج اليومي للمصنع.
                </p>
              </div>

            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nom complet / الاسم الكامل <span className="text-red-500">*</span> :
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex : Mohamed Ali / محمد علي"
                className="w-full px-3 py-2.5 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800 transition-colors"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Identifiant / اسم الدخول (Login) <span className="text-red-500">*</span> :
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={isEdit}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                placeholder="Ex : mohamed / samir"
                className="w-full px-3 py-2.5 text-xs font-sku border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800 disabled:bg-slate-50 transition-colors"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Lettres minuscules sans espaces (أحرف إنجليزية صغيرة دون مسافات)</span>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEdit ? 'Nouveau mot de passe (laisser vide pour conserver) :' : 'Mot de passe / كلمة المرور :'}
              {!isEdit && <span className="text-red-500"> *</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={!isEdit}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={isEdit ? 'Laisser vide pour ne pas modifier' : 'Mot de passe sécurisé (ex: pass123)'}
                className="w-full pl-3 pr-10 py-2.5 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Account Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Statut du compte / حالة الحساب :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'active' })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  formData.status === 'active'
                    ? 'border-green-300 bg-green-50 text-green-700 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-green-600" />
                <span>Actif (نشط)</span>
              </button>

              <button
                type="button"
                disabled={isMasterAdmin}
                onClick={() => !isMasterAdmin && setFormData({ ...formData, status: 'suspended' })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  formData.status === 'suspended'
                    ? 'border-red-300 bg-red-50 text-red-700 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                } ${isMasterAdmin ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <UserX className="w-3.5 h-3.5 text-red-600" />
                <span>Suspendu (معلق)</span>
              </button>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-3 px-4 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                formData.role === 'admin' ? 'bg-[#0F172A] hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Enregistrement en cours...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isEdit 
                      ? 'Mettre à jour le compte' 
                      : `Créer le compte (${formData.role === 'admin' ? 'Administrateur' : 'Opérateur'})`
                    }
                  </span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
