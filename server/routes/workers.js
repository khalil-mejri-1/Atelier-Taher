import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent le rôle Administrateur
router.use(authenticateToken, requireRole(['admin']));

// GET /api/workers - Liste des comptes opérateurs
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ role: 1, _id: -1 });

    const workers = await Promise.all(
      users.map(async (u) => {
        const totalOps = await ActivityLog.countDocuments({
          user_id: u._id,
          action_type: { $in: ['production_increment', 'production_custom'] },
          undone: 0,
        });

        const obj = u.toObject();
        obj.total_operations = totalOps;
        return obj;
      })
    );

    res.json({ workers });
  } catch (err) {
    console.error('Erreur récupération opérateurs :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des opérateurs' });
  }
});

// POST /api/workers - Créer un compte opérateur
router.post('/', async (req, res) => {
  try {
    const { name, username, password, pin, role = 'worker', status = 'active' } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ message: 'Le nom, l’identifiant et le mot de passe sont obligatoires' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({ message: 'Cet identifiant est déjà utilisé' });
    }

    const cleanPin = pin ? pin.trim() : '1234';

    const created = await User.create({
      username: cleanUsername,
      password: password.trim(),
      name: name.trim(),
      role: role === 'admin' ? 'admin' : 'worker',
      pin: cleanPin,
      status: status === 'suspended' ? 'suspended' : 'active',
    });

    await ActivityLog.create({
      action_type: 'user_create',
      user_id: req.user._id,
      user_name: req.user.name,
      user_role: req.user.role,
      quantity_changed: 0,
      previous_stock: 0,
      new_stock: 0,
      notes: `Création du compte opérateur (${created.name} - @${created.username})`,
      undone: 0,
    });

    const userObj = created.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      message: 'Compte opérateur créé avec succès',
      worker: userObj,
    });
  } catch (err) {
    console.error('Erreur création opérateur :', err);
    res.status(500).json({ message: 'Erreur lors de la création du compte opérateur' });
  }
});

// PUT /api/workers/:id - Mettre à jour un compte opérateur
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const worker = await User.findById(id);

    if (!worker) {
      return res.status(404).json({ message: 'Compte opérateur introuvable' });
    }

    if (worker.username === 'admin' && req.body.status === 'suspended') {
      return res.status(400).json({ message: 'Impossible de suspendre le compte de l’administrateur principal' });
    }

    const { name, password, pin, status, role } = req.body;

    if (password && password.trim()) {
      worker.password = password.trim();
    }

    if (name) worker.name = name.trim();
    if (pin) worker.pin = pin.trim();
    if (status) worker.status = status;
    if (role && (role === 'admin' || role === 'worker')) worker.role = role;

    await worker.save();

    await ActivityLog.create({
      action_type: 'user_status',
      user_id: req.user._id,
      user_name: req.user.name,
      user_role: req.user.role,
      quantity_changed: 0,
      previous_stock: 0,
      new_stock: 0,
      notes: `Mise à jour du compte (${worker.name}) - Statut : ${worker.status === 'active' ? 'Actif' : 'Suspendu'}`,
      undone: 0,
    });

    const userObj = worker.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: 'Compte opérateur mis à jour avec succès',
      worker: userObj,
    });
  } catch (err) {
    console.error('Erreur modification opérateur :', err);
    res.status(500).json({ message: 'Erreur lors de la modification du compte' });
  }
});

// DELETE /api/workers/:id - Supprimer un compte
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const worker = await User.findById(id);

    if (!worker) {
      return res.status(404).json({ message: 'Compte opérateur introuvable' });
    }

    if (worker.username === 'admin') {
      return res.status(400).json({ message: 'Impossible de supprimer le compte administrateur principal' });
    }

    if (worker._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte actuel' });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Compte (${worker.name}) supprimé définitivement`,
    });
  } catch (err) {
    console.error('Erreur suppression opérateur :', err);
    res.status(500).json({ message: 'Erreur lors de la suppression du compte' });
  }
});

export default router;
