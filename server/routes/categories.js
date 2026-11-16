import express from 'express';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Pattern from '../models/Pattern.js';
import ActivityLog from '../models/ActivityLog.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export function createCategoriesRouter(io) {
  const router = express.Router();

  // GET /api/categories - Récupérer toutes les catégories avec le nombre de patrons associés
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const categories = await Category.find().sort({ name: 1 });

      // Compter les patrons pour chaque catégorie
      const patternCounts = await Pattern.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);

      const countMap = {};
      patternCounts.forEach((item) => {
        if (item._id) {
          countMap[item._id] = item.count;
        }
      });

      const result = categories.map((cat) => ({
        id: cat._id.toString(),
        _id: cat._id,
        name: cat.name,
        patternCount: countMap[cat.name] || 0,
        created_at: cat.created_at,
      }));

      res.json({ categories: result });
    } catch (err) {
      console.error('Erreur récupération catégories :', err);
      res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
    }
  });

  // POST /api/categories - Admin : Ajouter une nouvelle catégorie
  router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Le nom de la catégorie est obligatoire' });
      }

      const trimmedName = name.trim();

      // Vérifier si la catégorie existe déjà (insensible à la casse)
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      });

      if (existing) {
        return res.status(400).json({ message: `La catégorie "${existing.name}" existe déjà` });
      }

      const created = await Category.create({ name: trimmedName });

      // Log d'activité
      const log = await ActivityLog.create({
        action_type: 'pattern_create',
        user_id: req.user._id,
        user_name: req.user.name,
        user_role: req.user.role,
        pattern_name: trimmedName,
        notes: `Création d'une nouvelle catégorie : "${trimmedName}"`,
        undone: 0,
      });

      if (io) {
        io.emit('categories_updated', { action: 'create', category: created });
        io.emit('activity_logged', { log });
      }

      res.status(201).json({
        success: true,
        category: {
          id: created._id.toString(),
          _id: created._id,
          name: created.name,
          patternCount: 0,
          created_at: created.created_at,
        },
        message: `Catégorie "${trimmedName}" ajoutée avec succès`,
      });
    } catch (err) {
      console.error('Erreur création catégorie :', err);
      res.status(500).json({ message: 'Erreur lors de la création de la catégorie' });
    }
  });

  // DELETE /api/categories/:id - Admin : Supprimer une catégorie (avec réassignation automatique si des patrons existent)
  router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { reassignTo } = req.query;

      let category = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        category = await Category.findById(id);
      }
      if (!category) {
        category = await Category.findOne({ name: id });
      }

      if (!category) {
        return res.status(404).json({ message: 'Catégorie introuvable' });
      }

      const categoryName = category.name;
      const patternCount = await Pattern.countDocuments({ category: categoryName });
      const targetCategory = (reassignTo && typeof reassignTo === 'string' && reassignTo.trim()) ? reassignTo.trim() : 'Autre';

      // Si des patrons utilisaient cette catégorie, les réassigner vers la catégorie cible
      if (patternCount > 0) {
        // S'assurer que la catégorie cible existe
        await Category.findOneAndUpdate(
          { name: targetCategory },
          { name: targetCategory },
          { upsert: true }
        );

        // Déplacer les patrons
        await Pattern.updateMany(
          { category: categoryName },
          { $set: { category: targetCategory } }
        );
      }

      await Category.findByIdAndDelete(category._id);

      // Log d'activité
      const logNote = patternCount > 0
        ? `Suppression de la catégorie "${categoryName}" (${patternCount} patron(s) réassigné(s) à "${targetCategory}")`
        : `Suppression de la catégorie "${categoryName}"`;

      const log = await ActivityLog.create({
        action_type: 'pattern_delete',
        user_id: req.user._id,
        user_name: req.user.name,
        user_role: req.user.role,
        pattern_name: categoryName,
        notes: logNote,
        undone: 0,
      });

      if (io) {
        io.emit('categories_updated', { action: 'delete', categoryName, reassignTo: targetCategory });
        if (patternCount > 0) {
          io.emit('patterns_refresh', { reason: 'category_deleted_reassigned' });
        }
        io.emit('activity_logged', { log });
      }

      res.json({
        success: true,
        message: patternCount > 0
          ? `Catégorie "${categoryName}" supprimée. ${patternCount} patron(s) déplacé(s) vers "${targetCategory}".`
          : `Catégorie "${categoryName}" supprimée avec succès`,
        reassignedCount: patternCount,
        reassignedTo: targetCategory,
      });
    } catch (err) {
      console.error('Erreur suppression catégorie :', err);
      res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie' });
    }
  });

  return router;
}
export default createCategoriesRouter;

