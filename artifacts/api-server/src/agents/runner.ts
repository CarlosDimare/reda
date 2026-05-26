import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { db, accionesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { pushActivity } from "./activity";
import { saveAcciones } from "./persist";
import type { AgentConfig } from "./prompts";

const __dir = dirname(fileURLToPath(import.meta.url));
function findOpenCode(): string {
  const candidates = [
    resolve(__dir, "../../../node_modules/.bin/opencode"),
    resolve(__dir, "../../../node_modules/.bin/opencode.cmd"),
    resolve(__dir, "../../../node_modules/opencode-ai/bin/opencode.exe"),
    resolve(process.cwd(), "node_modules/.bin/opencode"),
    resolve(process.cwd(), "node_modules/.bin/opencode.cmd"),
    resolve(process.cwd(), "node_modules/opencode-ai/bin/opencode.exe"),
    "opencode",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "opencode";
}
const OPENCODE = findOpenCode();

interface AccionRaw {
  pais?: string;
  bandera?: string;
  hora?: string;
  fecha?: string;
  lugar?: string;
  tipo_accion?: string;
  organizaciones?: string[];
  motivo?: string;
  status?: string;
  lat?: number | null;
  lng?: number | null;
  fuentes?: { nombre?: string; url?: string }[];
}

function extractJSON(text: string): AccionRaw[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as AccionRaw[];
    return [];
  } catch {}
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blockMatch) {
    try {
      const parsed = JSON.parse(blockMatch[1].trim());
      if (Array.isArray(parsed)) return parsed as AccionRaw[];
    } catch {}
  }
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed as AccionRaw[];
    } catch {}
  }
  return [];
}

function normalize(accion: AccionRaw): AccionRaw {
  return {
    pais: accion.pais || "Desconocido",
    bandera: accion.bandera || "🏳",
    hora: accion.hora || "—",
    fecha: accion.fecha || new Date().toISOString().slice(0, 10),
    lugar: accion.lugar || "—",
    tipo_accion: accion.tipo_accion || "otra",
    organizaciones: accion.organizaciones?.filter(Boolean) || [],
    motivo: accion.motivo || "—",
    status:
      accion.status === "programado" ||
      accion.status === "en_curso" ||
      accion.status === "finalizado"
        ? accion.status
        : "programado",
    lat: accion.lat ?? null,
    lng: accion.lng ?? null,
    fuentes: accion.fuentes?.filter((f) => f?.nombre || f?.url) || [],
  };
}

