import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';
import { connectDB } from '../db.js';

const router = express.Router();

// Fallback demo accounts if database is temporarily unavailable
const FALLBACK_USERS = [
  {
    _id: '660000000000000000000001',
    username: 'admin',
    name: "Taher Mansouri (Propriétaire de l'atelier)",
    role: 'admin',
    roleLabel: "Propriétaire de l'atelier (Admin)",
    password: 'admin123',
    pin: '1111',
    status: 'active',
  },
  {
    _id: '660000000000000000000002',
    username: 'worker',
    name: 'Ahmed Ben Salem (Opérateur machine)',
    role: 'worker',
    roleLabel: 'Opérateur machine (Production)',
    password: 'worker123',
    pin: '2222',
    status: 'active',
  },
  {
    _id: '660000000000000000000003',
    username: 'samir',
    name: 'Samir Jaziri (Opérateur de coupe)',
    role: 'worker',
    roleLabel: 'Opérateur de coupe (Production)',
    password: 'samir123',
    pin: '3333',
    status: 'active',
  },
];

// Login route (supports username + password or PIN)
router.post('/login', async (req, res) => {
  try {
    const { username, password, pin } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Veuillez saisir votre identifiant' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Ensure database connection is active or try to connect
    if (mongoose.connection.readyState !== 1) {
      try {
        await connectDB();
      } catch (e) {
        console.warn('⚠️ Tentative de reconnexion DB lors de la connexion :', e.message);
      }
    }

    let user = null;
    let isDbUser = false;

    // Try finding user in MongoDB if ready
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ username: cleanUsername }).maxTimeMS(4000);
        if (user) {
          isDbUser = true;
        }
      } catch (dbErr) {
        console.warn('⚠️ Avertissement requête User.findOne :', dbErr.message);
      }
    }

    // Fallback to builtin system users if DB unavailable or user not yet in DB
    if (!user) {
      const fallback = FALLBACK_USERS.find((u) => u.username === cleanUsername);
      if (fallback) {
        user = fallback;
      }
    }

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
      if (isDbUser && typeof user.comparePassword === 'function') {
        isValid = user.comparePassword(password);
      } else {
        isValid = user.password === password;
      }
    }

    if (!isValid) {
      return res.status(401).json({ message: 'Identifiants de connexion invalides' });
    }

    const userId = user._id ? user._id.toString() : user.id;

    const token = jwt.sign(
      { id: userId, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: userId,
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
    // If not connected yet, try connecting quickly
    if (mongoose.connection.readyState !== 1) {
      await connectDB().catch(() => {});
    }

    let demoAccounts = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const users = await User.find({ status: 'active' })
          .sort({ role: 1, _id: 1 })
          .maxTimeMS(3000);

        if (users && users.length > 0) {
          demoAccounts = users.map((u) => ({
            username: u.username,
            name: u.name,
            role: u.role,
            roleLabel: u.role === 'admin' ? "Propriétaire de l'atelier (Admin)" : "Opérateur machine (Production)",
            password: u.role === 'admin' ? 'admin123' : u.username === 'worker' ? 'worker123' : 'samir123',
            pin: u.pin,
          }));
        }
      } catch (err) {
        console.warn('⚠️ Impossible de charger les utilisateurs de la base, utilisation des comptes de secours :', err.message);
      }
    }

    // If database had no users or failed to respond in time, use fallback accounts
    if (demoAccounts.length === 0) {
      demoAccounts = FALLBACK_USERS.map((u) => ({
        username: u.username,
        name: u.name,
        role: u.role,
        roleLabel: u.roleLabel,
        password: u.password,
        pin: u.pin,
      }));
    }

    return res.json({ demoAccounts });
  } catch (err) {
    console.error('Erreur lors du chargement des comptes démo :', err);
    // Graceful fallback: return fallback accounts with 200 OK so UI never breaks
    return res.json({
      demoAccounts: FALLBACK_USERS.map((u) => ({
        username: u.username,
        name: u.name,
        role: u.role,
        roleLabel: u.roleLabel,
        password: u.password,
        pin: u.pin,
      })),
    });
  }
});

export default router;
