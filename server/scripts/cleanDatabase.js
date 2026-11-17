import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import User from '../models/User.js';
import Pattern from '../models/Pattern.js';
import ActivityLog from '../models/ActivityLog.js';

async function purgeDatabase() {
  const uris = [
    process.env.MONGODB_URI,
    'mongodb://127.0.0.1:27017/atelier_taher'
  ].filter(Boolean);

  for (const uri of uris) {
    try {
      console.log(`\n🔄 Connexion à MongoDB (${uri.includes('@') ? 'MongoDB Atlas' : 'Localhost'})...`);
      await mongoose.connect(uri, { 
        serverSelectionTimeoutMS: 8000,
        family: 4,
      });
      console.log('✅ Connecté à MongoDB');

      // 1. Delete all patterns
      const delPatterns = await Pattern.deleteMany({});
      console.log(`🗑️ Patrons supprimés : ${delPatterns.deletedCount}`);

      // 2. Delete all activity logs
      const delLogs = await ActivityLog.deleteMany({});
      console.log(`🗑️ Journaux d'activité supprimés : ${delLogs.deletedCount}`);

      // 3. Delete all users except master admin
      const delUsers = await User.deleteMany({ username: { $ne: 'admin' } });
      console.log(`🗑️ Comptes utilisateurs supprimés : ${delUsers.deletedCount}`);

      // 4. Reset or create the master admin user
      let admin = await User.findOne({ username: 'admin' });
      if (admin) {
        admin.name = "Taher Mansouri (Direction Atelier)";
        admin.password = 'admin123';
        admin.role = 'admin';
        admin.pin = '1111';
        admin.status = 'active';
        admin.balance = 0;
        admin.in_progress_patterns = [];
        await admin.save();
        console.log('👑 Compte Administrateur principal réinitialisé (admin / admin123 / PIN: 1111)');
      } else {
        admin = await User.create({
          username: 'admin',
          password: 'admin123',
          name: "Taher Mansouri (Direction Atelier)",
          role: 'admin',
          pin: '1111',
          status: 'active',
          balance: 0,
        });
        console.log('👑 Compte Administrateur principal créé (admin / admin123 / PIN: 1111)');
      }

      // 5. Verify remaining counts
      const countUsers = await User.countDocuments();
      const countPatterns = await Pattern.countDocuments();
      const countLogs = await ActivityLog.countDocuments();

      console.log('-------------------------------------------');
      console.log(`📊 État de la base après nettoyage :`);
      console.log(`- Utilisateurs restants : ${countUsers} (admin)`);
      console.log(`- Patrons restants : ${countPatterns}`);
      console.log(`- Logs d'activité restants : ${countLogs}`);
      console.log('-------------------------------------------');

      await mongoose.disconnect();
    } catch (err) {
      console.warn(`⚠️ Erreur de connexion ou nettoyage sur ${uri} :`, err.message);
    }
  }

  console.log('✅ Nettoyage terminé avec succès.');
  process.exit(0);
}

purgeDatabase().catch((err) => {
  console.error('❌ Erreur lors du nettoyage de la base :', err);
  process.exit(1);
});
