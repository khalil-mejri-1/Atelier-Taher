import express from 'express';
import mongoose from 'mongoose';
import Pattern from '../models/Pattern.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/logs : liste des journaux d'activité avec filtres avancés (type, patron, date du jour)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      action_type, 
      search, 
      limit = 100, 
      pattern_id, 
      today, 
      include_undone 
    } = req.query;

    const filter = {};

    // Exclure les opérations déjà annulées par défaut sauf si demandé
    if (include_undone !== 'true' && include_undone !== '1') {
      filter.undone = { $ne: 1 };
    }

    if (action_type && action_type !== 'all' && action_type !== 'Tous') {
      if (action_type === 'production') {
        filter.action_type = {
          $in: ['production_increment', 'production_custom'],
        };
      } else if (action_type === 'order') {
        filter.action_type = 'order_deduct';
      } else {
        filter.action_type = action_type;
      }
    }

    // Filtrer par patron spécifique si fourni
    if (pattern_id) {
      if (mongoose.Types.ObjectId.isValid(pattern_id)) {
        filter.pattern_id = new mongoose.Types.ObjectId(pattern_id);
      } else {
        filter.pattern_id = pattern_id;
      }
    }

    // Filtrer uniquement les opérations du jour si demandé
    if (today === 'true' || today === '1') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      filter.created_at = { $gte: startOfDay };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { pattern_name: regex },
        { pattern_sku: regex },
        { user_name: regex },
        { notes: regex },
      ];
    }

    const logs = await ActivityLog.find(filter)
      .populate('pattern_id', 'image_url price name_fr name_ar sku category')
      .sort({ created_at: -1, _id: -1 })
      .limit(parseInt(limit, 10) || 100);

    res.json({ logs });
  } catch (err) {
    console.error('Erreur récupération logs :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération du journal d’activité' });
  }
});

// POST /api/logs/bulk-delete : Supprimer / annuler plusieurs opérations d'un coup (حذف جماعي للعمليات)
router.post('/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const { logIds } = req.body;
    if (!Array.isArray(logIds) || logIds.length === 0) {
      return res.status(400).json({ message: 'Veuillez sélectionner au moins une opération' });
    }

    const objectIds = logIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const logs = await ActivityLog.find({
      _id: { $in: objectIds },
      undone: { $ne: 1 },
    });

    let count = 0;
    for (const log of logs) {
      // Seul l'administrateur ou le propriétaire peut annuler
      if (
        req.user.role !== 'admin' &&
        log.user_id &&
        req.user._id &&
        log.user_id.toString() !== req.user._id.toString()
      ) {
        continue;
      }

      // Recherche souple du patron
      let pattern = null;
      if (log.pattern_id && mongoose.Types.ObjectId.isValid(log.pattern_id)) {
        pattern = await Pattern.findById(log.pattern_id);
      }
      if (!pattern && log.pattern_sku) {
        pattern = await Pattern.findOne({ sku: log.pattern_sku });
      }
      if (!pattern && log.pattern_name) {
        pattern = await Pattern.findOne({
          $or: [{ name_fr: log.pattern_name }, { name_ar: log.pattern_name }],
        });
      }

      const rawQty = log.quantity_changed || 1;
      const absQty = Math.abs(rawQty);

      if (pattern) {
        if (log.action_type === 'order_deduct') {
          pattern.current_stock = (pattern.current_stock || 0) + absQty;
        } else {
          pattern.current_stock = Math.max(0, (pattern.current_stock || 0) - absQty);
        }
        await pattern.save();
      }

      log.undone = 1;
      await log.save();

      // Ajuster solde ouvrier si production
      const isProduction = log.action_type === 'production_increment' || log.action_type === 'production_custom';
      if (isProduction && log.user_id) {
        const unitPrice = typeof log.unit_price === 'number'
          ? log.unit_price
          : (pattern?.price || 0);
        const rollbackAmount = typeof log.total_price === 'number'
          ? Math.abs(log.total_price)
          : (absQty * unitPrice);

        if (rollbackAmount > 0) {
          await User.findByIdAndUpdate(log.user_id, {
            $inc: { balance: -rollbackAmount },
          });
        }
      }

      count++;
    }

    res.json({
      success: true,
      message: `${count} opération(s) supprimée(s) et stocks ajustés avec succès`,
      count,
    });
  } catch (err) {
    console.error('Erreur bulk-delete logs :', err);
    res.status(500).json({ message: 'Erreur lors de la suppression groupée des opérations' });
  }
});

