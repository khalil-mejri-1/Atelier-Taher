import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

import mongoose from 'mongoose';
import Pattern from '../models/Pattern.js';
import ActivityLog from '../models/ActivityLog.js';
import { connectDB } from '../db.js';

async function resetAllStockToZero() {
  try {
    await connectDB();

    const totalPatterns = await Pattern.countDocuments();
    const stockAgg = await Pattern.aggregate([
      { $group: { _id: null, total: { $sum: '$current_stock' } } },
    ]);
    const previousStockTotal = stockAgg.length > 0 ? stockAgg[0].total : 0;

    console.log(`\n========================================`);
    console.log(`📦 Nombre total de patrons trouvés : ${totalPatterns}`);
    console.log(`📊 Stock total avant réinitialisation : ${previousStockTotal} pièces`);
    console.log(`========================================\n`);

    // Mise à jour de tous les patrons : current_stock = 0
    const updateResult = await Pattern.updateMany({}, { $set: { current_stock: 0 } });

    console.log(`✅ ${updateResult.modifiedCount} patron(s) mis à jour avec stock = 0 pcs.`);

    // Enregistrement dans le journal d'activité
    try {
      await ActivityLog.create({
        action_type: 'stock_bulk_adjust',
        user_name: 'Admin',
        user_role: 'admin',
        quantity_changed: -previousStockTotal,
        previous_stock: previousStockTotal,
        new_stock: 0,
        notes: `Réinitialisation complète du stock à 0 pour tous les produits (${totalPatterns} modèles)`,
        undone: 0,
      });
      console.log(`📝 Opération enregistrée dans le journal d'activité.`);
    } catch (logErr) {
      console.warn(`⚠️ Log audit warning:`, logErr.message);
    }

    // Vérification finale
    const verifyAgg = await Pattern.aggregate([
      { $group: { _id: null, total: { $sum: '$current_stock' } } },
    ]);
    const finalStockTotal = verifyAgg.length > 0 ? verifyAgg[0].total : 0;

    console.log(`\n🎉 Vérification finale :`);
    console.log(`📦 Stock total actuel en base : ${finalStockTotal} pièces`);
    console.log(`========================================\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de la réinitialisation du stock :', err);
    process.exit(1);
  }
}

resetAllStockToZero();
