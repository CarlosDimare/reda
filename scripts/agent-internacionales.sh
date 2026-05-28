#!/bin/bash
# Agent: Busca acciones colectivas INTERNACIONALES y actualiza data/acciones.json

set -e

echo "[AGENTE INTERNACIONALES] Iniciando..."
echo "[AGENTE INTERNACIONALES] Leyendo data/acciones.json actual..."

opencode run --yes "
Hoy es $(date +%Y-%m-%d). Sos un agente de monitoreo de conflictos globales.

1. LEÉ el archivo data/acciones.json para conocer la estructura actual.
2. BUSCÁ en la web con websearch acciones colectivas, protestas, huelgas, movilizaciones que estén OCURRIENDO HOY en todo el mundo (EXCLUYENDO Argentina).
3. ACTUALIZÁ el archivo data/acciones.json:
   - Mantené las entradas de seccion 'protestas_ar' sin cambios.
   - Reemplazá TODAS las entradas de seccion 'internacionales' con los nuevos datos de HOY.
   - Asigná IDs correlativos (máximo id existente + 1, +2, etc.)
4. CONFIRMAME cuántas acciones encontraste y de qué países.

Buscá en fuentes como BBC, Reuters, Al Jazeera, AFP, Guardian, CNN, medios locales.
Cada entrada debe tener: id, seccion, pais, bandera, hora, fecha, lugar, tipoAccion, organizaciones, motivo, status, lat, lng, fuentes, createdAt, updatedAt.
"