// DELETE /api/logs/:id : Supprimer / annuler une opération
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const logId = req.params.id;
    let log = null;
    if (mongoose.Types.ObjectId.isValid(logId)) {
      log = await ActivityLog.findById(logId);
    }
    if (!log) {
      log = await ActivityLog.findOne({ _id: logId });
    }
    if (!log) {
      return res.status(404).json({ message: 'Opération introuvable' });
    }

    // Seul l'administrateur ou le propriétaire de l'opération peut l'annuler
    if (
      req.user.role !== 'admin' &&
      log.user_id &&
      req.user._id &&
      log.user_id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Recherche souple du patron (ID, SKU ou Nom)
    let pattern = null;
    if (log.pattern_id && mongoose.Types.ObjectId.isValid(log.pattern_id)) {
      pattern = await Pattern.findById(log.pattern_id);
    }
    if (!pattern && log.pattern_sku) {
      pattern = await Pattern.findOne({ sku: log.pattern_sku });
    }
    if (!pattern && log.pattern_name) {
      pattern = await Pattern.findOne({
        $or: [{ name_fr: log.pattern_name }, { name_ar: log.pattern_name }],
      });
    }

    const rawQty = log.quantity_changed || 1;
    const absQty = Math.abs(rawQty);

    if (pattern) {
      if (log.action_type === 'order_deduct') {
        pattern.current_stock = (pattern.current_stock || 0) + absQty;
      } else {
        pattern.current_stock = Math.max(0, (pattern.current_stock || 0) - absQty);
      }
      await pattern.save();
    }

    log.undone = 1;
    await log.save();

    // Ajuster le solde de l'ouvrier si c'était une opération de production
    const isProduction = log.action_type === 'production_increment' || log.action_type === 'production_custom';
    if (isProduction && log.user_id) {
      const unitPrice = typeof log.unit_price === 'number'
        ? log.unit_price
        : (pattern?.price || 0);
      const rollbackAmount = typeof log.total_price === 'number'
        ? Math.abs(log.total_price)
        : (absQty * unitPrice);

      if (rollbackAmount > 0) {
        await User.findByIdAndUpdate(log.user_id, {
          $inc: { balance: -rollbackAmount },
        });
      }
    }

    res.json({
      success: true,
      message: 'Opération supprimée et stock mis à jour avec succès',
      pattern,
    });
  } catch (err) {
    console.error('Erreur suppression log :', err);
    res.status(500).json({ message: 'Erreur lors de la suppression de l’opération' });
  }
});

// GET /api/logs/my-today : Impressions enregistrées aujourd'hui par l'utilisateur connecté
router.get('/my-today', authenticateToken, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const matchFilter = {
      action_type: { $in: ['production_increment', 'production_custom'] },
      user_id: req.user._id,
      undone: 0,
      created_at: { $gte: startOfDay, $lte: endOfDay },
    };

    const logs = await ActivityLog.find(matchFilter)
      .populate('pattern_id', 'image_url price name_fr name_ar sku category has_parts parts')
      .sort({ created_at: -1 });

    let totalQuantity = 0;
    let totalEarnings = 0;

    logs.forEach((log) => {
      const qty = log.quantity_changed || 0;
      const amount = typeof log.total_price === 'number'
        ? log.total_price
        : (qty * (log.unit_price || 0));

      totalQuantity += qty;
      totalEarnings += amount;
    });

    res.json({
      logs,
      totalQuantity,
      totalEarnings,
    });
  } catch (err) {
    console.error('Erreur my-today logs :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération de vos impressions' });
  }
});

