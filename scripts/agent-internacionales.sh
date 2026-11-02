#!/bin/bash
# Agent: Busca acciones colectivas INTERNACIONALES y actualiza data/acciones.json

set -e

echo "[AGENTE INTERNACIONALES] Iniciando..."
echo "[AGENTE INTERNACIONALES] Leyendo data/acciones.json actual..."

mkdir -p data archive

# Guardar backup antes de actualizar
if [ -f data/acciones.json ]; then
  cp data/acciones.json "archive/acciones-$(date +%Y%m%d-%H%M%S).json"
fi

opencode run --yes "
Hoy es $(date +%Y-%m-%d). Sos un agente de monitoreo de conflictos globales.

1. LEÉ el archivo data/acciones.json para conocer la estructura actual.
2. BUSCÁ en la web con websearch acciones colectivas, protestas, huelgas, movilizaciones que estén OCURRIENDO HOY en todo el mundo (EXCLUYENDO Argentina).
3. ACTUALIZÁ el archivo data/acciones.json:
   - Mantené las entradas de seccion 'protestas_ar' sin cambios.
   - NUNCA borres todo el archivo. Siempre preservá todas las entradas existentes.
   - Si NO encontrás ninguna protesta internacional HOY verificada, NO elimines las entradas existentes de seccion 'internacionales'. Mantenelas exactamente como están o actualizá solo su updatedAt.
   - Solo reemplazá o agregá entradas de seccion 'internacionales' si encontraste AL MENOS UNA nueva acción internacional verificada para HOY. Podés agregar nuevas entradas sin eliminar las anteriores si ambas son válidas.
   - NO REEMPLACES TODA LA SECCIÓN POR VACÍO. Si hay dudas, conservá lo existente.
   - Guardá TODO lo que encuentres en el archivo data/acciones.json SIN ELIMINAR información histórica.
   - Asigná IDs correlativos (máximo id existente + 1, +2, etc.) para las nuevas entradas.
4. CONFIRMAME cuántas acciones encontraste y de qué países.

Buscá en fuentes como BBC, Reuters, Al Jazeera, AFP, Guardian, CNN, medios locales.
Cada entrada debe tener: id, seccion, pais, bandera, hora, fecha, lugar, tipoAccion, organizaciones, motivo, status, lat, lng, fuentes, createdAt, updatedAt.
"