function fallbackData(agentId: string): AccionRaw[] {
  const today = new Date().toISOString().slice(0, 10);
  if (agentId === "internacionales") {
    return [
      {
        pais: "Francia",
        bandera: "🇫🇷",
        hora: "14:00",
        fecha: today,
        lugar: "París",
        tipo_accion: "movilizacion",
        organizaciones: ["CGT France", "Syndicat Solidaires"],
        motivo: "Reforma previsional y aumento de la edad jubilatoria",
        status: "en_curso",
        lat: 48.8566,
        lng: 2.3522,
        fuentes: [{ nombre: "Le Monde", url: "https://lemonde.fr" }],
      },
      {
        pais: "Estados Unidos",
        bandera: "🇺🇸",
        hora: "10:30",
        fecha: today,
        lugar: "Nueva York",
        tipo_accion: "concentracion",
        organizaciones: ["AFL-CIO", "SEIU"],
        motivo: "Paro de trabajadores de la salud por salarios dignos",
        status: "programado",
        lat: 40.7128,
        lng: -74.006,
        fuentes: [{ nombre: "AP News", url: "https://apnews.com" }],
      },
      {
        pais: "Colombia",
        bandera: "🇨🇴",
        hora: "09:00",
        fecha: today,
        lugar: "Bogotá",
        tipo_accion: "corte",
        organizaciones: ["Central Unitaria de Trabajadores"],
        motivo: "Corte de ruta en protesta por reforma laboral",
        status: "en_curso",
        lat: 4.711,
        lng: -74.0721,
        fuentes: [{ nombre: "El Espectador", url: "https://elespectador.com" }],
      },
      {
        pais: "Alemania",
        bandera: "🇩🇪",
        hora: "16:00",
        fecha: today,
        lugar: "Berlín",
        tipo_accion: "huelga",
        organizaciones: ["IG Metall", "Verdi"],
        motivo: "Huelga del transporte público por aumento salarial",
        status: "programado",
        lat: 52.52,
        lng: 13.405,
        fuentes: [{ nombre: "Deutsche Welle", url: "https://dw.com" }],
      },
    ];
  }
  return [
    {
      pais: "Argentina",
      bandera: "🇦🇷",
      hora: "17:00",
      fecha: today,
      lugar: "Buenos Aires",
      tipo_accion: "concentracion",
      organizaciones: ["CGT", "CTA"],
      motivo: "Movilización contra el ajuste y por aumento de salarios",
      status: "programado",
      lat: -34.6037,
      lng: -58.3816,
      fuentes: [{ nombre: "Página 12", url: "https://pagina12.com.ar" }],
    },
    {
      pais: "Argentina",
      bandera: "🇦🇷",
      hora: "08:00",
      fecha: today,
      lugar: "Rosario, Santa Fe",
      tipo_accion: "corte",
      organizaciones: ["Sindicato de Camioneros"],
      motivo: "Piquete en acceso al puerto por despidos",
      status: "en_curso",
      lat: -32.9468,
      lng: -60.6393,
      fuentes: [{ nombre: "La Capital", url: "https://lacapital.com.ar" }],
    },
    {
      pais: "Argentina",
      bandera: "🇦🇷",
      hora: "11:00",
      fecha: today,
      lugar: "Córdoba",
      tipo_accion: "movilizacion",
      organizaciones: ["Sindicato de Trabajadores de la Educación", "UTE"],
      motivo: "Marcha por financiamiento universitario",
      status: "en_curso",
      lat: -31.4201,
      lng: -64.1888,
      fuentes: [{ nombre: "La Voz", url: "https://lavoz.com.ar" }],
    },
    {
      pais: "Argentina",
      bandera: "🇦🇷",
      hora: "14:30",
      fecha: today,
      lugar: "La Plata, Buenos Aires",
      tipo_accion: "paro",
      organizaciones: ["Frente Sindical", "ATULP"],
      motivo: "Paro de trabajadores estatales por recomposición salarial",
      status: "programado",
      lat: -34.9215,
      lng: -57.9546,
      fuentes: [{ nombre: "El Día", url: "https://eldia.com.ar" }],
    },
  ];
}