// GET /api/logs/daily-production : Suivi journalier détaillé de la production des ouvriers et calcul des gains
router.get('/daily-production', authenticateToken, async (req, res) => {
  try {
    const { date, worker_id } = req.query;

    let targetDate = new Date();
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        targetDate = new Date(date);
      }
    }
    if (isNaN(targetDate.getTime())) targetDate = new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const matchFilter = {
      action_type: { $in: ['production_increment', 'production_custom'] },
      undone: 0,
      created_at: { $gte: startOfDay, $lte: endOfDay },
    };

    if (worker_id && worker_id !== 'all') {
      if (mongoose.Types.ObjectId.isValid(worker_id)) {
        matchFilter.user_id = new mongoose.Types.ObjectId(worker_id);
      }
    }

    const logs = await ActivityLog.find(matchFilter)
      .populate('pattern_id', 'image_url price name_fr name_ar sku category has_parts parts')
      .sort({ created_at: -1 });

    let totalQuantity = 0;
    let totalEarnings = 0;
    const workerMap = {};

    logs.forEach((log) => {
      const qty = log.quantity_changed || 0;
      const amount = typeof log.total_price === 'number'
        ? log.total_price
        : (qty * (log.unit_price || 0));

      totalQuantity += qty;
      totalEarnings += amount;

      const uid = log.user_id ? log.user_id.toString() : 'unknown';
      if (!workerMap[uid]) {
        workerMap[uid] = {
          worker_id: log.user_id,
          worker_name: log.user_name || 'Opérateur inconnu',
          total_pieces: 0,
          total_earned: 0,
          patterns: {},
        };
      }

      workerMap[uid].total_pieces += qty;
      workerMap[uid].total_earned += amount;

      const pKey = log.pattern_sku || log.pattern_name || 'Sans Nom';
      if (!workerMap[uid].patterns[pKey]) {
        workerMap[uid].patterns[pKey] = {
          pattern_sku: log.pattern_sku,
          pattern_name: log.pattern_name,
          unit_price: log.unit_price || 0,
          quantity: 0,
          total_amount: 0,
        };
      }
      workerMap[uid].patterns[pKey].quantity += qty;
      workerMap[uid].patterns[pKey].total_amount += amount;
    });

    const workersSummary = Object.values(workerMap).map((w) => ({
      worker_id: w.worker_id,
      worker_name: w.worker_name,
      total_pieces: w.total_pieces,
      total_earned: parseFloat(w.total_earned.toFixed(3)),
      patterns_breakdown: Object.values(w.patterns),
    }));

    // Liste des ouvriers pour le filtre
    const allWorkers = await User.find({ role: 'worker' }, '_id name username balance status').sort({ name: 1 });

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    res.json({
      date: formattedDate,
      totalQuantity,
      totalEarnings: parseFloat(totalEarnings.toFixed(3)),
      activeWorkersCount: workersSummary.length,
      workersSummary,
      allWorkers,
      logs,
    });
  } catch (err) {
    console.error('Erreur rapport journalier de production :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération du rapport journalier' });
  }
});

// GET /api/logs/stats : KPI et synthèse de production
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalPatterns = await Pattern.countDocuments();

    const stockAgg = await Pattern.aggregate([
      { $group: { _id: null, total: { $sum: '$current_stock' } } },
    ]);
    const totalStock = stockAgg.length > 0 ? stockAgg[0].total : 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Produits aujourd'hui
    const producedAgg = await ActivityLog.aggregate([
      {
        $match: {
          action_type: { $in: ['production_increment', 'production_custom'] },
          undone: 0,
          created_at: { $gte: startOfDay },
        },
      },
      { $group: { _id: null, total: { $sum: '$quantity_changed' } } },
    ]);
    const producedToday = producedAgg.length > 0 ? producedAgg[0].total : 0;

    // Déduits aujourd'hui (commandes expédiées)
    const deductedAgg = await ActivityLog.aggregate([
      {
        $match: {
          action_type: 'order_deduct',
          undone: 0,
          created_at: { $gte: startOfDay },
        },
      },
      { $group: { _id: null, total: { $sum: '$quantity_changed' } } },
    ]);
    const deductedToday = deductedAgg.length > 0 ? Math.abs(deductedAgg[0].total) : 0;

    // Nombre d'articles en stock faible
    const lowStockCount = await Pattern.countDocuments({
      $expr: { $lte: ['$current_stock', '$low_stock_threshold'] },
    });

    // Stock critique (<= 3)
    const criticalStockCount = await Pattern.countDocuments({
      current_stock: { $lte: 3 },
    });

    // Statistiques par catégorie
    const categoryStats = await Pattern.aggregate([
      {
        $group: {
          _id: '$category',
          pattern_count: { $sum: 1 },
          total_stock: { $sum: '$current_stock' },
        },
      },
      {
        $project: {
          category: '$_id',
          pattern_count: 1,
          total_stock: 1,
          _id: 0,
        },
      },
      { $sort: { total_stock: -1 } },
    ]);

    // Top 5 patrons les plus produits
    const topProducedPatterns = await ActivityLog.aggregate([
      {
        $match: {
          action_type: { $in: ['production_increment', 'production_custom'] },
          undone: 0,
        },
      },
      {
        $group: {
          _id: '$pattern_id',
          pattern_name: { $first: '$pattern_name' },
          pattern_sku: { $first: '$pattern_sku' },
          total_produced: { $sum: '$quantity_changed' },
        },
      },
      { $sort: { total_produced: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totalPatterns,
      totalStock,
      producedToday,
      deductedToday,
      lowStockCount,
      criticalStockCount,
      categoryStats,
      topProducedPatterns,
    });
  } catch (err) {
    console.error('Erreur calcul statistiques :', err);
    res.status(500).json({ message: 'Erreur lors du calcul des statistiques' });
  }
});

export default router;
