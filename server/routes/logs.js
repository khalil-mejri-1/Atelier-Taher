import express from 'express';
import Pattern from '../models/Pattern.js';
import ActivityLog from '../models/ActivityLog.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/logs : liste des journaux d'activité
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { action_type, search, limit = 100 } = req.query;

    const filter = {};

    if (action_type && action_type !== 'all' && action_type !== 'Tous') {
      if (action_type === 'production') {
        filter.action_type = {
          $in: ['production_increment', 'production_custom', 'production_undo'],
        };
      } else if (action_type === 'order') {
        filter.action_type = 'order_deduct';
      } else {
        filter.action_type = action_type;
      }
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
      .sort({ created_at: -1, _id: -1 })
      .limit(parseInt(limit, 10) || 100);

    res.json({ logs });
  } catch (err) {
    console.error('Erreur récupération logs :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération du journal d’activité' });
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
