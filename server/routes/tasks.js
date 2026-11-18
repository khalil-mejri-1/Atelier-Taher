import express from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Pattern from '../models/Pattern.js';
import ActivityLog from '../models/ActivityLog.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// -------------------------------------------------------------
// GET /api/tasks/pending-popup
// Vérifier rapidement s'il y a une tâche non consultée pour l'ouvrier connecté
// -------------------------------------------------------------
router.get('/pending-popup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Chercher la tâche la plus ancienne non consultée (ou la plus récente)
    const task = await Task.findOne({
      worker_id: userId,
      acknowledged: false,
      status: { $in: ['pending'] },
    }).sort({ created_at: 1 }); // Ordre chronologique pour qu'il voie d'abord la première tâche

    if (!task) {
      return res.json({ hasPending: false, task: null });
    }

    return res.json({
      hasPending: true,
      task,
    });
  } catch (err) {
    console.error('Erreur vérification tâche en attente :', err);
    res.status(500).json({ message: 'Erreur lors de la vérification des tâches' });
  }
});

// -------------------------------------------------------------
// GET /api/tasks/admin-notifications
// Récupérer les accusés de réception non encore vus par l'administrateur
// -------------------------------------------------------------
router.get('/admin-notifications', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const notifications = await Task.find({
      acknowledged: true,
      admin_notified: false,
    }).sort({ acknowledged_at: -1 });

    res.json({
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error('Erreur notifications admin :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des notifications' });
  }
});

// -------------------------------------------------------------
// POST /api/tasks/mark-admin-notified
// Marquer les notifications comme lues par l'admin
// -------------------------------------------------------------
router.post('/mark-admin-notified', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { taskIds } = req.body;
    const filter = { acknowledged: true, admin_notified: false };

    if (Array.isArray(taskIds) && taskIds.length > 0) {
      filter._id = { $in: taskIds };
    }

    await Task.updateMany(filter, { $set: { admin_notified: true } });

    res.json({ success: true, message: 'Notifications marquées comme lues' });
  } catch (err) {
    console.error('Erreur marquage notifications admin :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// -------------------------------------------------------------
// GET /api/tasks
// Liste des tâches (pour l'admin : toutes avec filtres ; pour l'ouvrier : les siennes)
// -------------------------------------------------------------
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter = {};

    if (!isAdmin) {
      filter.worker_id = req.user._id;
    } else {
      if (req.query.worker_id && req.query.worker_id !== 'all') {
        filter.worker_id = req.query.worker_id;
      }
    }

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    if (req.query.acknowledged !== undefined && req.query.acknowledged !== 'all') {
      filter.acknowledged = req.query.acknowledged === 'true';
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { worker_name: searchRegex },
        { message: searchRegex },
        { 'patterns.name_fr': searchRegex },
        { 'patterns.name_ar': searchRegex },
        { 'patterns.sku': searchRegex },
      ];
    }

    const tasks = await Task.find(filter).sort({ created_at: -1 });

    res.json({
      tasks,
      total: tasks.length,
    });
  } catch (err) {
    console.error('Erreur récupération tâches :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des tâches' });
  }
});

