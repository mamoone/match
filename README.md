# ⚓ URGEMAR — Remplacement Maritime en Urgence

Plateforme de **matching d'urgence pour le secteur maritime**, à la manière du modèle InDrive : un responsable (armateur, capitaine, compagnie) publie une offre de remplacement, tous les marins inscrits dans la spécialité concernée reçoivent une **notification instantanée**, et le premier marin que le responsable accepte décroche le poste temporaire.

## 🚀 Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + React Router |
| Backend | Supabase (Auth, PostgreSQL, Realtime, RLS) |
| Auth | Supabase Auth (email + mot de passe) |
| Déploiement | GitHub Pages (Workflow Actions) |

## 🛠️ Fonctionnalités

### Rôles
- **Marin** : reçoit les notifications d'offres, postule, suit ses candidatures
- **Responsable** : publie des offres de remplacement, examine les candidatures, accepte un marin
- **Admin** : tableau de bord, gestion des utilisateurs (ban), suppression d'offres

### Parcours type
1. Un **responsable** publie une offre : `spécialité`, `lieu`, `dates`, `taux journalier`, `urgence`
2. Trigger Supabase → **notification instantanée** à tous les marins concernés
3. Les marins reçoivent les notifications (in-app `realtime` + navigateur)
4. Un marin **postule** → notification au responsable
5. Le responsable **accepte** le premier marin → statut `filled`, les autres candidatures sont refusées automatiquement, le marin reçoit une notification de confirmation

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration Supabase

### 1. Créer le projet Supabase
Rendez-vous sur [supabase.com](https://supabase.com), créez un projet.

### 2. Appliquer le schéma
Dans l'éditeur SQL de votre projet, exécutez le contenu de :
```
supabase/migrations/0001_init.sql
```

### 3. Configurer l'auth
- **Authentication → Providers → Email** : activer (pas besoin de confirmation pour la v1)
- Pour autoriser GitHub Pages : **Authentication → URL Configuration** → ajouter votre URL `https://VOTRE-USER.github.io/MATCH`

### 4. Créer un admin
Après avoir inscrit votre premier compte, exécutez dans l'éditeur SQL :
```sql
update public.profiles set role = 'admin' where email = 'votre@email.com';
```

## 🚢 Déploiement

### 1. Créer le repo GitHub
- Créez un repo nommé **MATCH** sur GitHub
- Ajoutez les variables secrètes dans **Settings → Secrets and variables → Actions** :
  - `VITE_SUPABASE_URL` : `https://xxxx.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` : la clé `anon public`

### 2. Pousser le code
```bash
git remote add origin git@github.com:VOTRE-USER/MATCH.git
git push -u origin main
```

### 3. Activer GitHub Pages
- **Settings → Pages** → Source : **GitHub Actions**
- Le workflow s'exécute automatiquement à chaque `push` sur `main`

L'app est alors en ligne : **`https://VOTRE-USER.github.io/MATCH/`**

## 🗄️ Schéma de base de données

```
profiles (auth)
  ├── role (marin / responsable / admin)
  ├── specialty (Capitaine, Chef Mécanicien, Matelot...)
  ├── company_name (pour responsables)
  ├── banned (flag admin)
  │
job_offers
  ├── specialty_needed, location, start_date, end_date
  ├── daily_rate, urgency, status (open/filled/cancelled)
  ├── posted_by → profiles.id
  └── filled_by → profiles.id
      │
applications
  ├── offer_id → job_offers.id
  ├── worker_id → profiles.id
  └── status (pending/accepted/rejected)
      │
notifications
  ├── user_id → profiles.id
  ├── message, type, read
  └── offer_id → job_offers.id
```

## 🔐 Sécurité (Row Level Security)

- Chaque utilisateur ne voit/modifie que ses propres données
- Les offres ouvertes sont visibles par tous les marins
- Seul le responsable peut accepter/refuser des candidatures de ses offres
- Seul l'admin peut bannir des utilisateurs ou supprimer des offres
- Un marin banni ne reçoit plus de notifications

## 🧭 Roadmap v2
- Confirmation email + téléphone OTP
- Notifications push hors-ligne (via Edge Function + e-mail)
- Géolocalisation des ports (distance port ↔ marin)
- Messagerie intégrée responsable ↔ marin
- Candidatures priorité (les plus proches en premier)
- Multi-sectoriel (au-delà du maritime)