# Refonte de la page d’accueil Mayinvest

## Résultat attendu
- Remplacer entièrement l’accueil actuel par la maquette claire validée, dans l’ordre demandé : navigation, présentation, preuves, étapes, chiffres, appel final et pied de page.
- Ajouter le nouveau logo Mayinvest réutilisable en version standard et blanche.
- Relier les deux choix de profil au formulaire de présélection existant, sans modifier l’authentification ni les données.
- Adapter précisément la mise en page aux écrans mobiles : une seule colonne, espacements réduits et titre à 36 px.

## Mise en œuvre
- Créer le composant `MayinvestLogo` à partir du SVG fourni.
- Réécrire uniquement la page d’accueil avec les textes, chiffres, icônes, carte score et liens demandés.
- Ajouter les styles dédiés de cette nouvelle page et les variantes mobiles, tout en conservant les styles nécessaires aux autres pages.
- Charger Plus Jakarta Sans dans l’en-tête global et l’appliquer comme police principale.
- Vérifier l’accueil sur ordinateur et mobile, les liens vers la simulation, ainsi que l’absence d’erreurs.

## Détail technique
- Les boutons de profil utiliseront la route `/simulation` existante et transmettront le profil choisi dans l’URL afin que le formulaire puisse l’exploiter sans toucher à l’authentification.
- Les couleurs de la maquette seront enregistrées comme variables sémantiques, puis utilisées par les styles de l’accueil.
- Les pages de connexion, simulation et back-office conserveront leur fonctionnement actuel.
