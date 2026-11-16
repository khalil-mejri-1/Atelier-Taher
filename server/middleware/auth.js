import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'atelier_taher_super_secret_patron_key_2026';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Veuillez vous connecter d’abord (Jeton manquant)' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur introuvable' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Ce compte a été suspendu par l’administration' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Session expirée ou jeton invalide' });
  }
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Accès refusé : privilèges insuffisants (Réservé à l’administrateur)' 
      });
    }
    next();
  };
}