// -------------------------------------------------------------
// POST /api/tasks
// Assigner une nouvelle tâche à un ouvrier (Admin uniquement)
// -------------------------------------------------------------
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { worker_id, pattern_items, due_date, message } = req.body;

    if (!worker_id) {
      return res.status(400).json({ message: 'Veuillez sélectionner un ouvrier / يرجى تحديد العامل' });
    }

    if (!pattern_items || !Array.isArray(pattern_items) || pattern_items.length === 0) {
      return res.status(400).json({ message: 'Veuillez sélectionner au moins un patron / يرجى تحديد باترون واحد على الأقل' });
    }

    // Vérifier l'ouvrier
    const worker = await User.findById(worker_id);
    if (!worker) {
      return res.status(404).json({ message: 'Ouvrier introuvable / العامل غير موجود' });
    }

    // Récupérer les patrons depuis la DB
    const patternIds = pattern_items.map((item) => (typeof item === 'string' ? item : item.pattern_id));
    const patternsDb = await Pattern.find({ _id: { $in: patternIds } });

    if (patternsDb.length === 0) {
      return res.status(400).json({ message: 'Aucun patron valide trouvé' });
    }

    // Construire le tableau détaillé des patrons avec quantités
    const patternsList = patternsDb.map((p) => {
      const itemConfig = pattern_items.find(
        (it) => (typeof it === 'string' ? it : it.pattern_id?.toString()) === p._id.toString()
      );
      const targetQuantity = (itemConfig && typeof itemConfig === 'object' && Number(itemConfig.target_quantity) > 0)
        ? Number(itemConfig.target_quantity)
        : 1;

      return {
        pattern_id: p._id,
        name_fr: p.name_fr || '',
        name_ar: p.name_ar || '',
        sku: p.sku || '',
        category: p.category || '',
        image_url: p.image_url || '',
        size_range: p.size_range || '',
        target_quantity: targetQuantity,
      };
    });

    const parsedDueDate = due_date ? new Date(due_date) : null;

    const newTask = await Task.create({
      worker_id: worker._id,
      worker_name: worker.name,
      admin_id: req.user._id,
      admin_name: req.user.name,
      patterns: patternsList,
      message: (message || '').trim(),
      due_date: parsedDueDate && !isNaN(parsedDueDate.getTime()) ? parsedDueDate : null,
      status: 'pending',
      acknowledged: false,
      acknowledged_at: null,
      admin_notified: false,
    });

    // Enregistrer dans le journal d'activité
    const patronNames = patternsList.map((p) => p.name_ar || p.name_fr || p.sku).slice(0, 3).join(', ');
    const extraCount = patternsList.length > 3 ? ` (+${patternsList.length - 3})` : '';

    await ActivityLog.create({
      action_type: 'task_assign',
      user_id: req.user._id,
      user_name: req.user.name,
      user_role: 'admin',
      pattern_name: `${patronNames}${extraCount}`,
      notes: `إسناد مهمة جديدة للعامل ${worker.name} (${patternsList.length} باترون)${message ? ` : "${message}"` : ''}`,
    }).catch((err) => console.warn('Erreur log task_assign :', err.message));

    res.status(201).json({
      message: 'Tâche assignée et envoyée avec succès à l’ouvrier',
      task: newTask,
    });
  } catch (err) {
    console.error('Erreur création tâche :', err);
    res.status(500).json({ message: err.message || 'Erreur lors de l’envoi de la tâche' });
  }
});

// -------------------------------------------------------------
// POST /api/tasks/:id/acknowledge
// L'ouvrier confirme qu'il a pris connaissance de la tâche ("اطلعت عليها")
// -------------------------------------------------------------
router.post('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Tâche introuvable / المهمة غير موجودة' });
    }

    // Seul l'ouvrier assigné (ou un admin) peut accuser réception
    const isOwner = task.worker_id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Non autorisé à valider cette tâche' });
    }

    task.acknowledged = true;
    task.acknowledged_at = new Date();
    task.status = 'acknowledged';
    task.admin_notified = false; // Permet de déclencher l'alerte temps réel chez l'admin
    await task.save();

    // Enregistrer un log d'accusé de réception pour l'admin
    const patronSummary = task.patterns.map((p) => p.name_ar || p.name_fr || p.sku).slice(0, 3).join(', ');
    await ActivityLog.create({
      action_type: 'task_acknowledge',
      user_id: req.user._id,
      user_name: req.user.name,
      user_role: req.user.role,
      pattern_name: patronSummary,
      notes: `اطلع العامل ${task.worker_name} على المهمة المرسلة إليه وتأكيد استلامها`,
    }).catch((err) => console.warn('Erreur log task_acknowledge :', err.message));

    res.json({
      success: true,
      message: 'Accusé de réception confirmé avec succès',
      task,
    });
  } catch (err) {
    console.error('Erreur accusé de réception tâche :', err);
    res.status(500).json({ message: 'Erreur lors de la confirmation' });
  }
});

// -------------------------------------------------------------
// PUT /api/tasks/:id
// Mettre à jour l'état de la tâche (Terminée, Annulée, etc.) - Admin
// -------------------------------------------------------------
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message, due_date } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Tâche introuvable' });
    }

    if (status) task.status = status;
    if (message !== undefined) task.message = message.trim();
    if (due_date !== undefined) {
      task.due_date = due_date ? new Date(due_date) : null;
    }

    await task.save();

    res.json({
      message: 'Tâche mise à jour avec succès',
      task,
    });
  } catch (err) {
    console.error('Erreur mise à jour tâche :', err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
});

// -------------------------------------------------------------
// DELETE /api/tasks/:id
// Supprimer une tâche (Admin)
// -------------------------------------------------------------
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({ message: 'Tâche introuvable' });
    }

    res.json({ message: 'Tâche supprimée avec succès' });
  } catch (err) {
    console.error('Erreur suppression tâche :', err);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
});

export default router;

