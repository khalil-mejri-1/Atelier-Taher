import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Scissors, 
  LogIn, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
    } catch (err) {
      setError(err.message || 'Identifiants de connexion invalides / بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-left">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Brand Icon & Heading */}
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#0F172A] flex items-center justify-center text-white shadow-xs mb-3">
            <Scissors className="w-7 h-7 text-slate-100" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            Atelier Taher
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sku">
            PATRONS DE COUTURE • GESTION DE PRODUCTION & STOCKS
          </p>
          <p className="text-xs text-slate-600 mt-2 max-w-xs mx-auto">
            Plateforme numérique professionnelle pour ateliers et usines de modélisme et confection
          </p>
        </div>

        {/* Standard Manual Login Card */}
        <div className="mt-6 bg-white py-6 px-6 shadow-xs rounded-2xl border border-[#E2E8F0]">
          
          <div className="pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-sm font-bold text-[#0F172A]">Connexion au système / تسجيل الدخول</h2>
            <p className="text-[11px] text-slate-400">Entrez votre identifiant et votre mot de passe</p>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Identifiant / اسم المستخدم (Login) :
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex : admin ou nom d'utilisateur"
                className="w-full px-3.5 py-2.5 text-xs font-sku border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mot de passe / كلمة المرور :
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-xs cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Vérification...' : 'Se connecter / تسجيل الدخول'}</span>
            </button>
          </form>

        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-[11px] text-slate-400">
          Application B2B de gestion de patrons de couture • Atelier Taher © 2026
        </p>

      </div>
    </div>
  );
}
