# Lighthouse Reports

Ce dossier contient les rapports de performance Lighthouse pour le projet Amanda Traduction.

## Utilisation

Pour lancer un nouveau test Lighthouse :

```bash
# Depuis la racine du projet
bash .lighthouse/run-lighthouse.sh
```

**Prérequis** : Les serveurs Next.js (port 3000) et Strapi (port 1337) doivent être démarrés.

## Rapports

Les rapports sont générés dans ce dossier :
- `report.report.html` - Rapport visuel détaillé (à ouvrir dans le navigateur)
- `report.report.json` - Données brutes au format JSON

## Notes

Ce dossier est ignoré par Git (voir `.gitignore` à la racine du projet).
