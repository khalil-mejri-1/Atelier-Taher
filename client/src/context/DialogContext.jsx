import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  AlertCircle, 
  X, 
  Trash2,
  Check,
  Sparkles
} from 'lucide-react';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  // Confirmation Dialog State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    titleAr: '',
    message: '',
    messageAr: '',
    details: '',
    confirmText: 'Confirmer / تأكيد',
    cancelText: 'Annuler / إلغاء',
    type: 'danger', // 'danger' | 'warning' | 'info' | 'success'
    resolve: null
  });

  // Notice / Alert Dialog State
  const [noticeState, setNoticeState] = useState({
    isOpen: false,
    title: '',
    titleAr: '',
    message: '',
    messageAr: '',
    type: 'info', // 'success' | 'error' | 'warning' | 'info'
    buttonText: 'D’accord / حسناً',
    resolve: null
  });

  // Toast Notifications State
  const [toasts, setToasts] = useState([]);

  // Trigger Confirmation Modal
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Confirmation requise',
        titleAr: options.titleAr || 'تأكيد العملية',
        message: options.message || 'Êtes-vous sûr de vouloir continuer ?',
        messageAr: options.messageAr || '',
        details: options.details || '',
        confirmText: options.confirmText || 'Confirmer / تأكيد',
        cancelText: options.cancelText || 'Annuler / إلغاء',
        type: options.type || 'danger',
        resolve
      });
    });
  }, []);

  // Trigger Notice/Alert Modal
  const showNotice = useCallback((options) => {
    return new Promise((resolve) => {
      setNoticeState({
        isOpen: true,
        title: options.title || 'Information',
        titleAr: options.titleAr || 'إشعار',
        message: typeof options === 'string' ? options : (options.message || ''),
        messageAr: options.messageAr || '',
        type: options.type || 'info',
        buttonText: options.buttonText || 'D’accord / حسناً',
        resolve
      });
    });
  }, []);

  // Toast Notification
  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const notify = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration)
  };

  // Confirmation handlers
  const handleConfirmAction = () => {
    if (confirmState.resolve) confirmState.resolve(true);
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancelAction = () => {
    if (confirmState.resolve) confirmState.resolve(false);
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  // Notice handlers
  const handleNoticeClose = () => {
    if (noticeState.resolve) noticeState.resolve();
    setNoticeState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <DialogContext.Provider value={{ confirm, showNotice, notify }}>
      {children}

      {/* 1. PROFESSIONAL CONFIRMATION DIALOG */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-100 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-150 text-left my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button top right */}
            <button
              onClick={handleCancelAction}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon Header */}
            <div className="flex items-start gap-3.5 mb-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                confirmState.type === 'danger'
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : confirmState.type === 'warning'
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : confirmState.type === 'success'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}>
                {confirmState.type === 'danger' ? (
                  <Trash2 className="w-6 h-6 stroke-[2]" />
                ) : confirmState.type === 'warning' ? (
                  <AlertTriangle className="w-6 h-6 stroke-[2]" />
                ) : confirmState.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 stroke-[2]" />
                ) : (
                  <Info className="w-6 h-6 stroke-[2]" />
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                  {confirmState.title}
                </h3>
                {confirmState.titleAr && (
                  <p className="text-xs text-slate-500 font-semibold mt-0.5" dir="rtl">
                    {confirmState.titleAr}
                  </p>
                )}
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-2 mb-5">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {confirmState.message}
              </p>

              {confirmState.messageAr && (
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed font-arabic" dir="rtl">
                  {confirmState.messageAr}
                </div>
              )}

              {confirmState.details && (
                <div className="p-2 bg-slate-100 rounded-xl text-[11px] font-mono text-slate-700">
                  {confirmState.details}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelAction}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                {confirmState.cancelText}
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                  confirmState.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmState.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : confirmState.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[#0F172A] hover:bg-slate-800'
                }`}
              >
                {confirmState.type === 'danger' ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>{confirmState.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PROFESSIONAL NOTICE / ALERT DIALOG */}
      {noticeState.isOpen && (
        <div className="fixed inset-0 z-100 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-150 text-center my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-sm border ${
              noticeState.type === 'error'
                ? 'bg-red-50 text-red-600 border-red-200'
                : noticeState.type === 'warning'
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : noticeState.type === 'success'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-indigo-50 text-indigo-600 border-indigo-200'
            }`}>
              {noticeState.type === 'error' ? (
                <AlertCircle className="w-6 h-6 stroke-[2]" />
              ) : noticeState.type === 'warning' ? (
                <AlertTriangle className="w-6 h-6 stroke-[2]" />
              ) : noticeState.type === 'success' ? (
                <CheckCircle2 className="w-6 h-6 stroke-[2]" />
              ) : (
                <Info className="w-6 h-6 stroke-[2]" />
              )}
            </div>

            <h3 className="font-extrabold text-base text-slate-900 leading-tight">
              {noticeState.title}
            </h3>
            {noticeState.titleAr && (
              <p className="text-xs text-slate-500 font-semibold mt-0.5" dir="rtl">
                {noticeState.titleAr}
              </p>
            )}

            <div className="my-3 space-y-1">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {noticeState.message}
              </p>
              {noticeState.messageAr && (
                <p className="text-xs text-slate-500 leading-relaxed font-arabic" dir="rtl">
                  {noticeState.messageAr}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleNoticeClose}
              className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs transition-transform active:scale-95 cursor-pointer mt-2 ${
                noticeState.type === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : noticeState.type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#0F172A] hover:bg-slate-800'
              }`}
            >
              {noticeState.buttonText}
            </button>
          </div>
        </div>
      )}

      {/* 3. FLOATING TOAST NOTIFICATIONS */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-110 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-200 ${
                toast.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : toast.type === 'error'
                  ? 'bg-red-600 text-white border-red-700'
                  : toast.type === 'warning'
                  ? 'bg-amber-600 text-white border-amber-700'
                  : 'bg-[#0F172A] text-white border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
                ) : toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-white" />
                ) : toast.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
                ) : (
                  <Info className="w-4 h-4 shrink-0 text-white" />
                )}
                <span className="text-xs font-semibold leading-tight">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-white/70 hover:text-white p-1 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
