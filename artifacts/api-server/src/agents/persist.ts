import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { logger } from "../lib/logger";

const DATA_DIR = resolve(process.cwd(), "data");
const ACCIONES_FILE = resolve(DATA_DIR, "acciones.json");
const COBERTURAS_FILE = resolve(DATA_DIR, "coberturas.json");

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function saveAcciones(acciones: any[]) {
  ensureDir();
  writeFileSync(ACCIONES_FILE, JSON.stringify(acciones, null, 2), "utf8");
  tryCommit(`${acciones.length} acciones colectivas`);
}

export function saveCoberturas(coberturas: any[]) {
  ensureDir();
  writeFileSync(COBERTURAS_FILE, JSON.stringify(coberturas, null, 2), "utf8");
  tryCommit(`${coberturas.length} coberturas`);
}

export function loadAcciones(): any[] {
  try {
    if (!existsSync(ACCIONES_FILE)) return [];
    return JSON.parse(readFileSync(ACCIONES_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function loadCoberturas(): any[] {
  try {
    if (!existsSync(COBERTURAS_FILE)) return [];
    return JSON.parse(readFileSync(COBERTURAS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function tryCommit(msg: string) {
  const token = process.env.GITHUB_TOKEN;
  try {
    execSync('git config user.name "CD Bot"', {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    execSync('git config user.email "bot@corresponsaldigital.ar"', {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    execSync("git add -A", { cwd: process.cwd(), stdio: "pipe" });
    execSync(`git commit -m "${msg.replace(/"/g, '\\"')}"`, {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    if (token) {
      execSync(
        `git push https://${token}@github.com/CarlosDimare/reda.git main`,
        {
          cwd: process.cwd(),
          stdio: "pipe",
        },
      );
    } else {
      execSync("git push", { cwd: process.cwd(), stdio: "pipe" });
    }
    logger.info(`Persisted: ${msg}`);
  } catch (e: any) {
    if (e.stderr?.includes("nothing to commit") || e.status === 0) return;
    logger.warn(
      { error: e.message?.slice(0, 120) },
      "Git commit skipped (non-fatal)",
    );
  }
}
