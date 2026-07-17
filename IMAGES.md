# Ajouter des images sur les cartes

Le jeu peut afficher une image en fond de carte pour n'importe quel mot, dans n'importe quel thème.
Si aucune image n'est trouvée pour un mot, la carte reste en texte simple (aucun risque de casser le jeu).

## Format et convention de nommage

Chaque image doit être un fichier **JPG ou PNG**, placé dans le dossier `images/`, et nommé d'après le mot exact
tel qu'il apparaît dans `words.js`, converti en "slug" :

- tout en minuscules
- les accents sont supprimés (é → e, ô → o, etc.)
- les espaces et caractères spéciaux sont remplacés par des tirets `-`
- pas de tirets en début/fin de nom

Le jeu cherche d'abord un fichier `.jpg`, puis un `.png` si aucun `.jpg` n'est trouvé pour ce mot.
Un seul des deux suffit par mot (pas besoin des deux formats en même temps).

### Exemples

| Mot dans words.js         | Nom de fichier attendu (exemple en .jpg) |
|----------------------------|-----------------------------------|
| `Yoichi Isagi`              | `images/yoichi-isagi.jpg`         |
| `Kirua Zoldik`              | `images/kirua-zoldik.jpg`         |
| `Tetsuya (chien)`           | `images/tetsuya-chien.jpg`        |
| `Kylian Mbappé`             | `images/kylian-mbappe.jpg`        |
| `La Reine des fourmis chimères` | `images/la-reine-des-fourmis-chimeres.jpg` |
| `Bob l'éponge`              | `images/bob-l-eponge.jpg` (ou `.png`)

## Format recommandé

- Format carré ou portrait (ex: 500×700px) pour bien remplir la carte
- PNG (avec ou sans transparence, peu importe — le fond est recouvert par un dégradé sombre pour garder le texte lisible)
- Poids raisonnable (quelques centaines de Ko max) pour un chargement rapide sur mobile

## Ça marche pour tous les thèmes

Le système n'est pas limité aux animés : tu peux ajouter des images pour les dessins animés,
super-héros, footballeurs, jeux vidéo, films/séries — il suffit de respecter la convention de nommage.

## Comment ajouter une image

1. Renomme ton fichier selon la convention ci-dessus.
2. Dépose-le dans le dossier `images/` du dépôt GitHub (upload direct ou via Git).
3. Rafraîchis la page du jeu — l'image apparaîtra automatiquement en fond de carte
   la prochaine fois que ce mot est tiré.

Aucune autre modification de code n'est nécessaire.
