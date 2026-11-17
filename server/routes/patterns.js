import express from 'express';
import mongoose from 'mongoose';
import Pattern from '../models/Pattern.js';
import Category from '../models/Category.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export function createPatternsRouter(io) {
  const router = express.Router();

  // Maintien pour compatibilité : pas d'émission socket dans l'environnement Vercel Serverless
  async function emitGlobalUpdates() {}

  // GET /api/patterns : liste des patrons avec filtres
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const { search, category, low_stock } = req.query;

      const filter = {};

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [
          { sku: regex },
          { name_fr: regex },
          { name_ar: regex },
          { notes: regex },
        ];
      }

      if (category && category !== 'Tous' && category !== 'all' && category !== 'الكل') {
        filter.category = category;
      }

      if (low_stock === 'true' || low_stock === '1') {
        filter.$expr = { $lte: ['$current_stock', '$low_stock_threshold'] };
      }

      const patterns = await Pattern.find(filter).sort({
        current_stock: 1,
        _id: -1,
      });

      res.json({ patterns });
    } catch (err) {
      console.error('Erreur récupération patrons :', err);
      res.status(500).json({ message: 'Erreur lors de la récupération des patrons' });
    }
  });

  // GET /api/patterns/categories
  router.get('/categories', authenticateToken, async (req, res) => {
    try {
      const dbCategories = await Category.find().sort({ name: 1 });
      let names = dbCategories.map((c) => c.name);
      if (names.length === 0) {
        names = await Pattern.distinct('category');
      }
      res.json({ categories: names.sort() });
    } catch (err) {
      res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
    }
  });

  // GET /api/patterns/:id
  router.get('/:id', authenticateToken, async (req, res) => {
    try {
      const pattern = await Pattern.findById(req.params.id);
      if (!pattern) {
        return res.status(404).json({ message: 'Patron introuvable' });
      }
      res.json({ pattern });
    } catch (err) {
      res.status(500).json({ message: 'Erreur lors de la récupération du patron' });
    }
  });

  // POST /api/patterns/produce - Opérateur / Admin : incrément de production (+1 ou +personnalisé)
  router.post('/produce', authenticateToken, async (req, res) => {
    try {
      const { pattern_id, quantity = 1, notes = '' } = req.body;
      const qty = parseInt(quantity, 10);

      if (!pattern_id || isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: 'Veuillez indiquer une quantité valide (supérieure à 0)' });
      }

      const pattern = await Pattern.findById(pattern_id);
      if (!pattern) {
        return res.status(404).json({ message: 'Patron introuvable' });
      }

      const prevStock = pattern.current_stock;
      const newStock = prevStock + qty;

      pattern.current_stock = newStock;
      await pattern.save();

      const unitPrice = typeof pattern.price === 'number' ? pattern.price : 0;
      const totalPrice = qty * unitPrice;

      // Créditer le solde de l'ouvrier si utilisateur valide
      let updatedBalance = 0;
      if (req.user && req.user._id && totalPrice > 0) {
        const updatedUser = await User.findByIdAndUpdate(
          req.user._id,
          { $inc: { balance: totalPrice } },
          { new: true }
        );
        if (updatedUser) updatedBalance = updatedUser.balance;
      }

      const actionType = qty === 1 ? 'production_increment' : 'production_custom';
      const logNote = notes.trim()
        ? notes.trim()
        : qty === 1
        ? `Production immédiate +1 (${unitPrice.toFixed(3)} DT)`
        : `Production d'un lot +${qty} (${totalPrice.toFixed(3)} DT)`;

      const log = await ActivityLog.create({
        action_type: actionType,
        user_id: req.user._id,
        user_name: req.user.name,
        user_role: req.user.role,
        pattern_id: pattern._id,
        pattern_name: pattern.name_fr || pattern.name_ar,
        pattern_sku: pattern.sku,
        quantity_changed: qty,
        previous_stock: prevStock,
        new_stock: newStock,
        unit_price: unitPrice,
        total_price: totalPrice,
        notes: logNote,
        undone: 0,
      });

      emitGlobalUpdates({
        type: 'production',
        pattern,
        quantity: qty,
        user: req.user.name,
        logId: log._id.toString(),
        totalPrice,
      });

      if (io) {
        io.emit('activity_logged', { log });
        io.emit('worker_production_recorded', {
          workerId: req.user._id,
          workerName: req.user.name,
          quantity: qty,
          earned: totalPrice,
          balance: updatedBalance,
        });
      }

      res.json({
        success: true,
        message: `Production de +${qty} enregistrée (+${totalPrice.toFixed(3)} DT)`,
        pattern,
        logId: log._id.toString(),
        earned: totalPrice,
        unitPrice,
      });
    } catch (err) {
      console.error('Erreur lors de la production :', err);
      res.status(500).json({ message: 'Échec de l’enregistrement de la production' });
    }
  });

  // GET /api/patterns/my-progress - Progression de l'ouvrier sur les patrons multi-parties
  router.get('/my-progress', authenticateToken, async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('in_progress_patterns');
      res.json({ progress: user?.in_progress_patterns || [] });
    } catch (err) {
      console.error('Erreur my-progress :', err);
      res.status(500).json({ message: 'Erreur lors de la récupération de la progression' });
    }
  });

  // POST /api/patterns/produce-part - Enregistrement d'une partie d'un patron multi-parties
  router.post('/produce-part', authenticateToken, async (req, res) => {
    try {
      const { pattern_id, part_id, complete_all = false, notes = '' } = req.body;

      if (!pattern_id) {
        return res.status(400).json({ message: 'Identifiant du patron requis' });
      }

      const pattern = await Pattern.findById(pattern_id);
      if (!pattern) {
        return res.status(404).json({ message: 'Patron introuvable' });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur introuvable' });
      }

      if (!user.in_progress_patterns) {
        user.in_progress_patterns = [];
      }

      const patternParts = Array.isArray(pattern.parts) && pattern.parts.length > 0
        ? pattern.parts
        : [{ id: 'part_1', name: 'Patron complet', name_ar: 'الباترون كاملاً' }];

      const totalPartsCount = patternParts.length;

      // Index de progression existant pour cet ouvrier et ce patron
      let progressIndex = user.in_progress_patterns.findIndex(
        (p) => p.pattern_id && p.pattern_id.toString() === pattern._id.toString()
      );

      let currentPrinted = [];
      if (progressIndex >= 0) {
        currentPrinted = Array.from(user.in_progress_patterns[progressIndex].printed_parts || []);
      }

      let isCompleted = false;

      if (complete_all) {
        currentPrinted = patternParts.map((p) => p.id);
        isCompleted = true;
      } else if (part_id) {
        if (!currentPrinted.includes(part_id)) {
          currentPrinted.push(part_id);
        }
        if (currentPrinted.length >= totalPartsCount) {
          isCompleted = true;
        }
      } else {
        return res.status(400).json({ message: 'Veuillez spécifier la partie imprimée' });
      }

      const unitPrice = typeof pattern.price === 'number' ? pattern.price : 0;
      let logId = null;

      if (isCompleted) {
        // Le patron est complet (toutes les parties ont été imprimées) !
        if (progressIndex >= 0) {
          user.in_progress_patterns.splice(progressIndex, 1);
        }

        const prevStock = pattern.current_stock;
        pattern.current_stock = prevStock + 1;
        await pattern.save();

        if (unitPrice > 0) {
          user.balance = (user.balance || 0) + unitPrice;
        }
        await user.save();

        const partLabels = patternParts.map((p) => p.name || p.name_ar).join(' + ');
        const logNote = notes.trim()
          ? notes.trim()
          : `Production complète (+1) - ${totalPartsCount} parties validées (${partLabels}) [${unitPrice.toFixed(3)} DT]`;

        const log = await ActivityLog.create({
          action_type: 'production_increment',
          user_id: user._id,
          user_name: user.name,
          user_role: user.role,
          pattern_id: pattern._id,
          pattern_name: pattern.name_fr || pattern.name_ar,
          pattern_sku: pattern.sku,
          quantity_changed: 1,
          previous_stock: prevStock,
          new_stock: pattern.current_stock,
          unit_price: unitPrice,
          total_price: unitPrice,
          notes: logNote,
          undone: 0,
        });
        logId = log._id.toString();

        emitGlobalUpdates({
          type: 'production',
          pattern,
          quantity: 1,
          user: user.name,
          logId,
          totalPrice: unitPrice,
        });

        if (io) {
          io.emit('activity_logged', { log });
          io.emit('worker_production_recorded', {
            workerId: user._id,
            workerName: user.name,
            quantity: 1,
            earned: unitPrice,
            balance: user.balance,
          });
        }

        return res.json({
          success: true,
          completed: true,
          message: `Félicitations ! Les ${totalPartsCount} parties sont imprimées : +1 patron validé (+${unitPrice.toFixed(3)} DT)`,
          pattern,
          current_stock: pattern.current_stock,
          earned: unitPrice,
          balance: user.balance,
          logId,
        });
      } else {
        // Enregistrement d'une partie intermédiaire (en attente des autres parties)
        if (progressIndex >= 0) {
          user.in_progress_patterns[progressIndex].printed_parts = currentPrinted;
          user.in_progress_patterns[progressIndex].updated_at = new Date();
        } else {
          user.in_progress_patterns.push({
            pattern_id: pattern._id,
            printed_parts: currentPrinted,
            updated_at: new Date(),
          });
        }
        await user.save();

        const completedCount = currentPrinted.length;
        const targetPart = patternParts.find((p) => p.id === part_id);
        const partLabel = targetPart ? (targetPart.name || targetPart.name_ar) : `Partie ${completedCount}`;

        return res.json({
          success: true,
          completed: false,
          message: `Partie "${partLabel}" enregistrée (${completedCount}/${totalPartsCount}). Imprimez la partie suivante pour valider le patron.`,
          pattern,
          printed_parts: currentPrinted,
          total_parts: totalPartsCount,
        });
      }
    } catch (err) {
      console.error('Erreur produce-part :', err);
      res.status(500).json({ message: 'Erreur lors de l’enregistrement de la partie du patron' });
    }
  });

  // POST /api/patterns/undo-produce - Toast d'annulation de sécurité (Undo 6s)
  router.post('/undo-produce', authenticateToken, async (req, res) => {
    try {
      const { logId } = req.body;

      if (!logId) {
        return res.status(400).json({ message: 'Identifiant de l’opération manquant' });
      }

      const log = await ActivityLog.findById(logId);
      if (!log) {
        return res.status(404).json({ message: 'Opération introuvable' });
      }

      if (log.undone === 1) {
        return res.status(400).json({ message: 'Cette opération a déjà été annulée' });
      }

      if (log.action_type !== 'production_increment' && log.action_type !== 'production_custom') {
        return res.status(400).json({ message: 'Seules les opérations de production peuvent être annulées' });
      }

      // Seul l'administrateur ou l'ouvrier propriétaire de l'opération peut l'annuler
      if (req.user.role !== 'admin' && log.user_id && log.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Vous ne pouvez annuler que vos propres enregistrements' });
      }

      const pattern = await Pattern.findById(log.pattern_id);
      if (!pattern) {
        return res.status(404).json({ message: 'Le patron associé n’existe plus' });
      }

      const rollbackQty = log.quantity_changed;
      const prevStock = pattern.current_stock;
      const newStock = Math.max(0, prevStock - rollbackQty);

      pattern.current_stock = newStock;
      await pattern.save();

      log.undone = 1;
      await log.save();

      // Déduire le montant annulé du solde de l'ouvrier si applicable
      const rollbackAmount = log.total_price || (rollbackQty * (pattern.price || 0));
      if (log.user_id && rollbackAmount > 0) {
        await User.findByIdAndUpdate(log.user_id, {
          $inc: { balance: -rollbackAmount },
        });
      }

      const undoLog = await ActivityLog.create({
        action_type: 'production_undo',
        user_id: req.user._id,
        user_name: req.user.name,
        user_role: req.user.role,
        pattern_id: pattern._id,
        pattern_name: pattern.name_fr || pattern.name_ar,
        pattern_sku: pattern.sku,
        quantity_changed: -rollbackQty,
        previous_stock: prevStock,
        new_stock: newStock,
        unit_price: log.unit_price || pattern.price || 0,
        total_price: -rollbackAmount,
        notes: `Annulation de la production précédente (-${rollbackQty})`,
        undone: 0,
      });

      emitGlobalUpdates({
        type: 'undo',
        pattern,
        quantity: -rollbackQty,
        user: req.user.name,
        logId: undoLog._id.toString(),
      });

      if (io) {
        io.emit('activity_logged', { log: undoLog });
      }

      res.json({
        success: true,
        message: `Production de (${rollbackQty}) pièce(s) annulée avec succès`,
        pattern,
      });
    } catch (err) {
      console.error('Erreur lors de l’annulation :', err);
      res.status(500).json({ message: 'Échec de l’annulation de l’opération' });
    }
  });

  // POST /api/patterns/deduct-order - Admin : Déduire une commande client du stock
  router.post('/deduct-order', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const { pattern_id, quantity = 1, client_name = '', notes = '' } = req.body;
      const qty = parseInt(quantity, 10);

      if (!pattern_id || isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: 'Veuillez saisir une quantité valide à déduire (supérieure à 0)' });
      }

      const pattern = await Pattern.findById(pattern_id);
      if (!pattern) {
        return res.status(404).json({ message: 'Patron introuvable' });
      }

      if (pattern.current_stock < qty) {
        return res.status(400).json({
          message: `Le stock disponible (${pattern.current_stock}) est insuffisant pour déduire (${qty}) pièce(s)`,
        });
      }

      const prevStock = pattern.current_stock;
      const newStock = prevStock - qty;

      pattern.current_stock = newStock;
      await pattern.save();

      const orderNote = client_name.trim()
        ? `Déduction commande pour : ${client_name.trim()}${notes ? ' - ' + notes.trim() : ''}`
        : notes.trim()
        ? `Déduction commande : ${notes.trim()}`
        : `Déduction de commande expédiée (${qty} pièces)`;

      const log = await ActivityLog.create({
        action_type: 'order_deduct',
        user_id: req.user._id,
        user_name: req.user.name,
        user_role: req.user.role,
        pattern_id: pattern._id,
        pattern_name: pattern.name_fr || pattern.name_ar,
        pattern_sku: pattern.sku,
        quantity_changed: -qty,
        previous_stock: prevStock,
        new_stock: newStock,
        notes: orderNote,
        undone: 0,
      });

      emitGlobalUpdates({
        type: 'deduction',
        pattern,
        quantity: -qty,
        user: req.user.name,
        logId: log._id.toString(),
      });

      if (io) {
        io.emit('activity_logged', { log });
      }

      res.json({
        success: true,
        message: `${qty} pièce(s) déduite(s) du stock avec succès`,
        pattern,
        log,
      });
    } catch (err) {
      console.error('Erreur lors de la déduction de commande :', err);
      res.status(500).json({ message: 'Erreur lors de la déduction de la commande' });
    }
  });

  // POST /api/patterns - Admin : Créer un nouveau patron
  router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const {
        sku,
        name_fr,
        name_ar = '',
        category,
        current_stock = 0,
        low_stock_threshold = 10,
        size_range = 'S - XXL',
        material_type = 'Carton Kraft 350g',
        price = 0,
        notes = '',
        image_url = '',
        has_parts = false,
        parts = [],
      } = req.body;

      if ((!name_fr && !name_ar) || !category) {
        return res.status(400).json({ message: 'Le nom du patron et la catégorie sont obligatoires' });
      }

      // Traiter et nettoyer les sous-parties du patron
      let cleanedParts = [];
      if (Array.isArray(parts)) {
        cleanedParts = parts
          .filter((p) => p && (p.name?.trim() || p.name_ar?.trim()))
          .map((p, idx) => ({
            id: p.id || `part_${idx + 1}_${Math.random().toString(36).substring(2, 7)}`,
            name: (p.name || `Partie ${idx + 1}`).trim(),
            name_ar: (p.name_ar || `القسم ${idx + 1}`).trim(),
          }));
      }
      const hasPartsBool = Boolean(has_parts && cleanedParts.length > 0);

      // Générer automatiquement un SKU unique si non fourni
      let upperSku = (sku && typeof sku === 'string' && sku.trim()) ? sku.trim().toUpperCase() : '';
      if (!upperSku) {
        let uniqueFound = false;
        let attempts = 0;
        while (!uniqueFound && attempts < 10) {
          attempts++;
          const candidate = `PAT-${Math.floor(100000 + Math.random() * 900000)}`;
          const exists = await Pattern.findOne({ sku: candidate });
          if (!exists) {
            upperSku = candidate;
            uniqueFound = true;
          }
        }
        if (!upperSku) {
          upperSku = `PAT-${Date.now().toString().slice(-7)}`;
        }
      } else {
        const existing = await Pattern.findOne({ sku: upperSku });
        if (existing) {
          return res.status(400).json({ message: `Le code de patron (${sku}) existe déjà. Veuillez en choisir un autre` });
        }
      }

      const initialStock = Math.max(0, parseInt(current_stock, 10) || 0);
      const threshold = Math.max(1, parseInt(low_stock_threshold, 10) || 10);

      const created = await Pattern.create({
        sku: upperSku,
        name_fr: (name_fr || name_ar).trim(),
        name_ar: (name_ar || name_fr).trim(),
        category: category.trim(),
        current_stock: initialStock,
        low_stock_threshold: threshold,
        size_range: size_range.trim(),
        material_type: material_type.trim(),
        price: Math.max(0, parseFloat(price) || 0),
        notes: notes.trim(),
        image_url: image_url ? image_url.trim() : '',
        has_parts: hasPartsBool,
        parts: cleanedParts,
      });

      const log = await ActivityLog.create({
        action_type: 'pattern_create',
        user_id: req.user._id,
        user_name: req.user.name,
        user_role: req.user.role,
        pattern_id: created._id,
        pattern_name: created.name_fr,
        pattern_sku: created.sku,
        quantity_changed: initialStock,
        previous_stock: 0,
        new_stock: initialStock,
        notes: `Nouveau patron ajouté avec un stock initial de ${initialStock}`,
        undone: 0,
      });

      emitGlobalUpdates();
      if (io) {
        io.emit('patterns_refresh', { reason: 'pattern_created' });
        io.emit('activity_logged', { log });
      }

      res.status(201).json({ success: true, pattern: created, message: 'Patron ajouté avec succès' });
    } catch (err) {
      console.error('Erreur création patron :', err);
      res.status(500).json({ message: 'Erreur lors de l’ajout du patron' });
    }
  });

  // PUT /api/patterns/:id - Admin : Mettre à jour un patron
  router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const id = req.params.id;
      const pattern = await Pattern.findById(id);
      if (!pattern) {
        return res.status(404).json({ message: 'Patron introuvable' });
      }

      const {
        sku = pattern.sku,
        name_fr = pattern.name_fr,
        name_ar = pattern.name_ar,
        category = pattern.category,
        current_stock = pattern.current_stock,
        low_stock_threshold = pattern.low_stock_threshold,
        size_range = pattern.size_range,
        material_type = pattern.material_type,
        price = pattern.price,
        notes = pattern.notes,
        image_url = pattern.image_url,
        has_parts,
        parts,
      } = req.body;

      const upperSku = sku.trim().toUpperCase();
      if (upperSku !== pattern.sku) {
        const skuCheck = await Pattern.findOne({ sku: upperSku, _id: { $ne: id } });
        if (skuCheck) {
          return res.status(400).json({ message: `Le code (${sku}) est déjà attribué à un autre patron` });
        }
      }

      const stockNum = Math.max(0, parseInt(current_stock, 10));
      const thresholdNum = Math.max(1, parseInt(low_stock_threshold, 10));

      const prevStock = pattern.current_stock;

      pattern.sku = upperSku;
      pattern.name_fr = (name_fr || pattern.name_fr).trim();
      pattern.name_ar = (name_ar || pattern.name_ar).trim();
      pattern.category = category.trim();
      pattern.current_stock = stockNum;
      pattern.low_stock_threshold = thresholdNum;
      pattern.size_range = size_range.trim();
      pattern.material_type = material_type.trim();
      if (price !== undefined) {
        pattern.price = Math.max(0, parseFloat(price) || 0);
      }
      pattern.notes = notes.trim();
      if (image_url !== undefined) {
        pattern.image_url = image_url ? image_url.trim() : '';
      }

      if (has_parts !== undefined || parts !== undefined) {
        let cleanedParts = [];
        if (Array.isArray(parts)) {
          cleanedParts = parts
            .filter((p) => p && (p.name?.trim() || p.name_ar?.trim()))
            .map((p, idx) => ({
              id: p.id || `part_${idx + 1}_${Math.random().toString(36).substring(2, 7)}`,
              name: (p.name || `Partie ${idx + 1}`).trim(),
              name_ar: (p.name_ar || `القسم ${idx + 1}`).trim(),
            }));
        }
        pattern.has_parts = Boolean((has_parts !== undefined ? has_parts : pattern.has_parts) && cleanedParts.length > 0);
        pattern.parts = cleanedParts;
      }

      await pattern.save();

      if (stockNum !== prevStock) {
        const diff = stockNum - prevStock;
        await ActivityLog.create({
          action_type: 'pattern_update',
          user_id: req.user._id,
          user_name: req.user.name,
          user_role: req.user.role,
          pattern_id: pattern._id,
          pattern_name: pattern.name_fr,
          pattern_sku: pattern.sku,
          quantity_changed: diff,
          previous_stock: prevStock,
          new_stock: stockNum,
          notes: `Ajustement manuel du stock de ${prevStock} à ${stockNum}`,
          undone: 0,
        });
      }

      emitGlobalUpdates();
      if (io) {
        io.emit('patterns_refresh', { reason: 'pattern_updated' });
      }

      res.json({ success: true, pattern, message: 'Patron mis à jour avec succès' });
    } catch (err) {
      console.error('Erreur mise à jour patron :', err);
      res.status(500).json({ message: 'Erreur lors de la modification du patron' });
    }
  });

  // DELETE /api/patterns/:id - Admin : Supprimer un patron
  router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const id = req.params.id;
      const pattern = await Pattern.findById(id);
      if (!pattern) {
        return res.status(404).json({ message: 'Patron introuvable' });
      }

      await ActivityLog.create({
        action_type: 'pattern_delete',
        user_id: req.user._id,
        user_name: req.user.name,
        user_role: req.user.role,
        pattern_id: pattern._id,
        pattern_name: pattern.name_fr || pattern.name_ar,
        pattern_sku: pattern.sku,
        quantity_changed: -pattern.current_stock,
        previous_stock: pattern.current_stock,
        new_stock: 0,
        notes: `Suppression définitive du patron du catalogue`,
        undone: 0,
      });

      await Pattern.findByIdAndDelete(id);

      emitGlobalUpdates();
      if (io) {
        io.emit('patterns_refresh', { reason: 'pattern_deleted' });
      }

      res.json({ success: true, message: `Patron (${pattern.name_fr || pattern.name_ar}) supprimé avec succès` });
    } catch (err) {
      console.error('Erreur suppression patron :', err);
      res.status(500).json({ message: 'Erreur lors de la suppression du patron' });
    }
  });

  // POST /api/patterns/bulk - Admin : Opérations groupées
  router.post('/bulk', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const { action, pattern_ids, value } = req.body;

      if (!Array.isArray(pattern_ids) || pattern_ids.length === 0) {
        return res.status(400).json({ message: 'Veuillez sélectionner au moins un patron' });
      }

      if (action === 'delete') {
        const patternsToDelete = await Pattern.find({ _id: { $in: pattern_ids } });

        for (const p of patternsToDelete) {
          await ActivityLog.create({
            action_type: 'pattern_delete',
            user_id: req.user._id,
            user_name: req.user.name,
            user_role: req.user.role,
            pattern_id: p._id,
            pattern_name: p.name_fr || p.name_ar,
            pattern_sku: p.sku,
            quantity_changed: -p.current_stock,
            previous_stock: p.current_stock,
            new_stock: 0,
            notes: `Suppression groupée de (${pattern_ids.length}) patrons`,
            undone: 0,
          });
        }

        await Pattern.deleteMany({ _id: { $in: pattern_ids } });

        emitGlobalUpdates();
        if (io) io.emit('patterns_refresh', { reason: 'bulk_delete' });

        return res.json({
          success: true,
          message: `${patternsToDelete.length} patron(s) supprimé(s) avec succès`,
        });
      }

      if (action === 'adjust_stock') {
        const adjustment = parseInt(value, 10);
        if (isNaN(adjustment)) {
          return res.status(400).json({ message: 'Valeur d’ajustement invalide' });
        }

        const patternsToAdjust = await Pattern.find({ _id: { $in: pattern_ids } });

        for (const p of patternsToAdjust) {
          const newStock = Math.max(0, p.current_stock + adjustment);
          const diff = newStock - p.current_stock;

          p.current_stock = newStock;
          await p.save();

          await ActivityLog.create({
            action_type: 'stock_bulk_adjust',
            user_id: req.user._id,
            user_name: req.user.name,
            user_role: req.user.role,
            pattern_id: p._id,
            pattern_name: p.name_fr || p.name_ar,
            pattern_sku: p.sku,
            quantity_changed: diff,
            previous_stock: p.current_stock - diff,
            new_stock: newStock,
            notes: `Ajustement groupé du stock (${adjustment > 0 ? '+' + adjustment : adjustment})`,
            undone: 0,
          });
        }

        emitGlobalUpdates();
        if (io) io.emit('patterns_refresh', { reason: 'bulk_stock_adjust' });

        return res.json({
          success: true,
          message: `Stock ajusté pour ${patternsToAdjust.length} patron(s) avec succès`,
        });
      }

      if (action === 'change_category') {
        if (!value || typeof value !== 'string') {
          return res.status(400).json({ message: 'Veuillez préciser la nouvelle catégorie' });
        }

        const newCategory = value.trim();
        await Pattern.updateMany(
          { _id: { $in: pattern_ids } },
          { $set: { category: newCategory } }
        );

        emitGlobalUpdates();
        if (io) io.emit('patterns_refresh', { reason: 'bulk_category_change' });

        return res.json({
          success: true,
          message: `${pattern_ids.length} patron(s) déplacé(s) vers la catégorie "${newCategory}"`,
        });
      }

      return res.status(400).json({ message: 'Action groupée non reconnue' });
    } catch (err) {
      console.error('Erreur opération groupée :', err);
      res.status(500).json({ message: 'Erreur lors de l’exécution de l’opération groupée' });
    }
  });

  return router;
}
