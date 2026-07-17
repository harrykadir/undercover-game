# Undercover — le jeu

Jeu de societé "Undercover" à jouer à 3 ou 4 joueurs sur un seul téléphone.

## Fichiers
- `index.html` — la page du jeu (structure + style)
- `game.js` — la logique du jeu
- `words.js` — la banque de mots par thème (modifiable facilement)

## Héberger gratuitement sur GitHub Pages

1. Crée un nouveau dépôt sur GitHub (ex: `undercover-game`), public.
2. Mets les 3 fichiers (`index.html`, `game.js`, `words.js`) à la racine du dépôt.
   - Via l'interface web GitHub : "Add file" → "Upload files" → glisse les 3 fichiers → Commit.
   - Ou en local :
     ```bash
     git init
     git add index.html game.js words.js
     git commit -m "Undercover game"
     git branch -M main
     git remote add origin https://github.com/TON-PSEUDO/undercover-game.git
     git push -u origin main
     ```
3. Dans le dépôt GitHub : **Settings → Pages**.
4. Sous "Build and deployment", source = **Deploy from a branch**, branche = **main**, dossier = **/ (root)**.
5. Sauvegarde. Après 1-2 minutes, ta page sera accessible à :
   `https://TON-PSEUDO.github.io/undercover-game/`

C'est tout — pas de backend, tout tourne dans le navigateur.

## Modifier les mots

Ouvre `words.js`. Chaque thème a une liste `pairs` de paires `[motCivil, motUndercover]`.
Pour ajouter une paire, ajoute une ligne comme les autres dans le thème concerné.
Pour ajouter un thème, copie un bloc de thème existant et adapte `label`, `icon`, `pairs`.

## Règles implémentées

- 3 joueurs → 1 undercover, 2 civils / 4 joueurs → 1 undercover, 3 civils
- Choix du thème parmi 6 catégories
- Distribution des cartes en ordre aléatoire, une carte à la fois (face cachée → clic pour révéler → clic "j'ai vu" pour passer au joueur suivant)
- Ordre de prise de parole tiré aléatoirement après distribution
- Vote à tour de rôle (le votant ne peut pas voter pour lui-même)
- Résultat : révélation de l'undercover + victoire des civils si la majorité des votes s'est portée sur lui
- Bouton "Rejouer" (même joueurs, nouveau mot) et "Nouvelle partie" (tout reconfigurer)
