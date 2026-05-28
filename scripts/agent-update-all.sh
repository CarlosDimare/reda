#!/bin/bash
# Run both agents and commit changes

set -e

echo "══════════════════════════════════════════"
echo " REDA — Actualización de Portal de Protestas"
echo " Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════════"

# Ensure data directory exists
mkdir -p data

# If no data file exists, create empty one
if [ ! -f data/acciones.json ]; then
  echo "[]" > data/acciones.json
fi

echo ""
echo "▶ Ejecutando agente INTERNACIONALES..."
echo ""
bash scripts/agent-internacionales.sh

echo ""
echo "▶ Ejecutando agente PROTESTAS AR..."
echo ""
bash scripts/agent-protestas_ar.sh

echo ""
echo "══════════════════════════════════════════"
echo " Actualización completada"
echo "══════════════════════════════════════════"
