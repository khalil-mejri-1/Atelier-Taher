import mongoose from 'mongoose';
import User from './models/User.js';
import Pattern from './models/Pattern.js';
import ActivityLog from './models/ActivityLog.js';
import Category from './models/Category.js';

let isConnected = false;

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/atelier_taher';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`🍃 Connecté à MongoDB avec succès`);
    if (!isConnected) {
      await seedData();
      isConnected = true;
    }
  } catch (error) {
    console.error('⚠️ Avertissement : Échec de connexion à MongoDB :', error.message || error);
    // Ne jamais arrêter le serveur (process.exit) pour que le port 5000 reste actif
  }
}

async function seedData() {
  try {
    // 1. Seed or Update Users in French
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Initialisation des utilisateurs en français...');
      await User.create([
        {
          username: 'admin',
          password: 'admin123',
          name: "Taher Mansouri (Propriétaire de l'atelier)",
          role: 'admin',
          pin: '1111',
          status: 'active',
        },
        {
          username: 'worker',
          password: 'worker123',
          name: 'Ahmed Ben Salem (Opérateur machine)',
          role: 'worker',
          pin: '2222',
          status: 'active',
        },
        {
          username: 'samir',
          password: 'samir123',
          name: 'Samir Jaziri (Opérateur de coupe)',
          role: 'worker',
          pin: '3333',
          status: 'active',
        },
      ]);
    } else {
      // Update display names to French if previously Arabic
      await User.updateOne(
        { username: 'admin' },
        { $set: { name: "Taher Mansouri (Propriétaire de l'atelier)" } }
      );
      await User.updateOne(
        { username: 'worker' },
        { $set: { name: 'Ahmed Ben Salem (Opérateur machine)' } }
      );
      await User.updateOne(
        { username: 'samir' },
        { $set: { name: 'Samir Jaziri (Opérateur de coupe)' } }
      );
    }

    // 2. Sample Garment Patterns in French with Piece-Rate Prices (TND)
    const samplePatterns = [
      {
        sku: 'PAT-SHR-01',
        name_fr: 'Chemise Classique Homme (Coupe Droite)',
        name_ar: 'قميص رجالي كلاسيك (قصة مستقيمة)',
        category: 'Chemises',
        current_stock: 26,
        low_stock_threshold: 10,
        price: 2.500,
        size_range: '38 - 46 (S - XXL)',
        material_type: 'Carton Kraft 350g',
        notes: 'Patron complet avec col, manches montées et poche poitrine avec gradation.',
        image_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=500&q=80',
      },
      {
        sku: 'PAT-PNT-02',
        name_fr: 'Pantalon Tailleur Coupe Italienne',
        name_ar: 'سروال قماش رسمي بقصة إيطالية',
        category: 'Pantalons',
        current_stock: 14,
        low_stock_threshold: 8,
        price: 3.500,
        size_range: '40 - 52',
        material_type: 'Carton Kraft 350g renforcé',
        notes: 'Modèle haute demande pour confection de costumes formels.',
        image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=500&q=80',
      },
      {
        sku: 'PAT-DRS-03',
        name_fr: 'Robe de Soirée Évasée Corolle',
        name_ar: 'فستان سهرة كلوش مدرج مروحي',
        category: 'Robes',
        current_stock: 5,
        low_stock_threshold: 10,
        price: 5.000,
        size_range: '36 - 44 (XS - L)',
        material_type: 'Papier patron de précision 120g',
        notes: 'Stock faible - Découpe laser à relancer urgemment.',
        image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=500&q=80',
      },
      {
        sku: 'PAT-ABY-04',
        name_fr: 'Abaya Émiratie Coupe Papillon',
        name_ar: 'عباية خليجية بشت فاخرة بقصة فراشة',
        category: 'Abayas & Djellabas',
        current_stock: 35,
        low_stock_threshold: 12,
        price: 6.000,
        size_range: '52 - 60 (Taille Unique)',
        material_type: 'Carton semi-rigide 300g',
        notes: 'Manches larges avec repères de découpe et de broderie.',
        image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=500&q=80',
      },
      {
        sku: 'PAT-JKT-05',
        name_fr: 'Veste Blazer Casual Col Châle',
        name_ar: 'سترة بليزر كاجوال نسائية بياقة شال',
        category: 'Vestes & Manteaux',
        current_stock: 3,
        low_stock_threshold: 8,
        price: 7.500,
        size_range: '38 - 46',
        material_type: 'Carton Kraft épais 400g',
        notes: 'Stock critique ! Reste 3 pièces seulement dans l’entrepôt.',
        image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=500&q=80',
      },
      {
        sku: 'PAT-KID-06',
        name_fr: 'Pyjama Enfant Deux Pièces Coton',
        name_ar: 'طقم بيجاما أطفال قطني قطعتين',
        category: 'Enfants',
        current_stock: 48,
        low_stock_threshold: 15,
        price: 2.000,
        size_range: '2 - 12 ans',
        material_type: 'Papier patron thermique 90g',
        notes: 'Production régulière pour atelier confection junior.',
        image_url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=500&q=80',
      },
      {
        sku: 'PAT-HDY-07',
        name_fr: 'Hoodie Oversize Unisexe Kangourou',
        name_ar: 'هودي أوفرسايز بغطاء رأس وجيب كنغر',
        category: 'Sportswear',
        current_stock: 19,
        low_stock_threshold: 10,
        price: 3.500,
        size_range: 'XS - 3XL',
        material_type: 'Carton Kraft 350g',
        notes: 'Patron streetwear avec capuche double épaisseur.',
        image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=500&q=80',
      },
      {
        sku: 'PAT-SKT-08',
        name_fr: 'Jupe Plissée Midi Ceinture Élastique',
        name_ar: 'تنورة بليسيه ميدي بخصر مطاطي',
        category: 'Robes',
        current_stock: 2,
        low_stock_threshold: 6,
        price: 3.000,
        size_range: 'S - XL',
        material_type: 'Carton semi-rigide 300g',
        notes: 'Stock très critique - Commande atelier en attente.',
        image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=500&q=80',
      },
      {
        sku: 'PAT-DJL-09',
        name_fr: 'Djellaba Moderne Brodée',
        name_ar: 'جلابية تقليدية مغربية بقبة راندة',
        category: 'Abayas & Djellabas',
        current_stock: 22,
        low_stock_threshold: 8,
        price: 5.500,
        size_range: 'M - XXL',
        material_type: 'Carton Kraft 350g',
        notes: 'Comprend les repères de pose sfifa et broderies.',
        image_url: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=500&q=80',
      },
      {
        sku: 'PAT-JNS-10',
        name_fr: 'Pantalon Jean Denim Coupe Regular 5 Poches',
        name_ar: 'بنطلون جينز دنيم بقصة مستقيمة 5 جيوب',
        category: 'Pantalons',
        current_stock: 31,
        low_stock_threshold: 10,
        price: 4.000,
        size_range: '28 - 38',
        material_type: 'Carton rigide 400g',
        notes: 'Confection robuste avec gabarit de poches et rivets.',
        image_url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=500&q=80',
      },
    ];

    const patternCount = await Pattern.countDocuments();
    if (patternCount === 0) {
      console.log('🌱 Insertion des patrons en français...');
      await Pattern.insertMany(samplePatterns);
    } else {
      // Refresh sample patterns categories and descriptions to French
      for (const p of samplePatterns) {
        await Pattern.updateOne(
          { sku: p.sku },
          {
            $set: {
              name_fr: p.name_fr,
              category: p.category,
              material_type: p.material_type,
              notes: p.notes,
              image_url: p.image_url,
              price: p.price,
            },
          }
        );
      }
    }

    // 2.5 Seed Categories if not exist
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
      console.log('🌱 Initialisation des catégories en base de données...');
      const distinctCats = await Pattern.distinct('category');
      const allToSeed = Array.from(new Set([...defaultCategories, ...distinctCats])).filter(Boolean);
      for (const catName of allToSeed) {
        await Category.findOneAndUpdate({ name: catName }, { name: catName }, { upsert: true });
      }
    }

    // 3. Seed or refresh Activity Logs
    const logCount = await ActivityLog.countDocuments();
    if (logCount === 0) {
      console.log('🌱 Initialisation du journal d’activité en français...');
      const adminUser = await User.findOne({ username: 'admin' });
      const workerUser = await User.findOne({ username: 'worker' });
      const pattern1 = await Pattern.findOne({ sku: 'PAT-SHR-01' });
      const pattern2 = await Pattern.findOne({ sku: 'PAT-PNT-02' });
      const pattern3 = await Pattern.findOne({ sku: 'PAT-DRS-03' });
      const pattern6 = await Pattern.findOne({ sku: 'PAT-KID-06' });

      const now = new Date();
      await ActivityLog.insertMany([
        {
          action_type: 'production_increment',
          user_id: workerUser?._id,
          user_name: 'Ahmed Ben Salem (Opérateur machine)',
          user_role: 'worker',
          pattern_id: pattern1?._id,
          pattern_name: 'Chemise Classique Homme (Coupe Droite)',
          pattern_sku: 'PAT-SHR-01',
          quantity_changed: 1,
          previous_stock: 25,
          new_stock: 26,
          notes: 'Production immédiate découpeuse laser',
          undone: 0,
          created_at: new Date(now.getTime() - 10 * 60 * 1000),
        },
        {
          action_type: 'order_deduct',
          user_id: adminUser?._id,
          user_name: "Taher Mansouri (Propriétaire de l'atelier)",
          user_role: 'admin',
          pattern_id: pattern2?._id,
          pattern_name: 'Pantalon Tailleur Coupe Italienne',
          pattern_sku: 'PAT-PNT-02',
          quantity_changed: -4,
          previous_stock: 18,
          new_stock: 14,
          notes: 'Commande client n°1042 - Usine Al-Ofoq Confection',
          undone: 0,
          created_at: new Date(now.getTime() - 40 * 60 * 1000),
        },
        {
          action_type: 'production_custom',
          user_id: workerUser?._id,
          user_name: 'Ahmed Ben Salem (Opérateur machine)',
          user_role: 'worker',
          pattern_id: pattern6?._id,
          pattern_name: 'Pyjama Enfant Deux Pièces Coton',
          pattern_sku: 'PAT-KID-06',
          quantity_changed: 5,
          previous_stock: 43,
          new_stock: 48,
          notes: 'Production lot rapide +5 patrons carton',
          undone: 0,
          created_at: new Date(now.getTime() - 120 * 60 * 1000),
        },
        {
          action_type: 'order_deduct',
          user_id: adminUser?._id,
          user_name: "Taher Mansouri (Propriétaire de l'atelier)",
          user_role: 'admin',
          pattern_id: pattern3?._id,
          pattern_name: 'Robe de Soirée Évasée Corolle',
          pattern_sku: 'PAT-DRS-03',
          quantity_changed: -2,
          previous_stock: 7,
          new_stock: 5,
          notes: 'Expédition échantillon - Maison Haute Couture',
          undone: 0,
          created_at: new Date(now.getTime() - 180 * 60 * 1000),
        },
      ]);
    }
  } catch (err) {
    console.error('Erreur dans seedData :', err);
  }
}

export default mongoose;
