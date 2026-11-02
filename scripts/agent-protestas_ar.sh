#!/bin/bash
# Agent: Busca protestas en ARGENTINA y actualiza data/acciones.json

set -e

echo "[AGENTE PROTESTAS AR] Iniciando..."
echo "[AGENTE PROTESTAS AR] Leyendo data/acciones.json actual..."

mkdir -p data archive

# Guardar backup antes de actualizar
if [ -f data/acciones.json ]; then
  cp data/acciones.json "archive/acciones-$(date +%Y%m%d-%H%M%S).json"
fi

opencode run --yes "
Hoy es $(date +%Y-%m-%d). Sos un agente de monitoreo de protestas en ARGENTINA.

1. LEÉ el archivo data/acciones.json para conocer la estructura actual.
2. BUSCÁ en la web con websearch protestas, cortes de ruta, piquetes, movilizaciones, paros, huelgas que estén OCURRIENDO HOY en ARGENTINA.
3. ACTUALIZÁ el archivo data/acciones.json:
   - Mantené las entradas de seccion 'internacionales' sin cambios.
   - NUNCA borres todo el archivo. Siempre preservá todas las entradas existentes.
   - Si NO encontrás ninguna protesta en ARGENTINA HOY verificada, NO elimines las entradas existentes de seccion 'protestas_ar'. Mantenelas exactamente como están o actualizá solo su updatedAt.
   - Solo reemplazá o agregá entradas de seccion 'protestas_ar' si encontraste AL MENOS UNA nueva acción verificada para HOY. Podés agregar nuevas entradas sin eliminar las anteriores si ambas son válidas.
   - NO REEMPLACES TODA LA SECCIÓN POR VACÍO. Si hay dudas, conservá lo existente.
   - Guardá TODO lo que encuentres en el archivo data/acciones.json SIN ELIMINAR información histórica.
   - Asigná IDs correlativos (máximo id existente + 1, +2, etc.) para las nuevas entradas.
4. CONFIRMAME cuántas acciones encontraste y de qué provincias.

Buscá en medios argentinos: Clarín, Infobae, Página 12, La Nación, Ámbito, TN, elDiarioAR.
Cada entrada debe tener: id, seccion, pais, bandera, hora, fecha, lugar, tipoAccion, organizaciones, motivo, status, lat, lng, fuentes, createdAt, updatedAt.
"
