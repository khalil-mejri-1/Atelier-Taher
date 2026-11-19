import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import Settlement from '../models/Settlement.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Toutes les opérations de règlement nécessitent le rôle Administrateur
router.use(authenticateToken, requireRole(['admin']));

// GET /api/settlements/unpaid-summary
// Calcule avec précision le coût total cumulé de TOUS les jours non encore payés aux ouvriers
router.get('/unpaid-summary', async (req, res) => {
  try {
    const { worker_id } = req.query;

    const workerFilter = { role: 'worker' };
    if (worker_id && worker_id !== 'all' && mongoose.Types.ObjectId.isValid(worker_id)) {
      workerFilter._id = new mongoose.Types.ObjectId(worker_id);
    }

    const workers = await User.find(workerFilter).select('_id name username balance last_settled_at status').sort({ name: 1 });

    const workerSummaries = [];
    let grandTotalUnpaid = 0;
    let grandTotalPieces = 0;

    for (const worker of workers) {
      // Trouver tous les journaux de production actifs et NON encore réglés (non payés)
      const unpaidLogs = await ActivityLog.find({
        user_id: worker._id,
        action_type: { $in: ['production_increment', 'production_custom'] },
        undone: 0,
        settled: { $ne: true },
      }).sort({ created_at: -1 });

      // Grouper les opérations par jour (YYYY-MM-DD)
      const dayMap = {};
      let workerTotalAmount = 0;
      let workerTotalPieces = 0;

      for (const log of unpaidLogs) {
        const dateStr = log.created_at ? log.created_at.toISOString().split('T')[0] : 'Inconnue';
        const qty = log.quantity_changed || 1;
        const amount = typeof log.total_price === 'number'
          ? log.total_price
          : (qty * (log.unit_price || 0));

        if (!dayMap[dateStr]) {
          dayMap[dateStr] = {
            date: dateStr,
            pieces: 0,
            amount: 0,
            operations_count: 0,
            patterns_breakdown: {},
          };
        }

        dayMap[dateStr].pieces += qty;
        dayMap[dateStr].amount += amount;
        dayMap[dateStr].operations_count += 1;

        const pKey = log.pattern_sku || log.pattern_name || 'Autre';
        if (!dayMap[dateStr].patterns_breakdown[pKey]) {
          dayMap[dateStr].patterns_breakdown[pKey] = {
            sku: log.pattern_sku,
            name: log.pattern_name,
            quantity: 0,
            amount: 0,
            unit_price: log.unit_price || 0,
          };
        }
        dayMap[dateStr].patterns_breakdown[pKey].quantity += qty;
        dayMap[dateStr].patterns_breakdown[pKey].amount += amount;

        workerTotalAmount += amount;
        workerTotalPieces += qty;
      }

      const unpaidDays = Object.values(dayMap)
        .map((d) => ({
          date: d.date,
          pieces: d.pieces,
          amount: parseFloat(d.amount.toFixed(3)),
          operations_count: d.operations_count,
          patterns: Object.values(d.patterns_breakdown),
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      const finalAmount = parseFloat(workerTotalAmount.toFixed(3));
      grandTotalUnpaid += finalAmount;
      grandTotalPieces += workerTotalPieces;

      workerSummaries.push({
        worker_id: worker._id,
        worker_name: worker.name,
        username: worker.username,
        status: worker.status,
        balance: worker.balance,
        total_unpaid_amount: finalAmount,
        unpaid_days_count: unpaidDays.length,
        unpaid_pieces_count: workerTotalPieces,
        last_settled_at: worker.last_settled_at,
        unpaid_days: unpaidDays,
      });
    }

    const workersWithBalance = workerSummaries.filter((w) => w.total_unpaid_amount > 0 || (w.balance && w.balance > 0));

    res.json({
      success: true,
      grand_total_unpaid: parseFloat(grandTotalUnpaid.toFixed(3)),
      grand_total_pieces: grandTotalPieces,
      workers_with_balance_count: workersWithBalance.length,
      total_workers_count: workers.length,
      workers: workerSummaries,
    });
  } catch (err) {
    console.error('Erreur unpaid-summary :', err);
    res.status(500).json({ message: 'Erreur lors du calcul du récapitulatif des impayés' });
  }
});

// POST /api/settlements/settle
// Clôturer et enregistrer le خلاص d'un ouvrier pour toutes ses journées en attente (ou un montant/dates spécifiques)
router.post('/settle', async (req, res) => {
  try {
    const { worker_id, amount, notes = '', dates } = req.body;

    if (!worker_id || !mongoose.Types.ObjectId.isValid(worker_id)) {
      return res.status(400).json({ message: 'Identifiant d’ouvrier invalide' });
    }

    const worker = await User.findById(worker_id);
    if (!worker) {
      return res.status(404).json({ message: 'Ouvrier introuvable' });
    }

    // Récupérer les logs impayés
    const logFilter = {
      user_id: worker._id,
      action_type: { $in: ['production_increment', 'production_custom'] },
      undone: 0,
      settled: { $ne: true },
    };

    const unpaidLogs = await ActivityLog.find(logFilter);

    if (unpaidLogs.length === 0 && (!worker.balance || worker.balance <= 0)) {
      return res.status(400).json({ message: 'Cet ouvrier n’a aucun montant en attente de règlement' });
    }

    // Calculer le total réel des logs
    let computedAmount = 0;
    let piecesCount = 0;
    const settledDatesSet = new Set();
    const logsToSettleIds = [];

    for (const log of unpaidLogs) {
      const dStr = log.created_at ? log.created_at.toISOString().split('T')[0] : '';
      if (Array.isArray(dates) && dates.length > 0 && !dates.includes(dStr)) {
        continue;
      }

      const qty = log.quantity_changed || 1;
      const logAmount = typeof log.total_price === 'number'
        ? log.total_price
        : (qty * (log.unit_price || 0));

      computedAmount += logAmount;
      piecesCount += qty;
      if (dStr) settledDatesSet.add(dStr);
      logsToSettleIds.push(log._id);
    }

    const settledAmount = typeof amount === 'number' && amount > 0
      ? amount
      : (computedAmount > 0 ? computedAmount : (worker.balance || 0));

    const settledDatesArray = Array.from(settledDatesSet).sort();

    // 1. Créer le document de règlement (Settlement)
    const settlement = await Settlement.create({
      worker_id: worker._id,
      worker_name: worker.name,
      admin_id: req.user._id,
      admin_name: req.user.name,
      amount: parseFloat(settledAmount.toFixed(3)),
      pieces_count: piecesCount,
      days_count: settledDatesArray.length,
      settled_dates: settledDatesArray,
      notes: notes.trim(),
    });

    // 2. Marquer les logs correspondants comme réglés
    if (logsToSettleIds.length > 0) {
      await ActivityLog.updateMany(
        { _id: { $in: logsToSettleIds } },
        { $set: { settled: true, settlement_id: settlement._id } }
      );
    }

    // 3. Mettre à jour le solde et la date de règlement du compte ouvrier
    worker.balance = Math.max(0, parseFloat(((worker.balance || 0) - settledAmount).toFixed(3)));
    worker.last_settled_at = new Date();
    await worker.save();

    // 4. Enregistrer un ActivityLog de sécurité
    const datesSummary = settledDatesArray.length > 0
      ? `(${settledDatesArray.join(', ')})`
      : '';
    await ActivityLog.create({
      action_type: 'worker_settlement',
      user_id: req.user._id,
      user_name: req.user.name,
      user_role: req.user.role,
      quantity_changed: piecesCount,
      previous_stock: 0,
      new_stock: 0,
      unit_price: 0,
      total_price: settledAmount,
      notes: `خلاص مستحقات العامل: ${worker.name} بمبلغ ${settledAmount.toFixed(3)} DT لعدد ${settledDatesArray.length} يوم ${datesSummary}${notes ? ' - ' + notes.trim() : ''}`,
      undone: 0,
    });

    res.json({
      success: true,
      message: `Règlement enregistré avec succès : ${settledAmount.toFixed(3)} DT réglés pour ${worker.name}`,
      settlement,
      new_balance: worker.balance,
    });
  } catch (err) {
    console.error('Erreur settle ouvrier :', err);
    res.status(500).json({ message: 'Erreur lors de l’enregistrement du règlement' });
  }
});

// GET /api/settlements/history
// Historique des règlements passés
router.get('/history', async (req, res) => {
  try {
    const { worker_id, limit = 50 } = req.query;

    const filter = {};
    if (worker_id && worker_id !== 'all' && mongoose.Types.ObjectId.isValid(worker_id)) {
      filter.worker_id = new mongoose.Types.ObjectId(worker_id);
    }

    const settlements = await Settlement.find(filter)
      .sort({ created_at: -1 })
      .limit(parseInt(limit, 10) || 50);

    res.json({ settlements });
  } catch (err) {
    console.error('Erreur history settlements :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération de l’historique des règlements' });
  }
});

// DELETE /api/settlements/:id
// Annuler un règlement en cas d'erreur de saisie (réouvre les jours et restaure le solde)
router.delete('/:id', async (req, res) => {
  try {
    const settlementId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(settlementId)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: 'Règlement introuvable' });
    }

    // 1. Remettre les logs en non-réglés
    await ActivityLog.updateMany(
      { settlement_id: settlement._id },
      { $set: { settled: false, settlement_id: null } }
    );

    // 2. Réintégrer le montant dans le solde de l'ouvrier
    const worker = await User.findById(settlement.worker_id);
    if (worker) {
      worker.balance = parseFloat(((worker.balance || 0) + settlement.amount).toFixed(3));
      await worker.save();
    }

    // 3. Supprimer le settlement
    await Settlement.findByIdAndDelete(settlementId);

    // 4. Log
    await ActivityLog.create({
      action_type: 'worker_settlement',
      user_id: req.user._id,
      user_name: req.user.name,
      user_role: req.user.role,
      quantity_changed: 0,
      previous_stock: 0,
      new_stock: 0,
      unit_price: 0,
      total_price: -settlement.amount,
      notes: `Annulation du règlement #${settlement._id.toString().slice(-6)} de ${settlement.worker_name} (${settlement.amount.toFixed(3)} DT)`,
      undone: 0,
    });

    res.json({
      success: true,
      message: `Règlement annulé avec succès. ${settlement.amount.toFixed(3)} DT réintégrés au solde de ${settlement.worker_name}`,
    });
  } catch (err) {
    console.error('Erreur annulation settlement :', err);
    res.status(500).json({ message: 'Erreur lors de l’annulation du règlement' });
  }
});

export default router;
