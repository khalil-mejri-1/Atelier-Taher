import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Package, 
  MessageSquare, 
  Calendar, 
  Loader2,
  Check
} from 'lucide-react';
import { tasksApi } from '../api';

export default function WorkerTasksHistoryModal({ isOpen, onClose, onPreviewImage }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadMyTasks = async () => {
      setLoading(true);
      try {
        const res = await tasksApi.getAll();
        setTasks(res.tasks || []);
      } catch (err) {
        console.error('Erreur chargement mes tâches :', err);
      } finally {
        setLoading(false);
      }
    };

    loadMyTasks();
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center">
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                قائمة المهام المسندة إليّ (Mes tâches assignées)
              </h2>
              <p className="text-[11px] text-slate-500">
                النماذج والتعليمات المرسلة من إدارة الورشة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement de vos tâches...
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400/60" />
              <div className="font-bold text-slate-700">لا توجد أي مهام مسندة إليك حالياً</div>
              <p className="text-[11px] text-slate-400">ستظهر هنا أي نماذج يرسلها لك مسؤول الورشة مباشرة.</p>
            </div>
          ) : (
            tasks.map((task) => {
              const formattedDue = formatDueDate(task.due_date);
              const isCompleted = task.status === 'completed';

              return (
                <div 
                  key={task._id || task.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCompleted 
                      ? 'bg-slate-50 border-slate-200 opacity-70' 
                      : 'bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs">
                        {task.admin_name || 'الإدارة'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(task.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {isCompleted ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        مكتملة
                      </span>
                    ) : task.acknowledged ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        تم الاطلاع عليها
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        في انتظار الاطلاع
                      </span>
                    )}
                  </div>

                  {formattedDue && (
                    <div className="mb-2 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>الموعد المحدد : {formattedDue}</span>
                    </div>
                  )}

                  {task.message && (
                    <div className="mb-2.5 text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs leading-relaxed">
                      💬 {task.message}
                    </div>
                  )}

                  {/* Patrons */}
                  <div className="space-y-1.5">
                    {task.patterns?.map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-200/80"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt="" 
                              onClick={() => onPreviewImage && onPreviewImage(item.image_url, item.name_fr || item.name_ar)}
                              className="w-8 h-8 rounded-lg object-cover cursor-pointer hover:opacity-80" 
                            />
                          ) : (
                            <Package className="w-4 h-4 text-slate-400" />
                          )}
                          <div className="min-w-0">
                            <span className="font-mono text-[10px] font-bold text-slate-600 block">{item.sku}</span>
                            <span className="font-bold text-slate-900 truncate block text-xs">{item.name_fr || item.name_ar}</span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-lg bg-[#0F172A] text-white font-mono font-bold text-xs shrink-0">
                          × {item.target_quantity || 1}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
}

