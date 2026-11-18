import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  User, 
  Layers, 
  MessageSquare, 
  Calendar,
  Check,
  ChevronRight,
  Package,
  Sparkles,
  Eye,
  Loader2
} from 'lucide-react';
import { tasksApi, workersApi } from '../api';
import { useDialog } from '../context/DialogContext';
import TaskAssignModal from './TaskAssignModal';

export default function TasksManagementSection({ onPreviewImage }) {
  const { confirm, notify } = useDialog();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Filtres
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'acknowledged' | 'completed'
  const [workerFilter, setWorkerFilter] = useState('all');
  const [workersList, setWorkersList] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadTasks = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await tasksApi.getAll({
        search: search.trim() || undefined,
        worker_id: workerFilter !== 'all' ? workerFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Erreur chargement tâches :', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const loadWorkers = async () => {
    try {
      const res = await workersApi.getAll();
      setWorkersList(res.workers || []);
    } catch (err) {
      console.error('Erreur chargement liste ouvriers :', err);
    }
  };

  useEffect(() => {
    loadTasks();
    loadWorkers();
  }, [statusFilter, workerFilter]);

  // Synchronisation périodique pour voir les nouveaux accusés de réception en direct
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      loadTasks(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [search, statusFilter, workerFilter]);

  const handleToggleComplete = async (task) => {
    const nextStatus = task.status === 'completed' ? 'acknowledged' : 'completed';
    setActionLoadingId(task._id || task.id);
    try {
      await tasksApi.update(task._id || task.id, { status: nextStatus });
      notify.success(
        nextStatus === 'completed'
          ? 'Tâche marquée comme terminée ! / تم تعيين المهمة كمكتملة'
          : 'Tâche réactivée'
      );
      await loadTasks(true);
    } catch (err) {
      notify.error(err.message || 'Erreur mise à jour tâche');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteTask = async (task) => {
    const confirmed = await confirm({
      title: "Supprimer cette tâche ?",
      titleAr: "حذف هذه المهمة المرسلة ؟",
      message: `Voulez-vous vraiment supprimer la tâche envoyée à ${task.worker_name} ?`,
      messageAr: `هل أنت متأكد من حذف المهمة المسندة للعامل "${task.worker_name}" ؟`,
      type: 'danger',
      confirmText: 'Supprimer / حذف',
      cancelText: 'Annuler / إلغاء'
    });

    if (!confirmed) return;

    setActionLoadingId(task._id || task.id);
    try {
      await tasksApi.delete(task._id || task.id);
      notify.success('Tâche supprimée avec succès / تم حذف المهمة بنجاح');
      await loadTasks(true);
    } catch (err) {
      notify.error(err.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return "à l'instant / للتو";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `il y a ${diffMin}m / منذ ${diffMin} دقيقة`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH}h / منذ ${diffH} ساعة`;
    const diffD = Math.floor(diffH / 24);
    return `il y a ${diffD}j / منذ ${diffD} يوم`;
  };

  // Statistiques rapides
  const totalTasks = tasks.length;
  const pendingAckCount = tasks.filter((t) => !t.acknowledged).length;
  const ackedCount = tasks.filter((t) => t.acknowledged && t.status !== 'completed').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-4">
      
      {/* KPI Cards des tâches */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total des tâches */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              إجمالي المهام
            </span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">{totalTasks}</span>
            <span className="text-[10px] text-slate-400 font-semibold">tâches créées</span>
          </div>
        </div>

        {/* En attente de consultation */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-amber-200/80 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
              في انتظار الاطلاع
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-amber-600">{pendingAckCount}</span>
            <span className="text-[10px] text-amber-600/80 font-semibold">non encore ouvertes</span>
          </div>
        </div>

        {/* Consultées (Pris connaissance) */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-emerald-200/80 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
              تم الاطلاع عليها
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-600">{ackedCount}</span>
            <span className="text-[10px] text-emerald-600/80 font-semibold">en cours d'exécution</span>
          </div>
        </div>

        {/* Terminées */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-blue-200/80 shadow-2xs bg-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
              مكتملة ومُنجزة
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Check className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-blue-700">{completedCount}</span>
            <span className="text-[10px] text-blue-600/80 font-semibold">terminées avec succès</span>
          </div>
        </div>
      </div>

      {/* Barre d'action & Filtres */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          
          {/* Titre & Bouton d'ajout */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                سجل المهام المرسلة للعمال (Suivi des tâches assignées)
              </h3>
              <p className="text-[11px] text-slate-400">
                تتبع حالة استلام المهام وإشعارات الاطلاع الفورية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadTasks(false)}
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Actualiser"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setAssignModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-amber-300" />
              <span>إرسال مهمة جديدة لعامل</span>
            </button>
          </div>
        </div>

        {/* Filtres secondaires */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100">
          {/* Recherche texte */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTasks(false)}
              placeholder="بحث بالعامل أو الباترون أو الرسالة..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-800"
            />
          </div>

          {/* Filtre Ouvrier */}
          <select
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden"
          >
            <option value="all">كل العمال (Tous les ouvriers)</option>
            {workersList.map((w) => (
              <option key={w.id || w._id} value={w.id || w._id}>
                {w.name} (@{w.username})
              </option>
            ))}
          </select>

          {/* Filtre Statut */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden"
          >
            <option value="all">جميع الحالات (Tous les statuts)</option>
            <option value="pending">⏳ في الانتظار (Non lue)</option>
            <option value="acknowledged">✅ تم الاطلاع عليها (Pris connaissance)</option>
            <option value="completed">✔️ مكتملة (Terminée)</option>
          </select>
        </div>
      </div>

      {/* Liste des tâches */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> Chargement des tâches assignées...
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">لا توجد مهام مرسلة حالياً</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              يمكنك إسناد مهام جديدة للعمال مع تحديد النماذج والوقت والتعليمات لتظهر لهم فوراً في وسط الشاشة.
            </p>
          </div>
          <button
            onClick={() => setAssignModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-amber-300" />
            <span>إرسال أول مهمة الآن</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isAcknowledged = task.acknowledged;
            const isCompleted = task.status === 'completed';
            const hasDue = Boolean(task.due_date);
            const isOverdue = hasDue && new Date(task.due_date) < new Date() && !isCompleted;

            return (
              <div
                key={task._id || task.id}
                className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all ${
                  isCompleted
                    ? 'border-slate-200 opacity-80 bg-slate-50/50'
                    : isAcknowledged
                    ? 'border-emerald-200/90 hover:border-emerald-300'
                    : 'border-amber-200 hover:border-amber-300 bg-amber-50/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  
                  {/* Partie gauche : Ouvrier & Détails */}
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Statut Icon */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isCompleted 
                        ? 'bg-blue-100 text-blue-700' 
                        : isAcknowledged 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : isAcknowledged ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5 animate-pulse" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* En-tête de tâche */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {task.worker_name}
                        </span>

                        {/* Badge de statut */}
                        {isCompleted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            ✔️ مكتملة (Terminée)
                          </span>
                        ) : isAcknowledged ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>تم الاطلاع عليها (Vu)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                            <span>في الانتظار (لم يفتحها بعد)</span>
                          </span>
                        )}

                        {/* Date d'envoi relative */}
                        <span className="text-[11px] text-slate-400 font-mono">
                          • {formatRelativeTime(task.created_at)}
                        </span>
                      </div>

                      {/* Échéance si définie */}
                      <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                        {hasDue && (
                          <div className={`flex items-center gap-1 font-semibold text-[11px] ${
                            isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>الموعد المحدد : {formatDateTime(task.due_date)}</span>
                            {isOverdue && <span className="text-red-500 text-[10px] bg-red-50 px-1 rounded">(délai dépassé)</span>}
                          </div>
                        )}

                        {isAcknowledged && task.acknowledged_at && (
                          <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                            <span>وقت الاطلاع : {formatDateTime(task.acknowledged_at)}</span>
                          </div>
                        )}
                      </div>

                      {/* Message de l'administrateur */}
                      {task.message && (
                        <div className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="whitespace-pre-line leading-relaxed">{task.message}</span>
                        </div>
                      )}

                      {/* Liste des patrons assignés */}
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500">النماذج :</span>
                        {task.patterns?.map((item, idx) => (
                          <div 
                            key={idx}
                            onClick={() => item.image_url && onPreviewImage && onPreviewImage(item.image_url, item.name_fr || item.name_ar)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border border-slate-200 bg-white text-xs shadow-2xs ${
                              item.image_url ? 'cursor-pointer hover:border-slate-400' : ''
                            }`}
                          >
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="w-5 h-5 rounded-md object-cover" />
                            ) : (
                              <Package className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className="font-mono text-[10px] font-bold text-slate-800">{item.sku}</span>
                            <span className="font-bold text-[11px] text-slate-700">{item.name_fr || item.name_ar}</span>
                            <span className="font-mono font-bold text-[10px] text-white bg-slate-900 px-1 rounded">
                              ×{item.target_quantity || 1}
                            </span>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>

                  {/* Actions à droite */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <button
                      disabled={actionLoadingId === (task._id || task.id)}
                      onClick={() => handleToggleComplete(task)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                        isCompleted
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isCompleted ? 'إعادة فتح المهمة' : 'تعيين كمكتملة'}</span>
                    </button>

                    <button
                      disabled={actionLoadingId === (task._id || task.id)}
                      onClick={() => handleDeleteTask(task)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Supprimer la tâche"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'assignation d'une nouvelle tâche */}
      <TaskAssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onTaskCreated={() => loadTasks(true)}
      />

    </div>
  );
}

