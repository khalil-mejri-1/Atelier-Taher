import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Scissors, 
  ShieldCheck, 
  LogIn, 
  Sparkles, 
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LoginView() {
  const { login, demoAccounts } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
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

  const handleQuickLogin = async (acc) => {
    setError('');
    setUsername(acc.username);
    setLoading(true);
    try {
      if (acc.password) {
        await login({ username: acc.username, password: acc.password });
      } else {
        setPassword('');
        setError('Veuillez saisir le mot de passe de ce compte / يرجى إدخال كلمة المرور');
      }
    } catch (err) {
      setError(err.message || 'Échec de la connexion');
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

        {/* Quick 1-Tap Demo Logins Pill */}
        {demoAccounts && demoAccounts.length > 0 && (
          <div className="mt-6 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Connexion rapide en un clic :</span>
            </div>

            <div className="space-y-1.5">
              {demoAccounts.map((acc) => {
                const isAdmin = acc.role === 'admin';
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-transform active:scale-98 border cursor-pointer ${
                      isAdmin 
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-[#0F172A]' 
                        : 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-200/80 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isAdmin ? 'bg-[#0F172A] text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-[12px]">{acc.name}</div>
                        <div className="text-[10px] text-slate-500 font-sku">@{acc.username} • {acc.roleLabel}</div>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold flex items-center gap-1 opacity-80">
                      <span>Entrer</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Standard Manual Login Card */}
        <div className="mt-4 bg-white py-6 px-6 shadow-xs rounded-2xl border border-[#E2E8F0]">
          
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
