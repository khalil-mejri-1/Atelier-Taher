# Atelier Taher | Patrons de Couture
### Application Web B2B de Gestion des Stocks & Production
**Solution logicielle pour ateliers et usines de modélisme et confection textile.**

---

## 🎨 Identité Visuelle & Philosophie de Design
- **Arrière-plan & Cartes :** Teinte neutre albâtre douce (`#F8F9FA` Alabaster) et blanc pur (`#FFFFFF`) pour les cartes.
- **Couleur Principale & Boutons :** Ardoise anthracite profond (`#0F172A` / `#1E293B` Slate Charcoal) pour les boutons d'action et les états actifs.
- **Bordures & Séparateurs :** Bordures subtiles de 1px (`#E2E8F0` Subtle Cool Gray) évitant les ombres lourdes.
- **Indicateurs d'état raffinés (Muted Tints) :**
  - **Stock disponible & Production :** Vert sauge sobre (`#15803D` sur fond `#F0FDF4`).
  - **Alerte stock faible (Low Stock) :** Ambre chaud et reposant (`#B45309` sur fond `#FFFBEB`).
  - **Déduction de commande & Stock critique :** Terracotta / Rouge feutré (`#B91C1C` sur fond `#FEF2F2`).
- **Typographie & Mise en page :** Police **Inter** pour une lisibilité optimale des codes patrons (SKU) et textes, alignement LTR naturel en français.
- **Architecture Mobile-First :** Conçu pour les écrans mobiles (390px - 430px) avec des zones tactiles ergonomiques (hauteur minimale de 48px) et barre de navigation inférieure épinglée, tout en s'adaptant harmonieusement aux écrans de bureau (1280px+).

---

## 👥 Comptes de Démonstration (Bascule en 1 Clic)

| Rôle | Nom complet | Identifiant | Mot de passe | Code PIN | Permissions |
|---|---|---|---|---|---|
| **Propriétaire de l'atelier (Admin)** | Taher Mansouri | `admin` | `admin123` | `1111` | Accès complet aux stocks, déduction de commandes, gestion des modèles, audit en direct et gestion des opérateurs |
| **Opérateur machine (Worker)** | Ahmed Ben Salem | `worker` | `worker123` | `2222` | Interface ultra-ciblée, bouton tactile `+1 Produit`, et toast d'annulation de sécurité (6 secondes) |
| **Opérateur de coupe (Worker)** | Samir Jaziri | `samir` | `samir123` | `3333` | Saisie de production de lots personnalisés (+5) et découpe directe |

---

## ⚡ Fonctionnalités Clés

### 1. Interface Opérateur de Découpe (Worker)
- **Liste rapide des patrons :** Recherche instantanée par nom ou code SKU (Chemises, Pantalons, Robes, Abayas, Sportswear...) et filtres par catégorie.
- **Saisie tactile en un clic (+1 Produit) :** Bouton réactif de grande taille pour enregistrer la découpe sans quitter le poste.
- **Saisie de lots (+5 / Personnalisé) :** Modal avec incrémenteur numérique pour les séries de production.
- **Toast d'annulation de sécurité (Safety Undo Toast) :** Notification flottante avec barre de progression de 6 secondes permettant d'annuler instantanément en cas d'erreur de frappe.

### 2. Tableau de Bord Administrateur (Admin Dashboard)
- **Indicateurs KPI minimalistes :**
  - Total des patrons en stock.
  - Pièces produites aujourd'hui.
  - Modèles en stock faible (alerte configurable).
  - Pièces expédiées aux clients aujourd'hui.
- **Gestion des photos & croquis techniques :**
  - Import direct depuis l'ordinateur/téléphone (JPG, PNG, WebP).
  - Saisie par lien URL ou sélection parmi des modèles de croquis prédéfinis.
  - Aperçu miniature sur chaque fiche et agrandissement en lightbox haute définition.
- **Déduction rapide des commandes clients :**
  - Barre de recherche de disponibilité instantanée.
  - Déduction en 1 clic (`-1 Déduire`) ou modal complet avec nom du client et bon de livraison.
- **Gestion individuelle et groupée (Single & Bulk) :**
  - Ajout/Modification de patrons (SKU, nom, gradation des tailles, matière, notes).
  - Sélection multiple pour : ajuster le stock en masse, changer de catégorie, ou suppression groupée.
- **Gestion des comptes opérateurs :** Création d'accès, attribution de codes PIN, suspension et réinitialisation de mots de passe.
- **Journal d'audit en direct (Audit Trail) :** Flux chronologique en temps réel avec horodatage relatif (*ex : "Ahmed Ben Salem a enregistré une production de +1 pour Chemise Classique • il y a 2 minutes"*).

### 3. Synchronisation Temps Réel (WebSockets / Socket.io)
- Tout incrément ou déduction effectué sur un terminal opérateur se répercute instantanément sur l'écran d'administration sans rechargement de page.

---

## 🛠️ Stack Technique
- **Frontend :** React 19, Vite 8, Tailwind CSS, Lucide Icons, Socket.io-client.
- **Backend :** Node.js, Express 5, MongoDB avec Mongoose ODM, Socket.io, JWT & Bcryptjs.

---

## 🚀 Démarrage Local

### 1. Serveur Backend (Port 5000)
```bash
cd server
npm install
npm start
```

### 2. Client Frontend (Port 5173)
```bash
cd client
npm install
npm run dev
```
Accès à l'application : `http://localhost:5173/`