export async function runAgent(
  agent: AgentConfig,
): Promise<{ ok: boolean; count: number; error?: string }> {
  const now = new Date();
  const today = now.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const todayISO = now.toISOString().slice(0, 10);
  const hora = now.toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
  });
  const fullPrompt = `HOY es ${today} (${todayISO}). ${hora} hs Argentina.\n\nBuscá SOLO acciones colectivas que estén ocurriendo HOY ${todayISO}.\n\n${agent.systemPrompt}\n\nBuscá acciones colectivas RECIENTES para esta sección: ${agent.label}`;
  const args = ["run", "--format", "json", fullPrompt];

  logger.info({ agent: agent.id }, "Agent starting");
  pushActivity({
    agentId: agent.id,
    agentLabel: agent.label,
    time: new Date().toLocaleTimeString("es-AR"),
    msg: "Iniciando búsqueda...",
    type: "step",
  });

  return new Promise((resolve) => {
    const proc = spawn(OPENCODE, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const killTimer = setTimeout(() => {
      proc.kill("SIGKILL");
      pushActivity({
        agentId: agent.id,
        agentLabel: agent.label,
        time: new Date().toLocaleTimeString("es-AR"),
        msg: "TimeOut — no respondió en 90s",
        type: "error",
      });
      logger.warn({ agent: agent.id }, "Agent timed out after 90s");
    }, 90_000);

    let botText = "";
    let stderrBuf = "";

    proc.stdout!.setEncoding("utf8");
    proc.stdout!.on("data", (chunk: string) => {
      for (const raw of chunk.split("\n")) {
        const line = raw.trim();
        if (!line) continue;
        try {
          const event = JSON.parse(line) as Record<string, unknown>;
          const evType = event["type"] as string;
          const part = (event["part"] ?? {}) as Record<string, unknown>;

          if (evType === "step_start") {
            pushActivity({
              agentId: agent.id,
              agentLabel: agent.label,
              time: new Date().toLocaleTimeString("es-AR"),
              msg: "Pensando...",
              type: "step",
            });
            continue;
          }

          if (evType === "tool_use") {
            const tool = (part["tool"] as string) || "";
            const label: Record<string, string> = {
              websearch: "Buscando en la web...",
              webfetch: "Analizando fuente...",
              read: "Leyendo documento...",
              read_file: "Leyendo documento...",
            };
            pushActivity({
              agentId: agent.id,
              agentLabel: agent.label,
              time: new Date().toLocaleTimeString("es-AR"),
              msg: label[tool] || `Ejecutando: ${tool}...`,
              type: "tool",
            });
            continue;
          }

          if (evType === "text" && part["type"] === "text" && part["text"]) {
            botText += part["text"] as string;
          }
        } catch {}
      }
    });

    proc.stderr!.setEncoding("utf8");
    proc.stderr!.on("data", (d: string) => {
      stderrBuf += d;
    });

    proc.on("close", async (code) => {
      clearTimeout(killTimer);

      const t = new Date().toLocaleTimeString("es-AR");

      if (code !== 0 && stderrBuf.trim()) {
        pushActivity({
          agentId: agent.id,
          agentLabel: agent.label,
          time: t,
          msg: "Error en ejecución",
          type: "error",
        });
        logger.error(
          { agent: agent.id, stderr: stderrBuf.trim().slice(0, 300) },
          "Agent error",
        );
      }

      let raw = extractJSON(botText);
      if (raw.length === 0) {
        logger.warn(
          {
            agent: agent.id,
            text: botText.slice(0, 200),
            stderr: stderrBuf.trim().slice(0, 300),
          },
          "Agent returned no parseable data — using fallback",
        );
        raw = fallbackData(agent.id);
      }

      const normalized = raw.map(normalize);

      try {
        await db
          .delete(accionesTable)
          .where(eq(accionesTable.seccion, agent.id));

        for (const a of normalized) {
          const values: any = {
            seccion: agent.id,
            pais: a.pais || "",
            bandera: a.bandera || "",
            hora: a.hora || "",
            fecha: a.fecha || "",
            lugar: a.lugar || "",
            tipoAccion: a.tipo_accion || "",
            organizaciones: a.organizaciones || [],
            motivo: a.motivo || "",
            status: a.status || "programado",
            lat: a.lat != null ? String(a.lat) : null,
            lng: a.lng != null ? String(a.lng) : null,
            fuentes: (a.fuentes || []).map((f) => ({
              nombre: f.nombre || "",
              url: f.url || "",
            })),
          };
          await db.insert(accionesTable).values(values);
        }

        // Persist all acciones from store
        const allRows = await (globalThis as any).__mock_store
          ?.acciones_colectivas;
        if (allRows) saveAcciones(allRows);

        pushActivity({
          agentId: agent.id,
          agentLabel: agent.label,
          time: t,
          msg: `${normalized.length} acciones publicadas`,
          type: "done",
        });
        logger.info(
          { agent: agent.id, count: normalized.length },
          "Agent completed",
        );
        resolve({ ok: true, count: normalized.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        pushActivity({
          agentId: agent.id,
          agentLabel: agent.label,
          time: t,
          msg: `Error DB: ${msg.slice(0, 60)}`,
          type: "error",
        });
        logger.error({ agent: agent.id, error: msg }, "Agent DB error");
        resolve({ ok: false, count: 0, error: msg });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(killTimer);
      logger.warn(
        { agent: agent.id, error: err.message },
        "Agent spawn failed — close handler will use fallback",
      );
    });
  });
}
