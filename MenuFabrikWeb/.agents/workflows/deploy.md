---
description: builder et déployer l'app sur Firebase (Hosting + Firestore rules)
---

1. Vérifier qu'on est bien connecté à Firebase
```
npx firebase-tools whoami
```
Cwd: /Users/christophemartin/Documents/ProjectDev/MenuFabrik/MenuFabrikWeb

// turbo
2. Builder et déployer en une seule commande (build TypeScript + Vite + firebase deploy hosting + firestore)
```
npm run deploy
```
Cwd: /Users/christophemartin/Documents/ProjectDev/MenuFabrik/MenuFabrikWeb

Le script `deploy` dans package.json exécute : `npm run build && firebase deploy --only hosting,firestore`
