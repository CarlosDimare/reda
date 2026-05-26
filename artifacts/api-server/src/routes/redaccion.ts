import { Router } from "express";
import type { Request, Response } from "express";
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { db, redaccionAgentesTable, coberturasTable } from "@workspace/db";
import { saveCoberturas } from "../agents/persist";
import { eq } from "drizzle-orm";
import { getActivity, clearActivity } from "../agents/activity";

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

const router = Router();

// GET /api/redaccion
router.get("/redaccion", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(redaccionAgentesTable)
      .orderBy(redaccionAgentesTable.id);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// POST /api/redaccion
router.post("/redaccion", async (req: Request, res: Response) => {
  try {
    const { nombre, tareas, agenteId } = req.body as {
      nombre?: string;
      tareas?: string[];
      agenteId?: string | null;
    };
    const [row] = await db
      .insert(redaccionAgentesTable)
      .values({
        nombre: nombre || "Nuevo agente",
        tareas: tareas || [],
        agenteId: agenteId || null,
        activo: 1,
      })
      .returning();
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// PUT /api/redaccion/:id
router.put("/redaccion/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "invalid id" });
    }
    const { nombre, tareas, agenteId, activo } = req.body as {
      nombre?: string;
      tareas?: string[];
      agenteId?: string | null;
      activo?: number;
    };
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (nombre !== undefined) update.nombre = nombre;
    if (tareas !== undefined) update.tareas = tareas;
    if (agenteId !== undefined) update.agenteId = agenteId;
    if (activo !== undefined) update.activo = activo;

    const [row] = await db
      .update(redaccionAgentesTable)
      .set(update)
      .where(eq(redaccionAgentesTable.id, id))
      .returning();
    if (!row) {
      return res.status(404).json({ error: "not found" });
    }
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/redaccion/:id
router.delete("/redaccion/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "invalid id" });
    }
    const [row] = await db
      .delete(redaccionAgentesTable)
      .where(eq(redaccionAgentesTable.id, id))
      .returning();
    if (!row) {
      return res.status(404).json({ error: "not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// POST /api/redaccion/sembrar — seed default agents
router.post("/redaccion/sembrar", async (_req: Request, res: Response) => {
  try {
    const existing = await db.select().from(redaccionAgentesTable).limit(1);
    if (existing.length > 0) {
      return res.json({ ok: true, message: "already seeded" });
    }
    const defaults = [
      {
        nombre: "Corresponsal Internacional",
        tareas: [
          "Seguir conflictos activos",
          "Reportar cumbres diplomáticas",
          "Analizar geopolítica",
        ],
        agenteId: "internacionales",
        activo: 1,
      },
      {
        nombre: "Cronista Argentina",
        tareas: [
          "Cubrir protestas sociales",
          "Investigar medidas de gobierno",
          "Documentar movimientos sindicales",
        ],
        agenteId: "protestas_ar",
        activo: 1,
      },
      {
        nombre: "Editor de Datos",
        tareas: [
          "Verificar cifras",
          "Cruzar fuentes estadísticas",
          "Preparar infografías",
        ],
        agenteId: null,
        activo: 1,
      },
      {
        nombre: "Reportero de Campo",
        tareas: [
          "Entrevistas en terreno",
          "Cobertura de eventos",
          "Material audiovisual",
        ],
        agenteId: null,
        activo: 1,
      },
    ];
    for (const a of defaults) {
      await db.insert(redaccionAgentesTable).values(a);
    }
    return res.json({ ok: true, count: defaults.length });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// GET /api/redaccion/actividad — current agent activity + linked redaccion agents
router.get("/redaccion/actividad", async (_req: Request, res: Response) => {
  try {
    const raw = getActivity(50);
    const agentes = await db
      .select()
      .from(redaccionAgentesTable)
      .where(eq(redaccionAgentesTable.activo, 1))
      .orderBy(redaccionAgentesTable.id);
    return res.json({ actividad: raw, agentes });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

/* ── Ejecutar agente (investigar y publicar en coberturas) ────── */

// POST /api/redaccion/ejecutar/:id
router.post("/redaccion/ejecutar/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }

    const [agent] = await db
      .select()
      .from(redaccionAgentesTable)
      .where(eq(redaccionAgentesTable.id, id))
      .limit(1);

    if (!agent) {
      res.status(404).json({ error: "agent not found" });
      return;
    }

    const { tareaIndice } = req.body as { tareaIndice?: number };
    const tasks =
      tareaIndice !== undefined && agent.tareas[tareaIndice]
        ? [agent.tareas[tareaIndice]]
        : agent.tareas;

    const promptText = tasks.join(". ");

    const fullPrompt = `Sos un periodista de investigación del medio "CD" (Corresponsal Digital). Tu tarea específica es: ${promptText}

Instrucciones:
1. Buscá información actualizada en la web sobre este tema.
2. Redactá una nota periodística completa con: título, contexto, datos chequeados, fuentes citadas con [texto](url).
3. Incluí fechas, lugares, protagonistas y cifras verificables.
4. Si encontrás información relevante, usá el formato ::: cifra para destacar números importantes.
5. NO incluyas tuopinión personal ni editorialices.
6. Respondé ÚNICA Y EXCLUSIVAMENTE con el contenido de la nota. Sin explicaciones, sin "Claro", sin presentación.
7. La nota debe estar en español.`;

    const args = ["run", "--format", "json", fullPrompt];

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    const sendEvent = (type: string, data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    sendEvent("session", { session_id: `ejecutar-${id}` });

    const proc = spawn(OPENCODE, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let botText = "";
    let stderrBuf = "";

    const killTimer = setTimeout(() => {
      proc.kill("SIGKILL");
      sendEvent("error", { message: "El agente no respondió a tiempo (90s)" });
      sendEvent("done", {});
      res.end();
    }, 90_000);

    proc.stdout!.setEncoding("utf8");
    proc.stdout!.on("data", (chunk: string) => {
      for (const raw of chunk.split("\n")) {
        const line = raw.trim();
        if (!line) continue;
        try {
          const event = JSON.parse(line) as Record<string, unknown>;
          const evType = event["type"] as string;
          const part = (event["part"] ?? {}) as Record<string, unknown>;
          if (evType === "text" && part["type"] === "text" && part["text"]) {
            const text = part["text"] as string;
            botText += text;
            sendEvent("text", { text });
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

      if (code !== 0 && stderrBuf.trim()) {
        console.error(
          "Ejecutar agente stderr:",
          stderrBuf.trim().slice(0, 200),
        );
      }

      if (botText.trim()) {
        try {
          const titulo = tasks[0].slice(0, 120) || "Nota del agente";
          const [row] = await db
            .insert(coberturasTable)
            .values({
              titulo,
              contenido: botText.trim(),
              autor: agent.nombre,
              tags: [],
            })
            .returning();
          sendEvent("cobertura", { id: row.id, titulo: row.titulo });
          sendEvent("text", {
            text: `\n\n---\n✅ Nota publicada en Coberturas: "${titulo}"`,
          });
          const allCoberturas = (globalThis as any).__mock_store?.coberturas;
          if (allCoberturas) saveCoberturas(allCoberturas);
        } catch (err) {
          sendEvent("error", { message: "Error al guardar la cobertura" });
        }
      } else {
        sendEvent("error", { message: "El agente no produjo contenido" });
      }
      sendEvent("done", {});
      res.end();
    });

    proc.on("error", (err) => {
      clearTimeout(killTimer);
      sendEvent("error", { message: err.message });
      sendEvent("done", {});
      res.end();
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
