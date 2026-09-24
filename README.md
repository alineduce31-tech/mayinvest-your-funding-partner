# Mayinvest: Your Funding Partner

Prompt à copier dans Hostinger Horizons

Crée une application web appelée Mayinvest, une plateforme de préselection de dossiers de financement pour un cabinet de conseil (Mayinvest Conseil) basé au Congo.

IMPORTANT — structure du fichier

Le composant principal doit être un seul fichier App.jsx (ou src/App.jsx si ta structure utilise un dossier src), avec un export default function App(). Ne découpe pas en plusieurs fichiers séparés pour l'instant : je dois pouvoir remplacer tout le contenu de ce fichier unique par une nouvelle version à chaque itération. Garde donc tous les composants (Home, Auth, Wizard, AdminDashboard, Logo, etc.) comme des fonctions dans ce même fichier, au-dessus du composant App.

Charte graphique — style Apple, clair

Fond général : gris très clair #F5F5F7

Cartes : blanc #FFFFFF, coins arrondis (16-20px), ombre douce (0 2px 20px rgba(0,0,0,0.06)), pas de bordure épaisse

Texte principal : #1D1D1F (quasi noir)

Texte secondaire / discret : #86868B

Bordures fines : #E5E5E7

Couleur d'accent unique, utilisée avec parcimonie (boutons principaux, éléments actifs) : bleu #0071E3

Police système : -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Inter, sans-serif

Boutons en forme de pilule (border-radius: 980px), pas de coins carrés

Pas de fond marine/bleu foncé envahissant — c'est un point qu'on a corrigé volontairement, garde le design clair partout

Logo

Utilise le logo "Mayinvest" fourni en pièce jointe (texte serif marine avec des vagues bleu clair en arrière-plan, sur fond transparent)

Dans le header : petite taille (~110px de large), posé directement sur le fond clair (pas besoin de plaque blanche puisque le fond est déjà clair)

Sur l'écran de connexion : taille plus grande (~150-170px de large), centré au-dessus du titre

Authentification

Téléphone + mot de passe (pas de code de vérification par SMS, on a testé et écarté cette option pour rester simple et gratuit)

Un seul écran avec bascule "Connexion" / "Inscription" (pas deux pages séparées)

Champs : nom complet (inscription uniquement), numéro de téléphone, mot de passe

Base de données — connecte Supabase

Connecte un vrai projet Supabase dès le départ (pas de localStorage, on veut de la vraie persistance partagée entre utilisateurs)

Table users : id, nom complet, numéro de téléphone (unique, utilisé pour la connexion), mot de passe (hashé), date de création

Table leads : id, user_id (agent créateur), type (physique/morale), activité/secteur, statut (cycle de vie complet ci-dessous), score, montant demandé, banque actuelle, raison de non-éligibilité, ville, tous les champs du formulaire, created_at, updated_at

L'authentification par téléphone + mot de passe doit utiliser Supabase Auth (ou une table users custom avec vérification côté serveur), pas une simulation côté client

Une fois Supabase connecté, dis-moi quelles variables d'environnement / clés API tu as configurées, pour que je sache que c'est branché

Pages / écrans (dans cet ordre de navigation)

Accueil : titre "Qualifiez vos demandes de financement en 2 minutes.", sous-texte, bouton "Commencer ma simulation", aperçu d'un score dans une carte blanche flottante, 3 cartes de fonctionnalités (Physique ou PME / Dossier sur mesure / Score en temps réel)

Connexion/Inscription (voir ci-dessus)

Formulaire en 4 étapes :

Étape 1 : "Personne physique" ou "Personne morale / PME"

Étape 2 : activité (physique : Fonctionnaire, Salarié privé, Commerçant, Artisan, Profession libérale, Agriculteur) ou secteur (PME : Commerce, Tourisme, BTP, Industrie/Bois, Agriculture, Transport, Santé, Tech, Autre)

Étape 3 : formulaire en 4 blocs (Identité, Situation pro/juridique, Besoin de financement, Éligibilité) — champs différents selon Physique vs PME

Étape 4 : confirmation avec score de bancabilité affiché en jauge circulaire /100

Back-office (après connexion) : cartes KPI (Total leads, Financés, Taux de transformation), tableau des leads avec changement de statut

Calcul du score (base 40/100)

Personne physique :

+20 si ancienneté > 6 mois

+20 si salaire domicilié

+20 si revenu ≥ 500 000 FCFA, +10 si ≥ 200 000 FCFA

PME :

+25 si RCCM = Oui, -15 si RCCM = Non

+15 si compte mouvementé

+10 si pas de refus bancaire récent

+15 si garanties disponibles

+15 si flux mensuel ≥ 5 000 000 FCFA, +5 si ≥ 1 000 000 FCFA

Cycle de statut CRM (back-office)

Nouveau → Contacté → Non Éligible → Pack Formalisation Vendu → Bancarisé → Éligible → Dossier déposé → Financé (+ Perdu)

Ce qu'il ne faut PAS faire

Ne pas ajouter de photos stock (personnes, bureaux, paysages) — design épuré, uniquement le logo

Ne pas ajouter de vérification par SMS/OTP

Ne pas découper le code en dizaines de petits fichiers/composants séparés — un seul App.jsx

Commence par le fichier App.jsx complet avec l'accueil et l'authentification, puis ajoute le formulaire, puis le back-office.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e5033bc6-7668-46b5-a972-d90ce582845d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
