import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Pattern from '../models/Pattern.js';
import Category from '../models/Category.js';

const products = [
  {
    name_fr: "PATRON PYJAMA FEMME",
    name_ar: "باترون بيجاما نسائية",
    price: 105.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793453895654-72306199.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON SET OVERSIZE",
    name_ar: "باترون طقم نسائي أوفر سايز",
    price: 100.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793452977370-322028077.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON JOGGING OVER SIZE FEMME",
    name_ar: "باترون ترينج نسائي أوفر سايز",
    price: 125.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789220244863-574515378.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON JOGGING FEMME",
    name_ar: "باترون ترينج نسائي",
    price: 125.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789220387325-996298353.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON JOGGING ENFANT",
    name_ar: "باترون ترينج أطفال",
    price: 105.00,
    category: "Enfant",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789220512360-489265601.webp",
    size_range: "2 - 14 ans"
  },
  {
    name_fr: "PATRON JOGGING HOMME",
    name_ar: "باترون ترينج رجالي",
    price: 115.00,
    category: "Homme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789220658340-224041002.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON JOGGING HOMME OVERSIZE",
    name_ar: "باترون ترينج رجالي أوفر سايز",
    price: 115.00,
    category: "Homme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789220751162-352308302.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON DE BASE POUR FEMME",
    name_ar: "باترون أساس نسائي",
    price: 130.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793790088730-470567052.webp",
    size_range: "36 - 48"
  },
  {
    name_fr: "PATRON DE BASE HOMME",
    name_ar: "باترون أساس رجالي",
    price: 120.00,
    category: "Homme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793790109229-948761044.webp",
    size_range: "38 - 52"
  },
  {
    name_fr: "PATRON DE BASE ENFANT",
    name_ar: "باترون أساس أطفال",
    price: 110.00,
    category: "Enfant",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789220867217-85439575.webp",
    size_range: "2 - 14 ans"
  },
  {
    name_fr: "PATRON SET FEMME",
    name_ar: "باترون طقم نسائي كلاسيك",
    price: 110.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789220886856-400726829.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON OUTFIT (chemise pantalon large sous veste)",
    name_ar: "باترون أوتفيت كامل (قميص وبنطلون واسع وتوب)",
    price: 150.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789220928447-819425877.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON ROBE A 3 VOLANTS",
    name_ar: "باترون فستان 3 كشاكش (فولونات)",
    price: 90.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789220962041-607362177.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON JEBBA FILLE",
    name_ar: "باترون جبة تقليدية بناتي",
    price: 70.00,
    category: "Enfant",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793455172247-134895407.webp",
    size_range: "4 - 14 ans"
  },
  {
    name_fr: "PATRON JEBBA FEMME",
    name_ar: "باترون جبة تقليدية نسائية",
    price: 80.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221028172-708405077.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON KIMONO",
    name_ar: "باترون كيمونو عصري",
    price: 60.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793455270382-519560932.webp",
    size_range: "Standard / One Size"
  },
  {
    name_fr: "PACK PATRON ABAYA",
    name_ar: "باك باترون عبايات متنوعة",
    price: 80.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793456568956-7884665.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON ABAYA KIMONO",
    name_ar: "باترون عباية كيمونو",
    price: 80.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221185076-603796336.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON BURKINI COMBINAISON",
    name_ar: "باترون بوركيني سباحة جمبسوت",
    price: 110.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221220467-144126323.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON BURKINI AVEC Caleçon",
    name_ar: "باترون بوركيني سباحة مع كلسون",
    price: 120.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221281507-702818332.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON ROBE CHEMISE A VOLANT",
    name_ar: "باترون فستان قميص بطبقات كشكش",
    price: 90.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793790154754-199213233.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON MANTEAU",
    name_ar: "باترون معطف (مانطو) شتوي",
    price: 105.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793790227406-461712019.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON PULL ET SHORT FEMME",
    name_ar: "باترون بلوزة وشورت نسائي",
    price: 70.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221391968-251266626.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON PULL ET SHORT ENFANT",
    name_ar: "باترون بلوزة وشورت أطفال",
    price: 70.00,
    category: "Enfant",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221478726-776923800.webp",
    size_range: "2 - 14 ans"
  },
  {
    name_fr: "PACK LINGERIE FEMME",
    name_ar: "باك باترون لانجري نسائي",
    price: 60.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793790529606-778322053.webp",
    size_range: "S - XL"
  },
  {
    name_fr: "PATRON LINGERIE HOMME",
    name_ar: "باترون ملابس داخلية رجالية",
    price: 60.00,
    category: "Homme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793790563306-71556978.webp",
    size_range: "M - 3XL"
  },
  {
    name_fr: "PATRON ROBE DECOUPE PRINCESSE",
    name_ar: "باترون فستان قصة برنسيس",
    price: 80.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1793790309954-600965893.webp",
    size_range: "36 - 48"
  },
  {
    name_fr: "PATRON Caleçons",
    name_ar: "باترون كلسون رجالي قطني",
    price: 55.00,
    category: "Homme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1791718214116-506912194.jfif",
    size_range: "M - XXL"
  },
  {
    name_fr: "PATRON ROBE COL CRAVATE",
    name_ar: "باترون فستان ياقة كرافات",
    price: 80.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221678908-365114200.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON TABLIER ENFANT",
    name_ar: "باترون مريول مدرسي أطفال",
    price: 75.00,
    category: "Enfant",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221704763-78612694.webp",
    size_range: "4 - 12 ans"
  },
  {
    name_fr: "PATRON DOUDOUNE HOMME",
    name_ar: "باترون جاكيت منفوخ رجالي (دودون)",
    price: 100.00,
    category: "Homme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221742065-10309699.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON SOUS VESTE",
    name_ar: "باترون توب تحت الجاكيت (سو فيست)",
    price: 60.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221779195-962128211.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON PANTALON LARGE",
    name_ar: "باترون بنطلون واسع كلاسيك",
    price: 60.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221813867-790702366.webp",
    size_range: "36 - 48"
  },
  {
    name_fr: "PATRON ROBE CHEMISE",
    name_ar: "باترون فستان قميص شيميزيي",
    price: 80.00,
    category: "Femme",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221856605-170360602.webp",
    size_range: "S - XXL"
  },
  {
    name_fr: "PATRON TABLIER DE TRAVAIL",
    name_ar: "باترون مريول عمل وحرفة",
    price: 95.00,
    category: "Accessoires",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789221984163-836772354.webp",
    size_range: "Standard / Réglable"
  },
  {
    name_fr: "PACK PISTOLETS DE COUTURE",
    name_ar: "طقم مساطر ومنحنيات خياطة احترافية (بيستوليه)",
    price: 65.00,
    category: "Accessoires",
    image: "https://cpatron-api.cpatron.com/uploads/images/img-1789222014166-88718021.webp",
    size_range: "Kit complet"
  }
];

