import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { socket } from '../socket';
import { 
  Scissors, 
  ShieldCheck, 
  LogOut, 
  ArrowLeftRight,
  ChevronDown
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, switchDemoUser, demoAccounts } = useAuth();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0F172A] flex items-center justify-center text-white shadow-xs shrink-0">
              <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-slate-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-sm sm:text-lg text-[#0F172A] tracking-tight truncate">Atelier Taher</span>
                <span className="hidden md:inline text-[10px] sm:text-xs font-sku text-slate-400 border border-[#E2E8F0] rounded px-1.5 py-0.2 bg-[#F8F9FA]">PATRONS</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden lg:block">
                Confection de patrons de couture • Gestion des stocks & production
              </p>
            </div>
          </div>

          {/* Right Center: Live Sync Pill & Fast Role Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Real-time Status Badge */}
            <div 
              title={isConnected ? 'Connecté en temps réel via WebSocket' : 'Reconnexion en cours...'}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#15803D] border border-green-200"
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#15803D] animate-pulse' : 'bg-amber-500'}`} />
              <span className="hidden md:inline font-sku text-[11px] font-semibold tracking-wide">
                {isConnected ? 'EN DIRECT' : 'CONNEXION'}
              </span>
            </div>

            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] hover:bg-slate-100 text-[#0F172A] transition-colors"
                title="Bascule rapide entre comptes de test"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Changer de rôle</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showRoleMenu && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[#E2E8F0] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setShowRoleMenu(false)}
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100 mb-1">
                    Bascule rapide (Comptes démo) :
                  </div>
                  {demoAccounts.map((account) => {
                    const isCurrent = user?.username === account.username;
                    return (
                      <button
                        key={account.username}
                        onClick={() => switchDemoUser(account.username)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                          isCurrent 
                            ? 'bg-slate-100 text-[#0F172A] font-semibold' 
                            : 'hover:bg-[#F8F9FA] text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-left">
                          {account.role === 'admin' ? (
                            <ShieldCheck className="w-4 h-4 text-slate-700" />
                          ) : (
                            <Scissors className="w-4 h-4 text-emerald-600" />
                          )}
                          <div>
                            <div className="text-[12px]">{account.name}</div>
                            <div className="text-[10px] text-slate-400 font-sku">@{account.username}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          account.role === 'admin'
                            ? 'bg-slate-50 text-slate-700 border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {account.role === 'admin' ? 'Admin' : 'Opérateur'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Current User Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 bg-white border border-[#E2E8F0] rounded-xl text-xs">
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                isAdmin ? 'bg-[#0F172A] text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-[#0F172A] truncate max-w-[130px]">{user?.name}</div>
                <div className="text-[10px] text-slate-400">
                  {isAdmin ? 'Direction de l’atelier' : 'Opérateur machine'}
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              title="Se déconnecter"
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
