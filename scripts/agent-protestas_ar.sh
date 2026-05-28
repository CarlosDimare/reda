#!/bin/bash
# Agent: Busca protestas en ARGENTINA y actualiza data/acciones.json

set -e

echo "[AGENTE PROTESTAS AR] Iniciando..."
echo "[AGENTE PROTESTAS AR] Leyendo data/acciones.json actual..."

opencode run --yes "
Hoy es $(date +%Y-%m-%d). Sos un agente de monitoreo de protestas en ARGENTINA.

1. LEÉ el archivo data/acciones.json para conocer la estructura actual.
2. BUSCÁ en la web con websearch protestas, cortes de ruta, piquetes, movilizaciones, paros, huelgas que estén OCURRIENDO HOY en ARGENTINA.
3. ACTUALIZÁ el archivo data/acciones.json:
   - Mantené las entradas de seccion 'internacionales' sin cambios.
   - Reemplazá TODAS las entradas de seccion 'protestas_ar' con los nuevos datos de HOY.
   - Asigná IDs correlativos (máximo id existente + 1, +2, etc.)
4. CONFIRMAME cuántas acciones encontraste y de qué provincias.

Buscá en medios argentinos: Clarín, Infobae, Página 12, La Nación, Ámbito, TN, elDiarioAR.
Cada entrada debe tener: id, seccion, pais, bandera, hora, fecha, lugar, tipoAccion, organizaciones, motivo, status, lat, lng, fuentes, createdAt, updatedAt.
"
