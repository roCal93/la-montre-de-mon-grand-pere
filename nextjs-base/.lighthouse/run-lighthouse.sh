#!/bin/bash

# Script pour exécuter Lighthouse sur le projet amanda-traduction

echo "🔍 Vérification que le serveur répond..."

# Vérifier que Next.js répond
max_attempts=10
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if curl -s http://localhost:3000/fr > /dev/null 2>&1; then
    echo "✅ Serveur Next.js répond!"
    break
  fi
  echo "⏳ Attente du serveur (tentative $((attempt + 1))/$max_attempts)..."
  sleep 2
  attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ Le serveur Next.js ne répond pas"
  exit 1
fi

echo "🔍 Lancement du test Lighthouse..."

# Exécuter Lighthouse
npx --yes lighthouse http://localhost:3000/fr \
  --output html \
  --output json \
  --output-path ./.lighthouse/report \
  --chrome-flags="--no-sandbox --disable-gpu" \
  --only-categories=performance,accessibility,best-practices,seo

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Test Lighthouse terminé avec succès!"
  echo "📊 Rapport HTML: .lighthouse/report.report.html"
  echo "📄 Données JSON: .lighthouse/report.report.json"
  echo ""
  
  # Afficher un résumé des scores
  if command -v jq &> /dev/null; then
    echo "📈 Résumé des scores:"
    jq -r '.categories | to_entries[] | "  \(.value.title): \(if .value.score == null then "N/A" else (.value.score * 100 | round | tostring) + "%" end)"' .lighthouse/report.report.json
  fi
else
  echo "❌ Erreur lors de l'exécution de Lighthouse"
  exit 1
fi
