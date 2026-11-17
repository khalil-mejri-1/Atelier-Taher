import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import mongoose from 'mongoose';
import User from './models/User.js';
import Pattern from './models/Pattern.js';
import ActivityLog from './models/ActivityLog.js';
import Category from './models/Category.js';

let isConnected = false;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/atelier_taher';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      family: 4,
    });
    console.log(`🍃 Connecté à MongoDB avec succès`);
    if (!isConnected) {
      isConnected = true;
      seedData().catch((err) => console.warn('Erreur seedData en arrière-plan :', err.message));
    }
  } catch (error) {
    console.error('⚠️ Avertissement : Échec de connexion à MongoDB :', error.message || error);
    // Ne jamais arrêter le serveur (process.exit) pour que le port 5000 reste actif
  }
}

async function seedData() {
  try {
    // 1. Ensure root master Administrator exists
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      console.log('🌱 Création du compte Administrateur principal (admin / admin123)...');
      await User.create({
        username: 'admin',
        password: 'admin123',
        name: "Taher Mansouri (Propriétaire de l'atelier)",
        role: 'admin',
        pin: '1111',
        status: 'active',
        balance: 0,
      });
      console.log('✅ Compte Administrateur principal initialisé avec succès');
    }

    // 2. Default garment categories (if none exist)
    const defaultCategories = [
      'Chemises',
      'Pantalons',
      'Robes',
      'Abayas & Djellabas',
      'Vestes & Manteaux',
      'Enfants',
      'Sportswear',
    ];
    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      console.log('🌱 Initialisation des catégories par défaut...');
      for (const catName of defaultCategories) {
        await Category.findOneAndUpdate({ name: catName }, { name: catName }, { upsert: true });
      }
    }
  } catch (err) {
    console.error('Erreur dans seedData :', err);
  }
}

export default mongoose;
