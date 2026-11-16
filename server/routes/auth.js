import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Login route (supports username + password or PIN)
router.post('/login', async (req, res) => {
  try {
    const { username, password, pin } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Veuillez saisir votre identifiant' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Ce compte est suspendu. Veuillez contacter la direction de l’atelier' });
    }

    let isValid = false;

    // Support quick PIN login if provided
    if (pin && user.pin && pin.trim() === user.pin) {
      isValid = true;
    } else if (password) {
      isValid = user.comparePassword(password);
    }

    if (!isValid) {
      return res.status(401).json({ message: 'Identifiants de connexion invalides' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('Erreur de connexion :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
});

// Profil actuel
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Comptes de démonstration pour bascule en 1 clic
router.get('/demo-accounts', async (req, res) => {
  try {
    const users = await User.find({ status: 'active' }).sort({ role: 1, _id: 1 });

    const demoAccounts = users.map((u) => ({
      username: u.username,
      name: u.name,
      role: u.role,
      roleLabel: u.role === 'admin' ? "Propriétaire de l'atelier (Admin)" : "Opérateur machine (Production)",
      password: u.role === 'admin' ? 'admin123' : u.username === 'worker' ? 'worker123' : 'samir123',
      pin: u.pin,
    }));

    res.json({ demoAccounts });
  } catch (err) {
    console.error('Erreur lors du chargement des comptes démo :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des comptes démo' });
  }
});

export default router;