async function seed() {
  console.log('🔄 Connexion à MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connecté à MongoDB');

  // 1. Ensure Categories exist
  const categories = [...new Set(products.map(p => p.category))];
  console.log(`\n📁 Vérification des catégories (${categories.join(', ')})...`);
  for (const cat of categories) {
    await Category.findOneAndUpdate(
      { name: cat },
      { name: cat },
      { upsert: true, new: true }
    );
  }
  console.log('✅ Catégories vérifiées / créées avec succès');

  // 2. Insert or update patterns
  console.log(`\n🧵 Insertion des ${products.length} patrons...`);
  let addedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    let existing = await Pattern.findOne({ name_fr: p.name_fr });
    
    if (existing) {
      existing.name_ar = p.name_ar;
      existing.price = p.price;
      existing.category = p.category;
      existing.image_url = p.image;
      existing.size_range = p.size_range;
      if (!existing.current_stock || existing.current_stock === 0) {
        existing.current_stock = 25;
      }
      await existing.save();
      updatedCount++;
      console.log(`  🔄 [${i + 1}/${products.length}] Mis à jour: ${p.name_fr}`);
    } else {
      // Generate unique SKU
      const randomSku = `PAT-${Math.floor(100000 + Math.random() * 900000)}`;
      await Pattern.create({
        sku: randomSku,
        name_fr: p.name_fr,
        name_ar: p.name_ar,
        category: p.category,
        price: p.price,
        image_url: p.image,
        current_stock: 25,
        low_stock_threshold: 5,
        size_range: p.size_range,
        material_type: 'Carton Kraft 350g',
        notes: `Importé depuis le catalogue CPatron. Prix: ${p.price.toFixed(2)} DT`,
      });
      addedCount++;
      console.log(`  ✨ [${i + 1}/${products.length}] Ajouté: ${p.name_fr} (${randomSku}) - ${p.price} DT`);
    }
  }

  const total = await Pattern.countDocuments();
  console.log(`\n🎉 Terminé avec succès !`);
  console.log(`- Ajoutés : ${addedCount}`);
  console.log(`- Mis à jour : ${updatedCount}`);
  console.log(`- Total patrons dans la base : ${total}`);

  await mongoose.disconnect();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seed().catch((err) => {
    console.error('❌ Erreur lors de l\'insertion :', err);
    process.exit(1);
  });
}

export default seed;


