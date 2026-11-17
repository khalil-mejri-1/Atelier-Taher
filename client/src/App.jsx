import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import Navbar from './components/Navbar';
import LoginView from './views/LoginView';
import AdminDashboard from './views/AdminDashboard';
import WorkerView from './views/WorkerView';
import { Scissors } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center text-slate-500 gap-3" dir="ltr">
        <div className="w-12 h-12 rounded-2xl bg-[#0F172A] flex items-center justify-center text-white shadow-xs">
          <Scissors className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-xs font-semibold text-slate-600">Initialisation de l'Atelier Taher...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A]" dir="ltr">
      <Navbar />

      {/* Role-based view routing */}
      {user.role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <WorkerView />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <AppContent />
      </DialogProvider>
    </AuthProvider>
  );
}
