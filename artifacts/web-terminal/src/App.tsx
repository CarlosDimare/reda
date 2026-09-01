import { useEffect, useCallback, useState, useMemo } from "react";

const SERIF = 'Georgia,"Times New Roman",serif';
const SANS = 'Arial,Helvetica,sans-serif';

function useClock(): string {
  const fmt = () =>
    new Date().toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

interface Fuente {
  nombre: string;
  url: string;
}

interface Accion {
  id: number | string;
  seccion: string;
  pais: string;
  bandera: string;
  hora: string;
  fecha: string;
  lugar: string;
  tipoAccion: string;
  organizaciones: string[];
  motivo: string;
  status: string;
  lat: string | number | null;
  lng: string | number | null;
  fuentes: Fuente[];
  createdAt: string;
  updatedAt: string;
}

type PortalTab = "internacionales" | "protestas_ar";

const TIPO_ICONOS: Record<string, string> = {
  movilizacion: "✊",
  manifestacion: "✊",
  marcha: "✊",
  huelga: "⚒️",
  paro: "🚫",
  concentracion: "📍",
  planton: "⛺",
  toma: "🏴",
  corte: "🚧",
  escrache: "📢",
};

const TIPO_LABEL: Record<string, string> = {
  movilizacion: "movilización",
  manifestacion: "manifestación",
  marcha: "marcha",
  huelga: "huelga",
  paro: "paro",
  concentracion: "concentración",
  planton: "plantón",
  toma: "toma",
  corte: "corte",
  escrache: "escrache",
};

const STATUS_COLOR: Record<string, string> = {
  en_curso: "#d4a017",
  finalizado: "#cc0000",
  programado: "#3a9a3a",
};

const STATUS_LABEL: Record<string, string> = {
  en_curso: "EN CURSO",
  finalizado: "FINALIZADO",
  programado: "PROGRAMADO",
};

function isInternacionalSeccion(s: string): boolean {
  return (
    s === "internacionales" ||
    s === "internacional" ||
    s === "protestas_int" ||
    s === "int"
  );
}

function normalizeHora(h: string | undefined | null): string {
  if (!h) return "—";
  const trimmed = String(h).trim();
  if (trimmed === "" || trimmed === "—") return "—";
  const m = trimmed.match(/^(\d{1,2})[:.](\d{2})$/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return "—";
}

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body { margin: 0; padding: 0; background: #fafafa; color: #111; font-family: Georgia, "Times New Roman", serif; }
  .flag { font-family: 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cc0000; border-radius: 3px; }
  @media (max-width: 720px) {
    .nav-clock { display: none !important; }
    .col-tipo, .col-org { display: none !important; }
    .col-status { width: 80px !important; font-size: 9px !important; }
    .col-lugar { min-width: 0 !important; flex: 1 !important; }
    .row-card { flex-wrap: wrap; }
    .row-card .col-hora { width: 70px; }
    .row-card .col-lugar { width: calc(100% - 80px); }
    .row-card .col-tipo-mobile { display: inline-flex !important; width: auto; margin-top: 4px; }
    .row-card .col-status { width: 100%; text-align: left !important; margin-top: 4px; }
    .table-header { font-size: 9px !important; padding: 8px 10px !important; }
  }
`;

export default function App() {
  const clock = useClock();
  const [portalTab, setPortalTab] = useState<PortalTab>("internacionales");
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [selectedAccion, setSelectedAccion] = useState<Accion | null>(null);
  const [portalDetailOpen, setPortalDetailOpen] = useState(false);

  const DATA_URL =
    "https://cdn.jsdelivr.net/gh/CarlosDimare/reda@main/data/acciones.json";

  const fetchAcciones = useCallback(async () => {
    try {
      const r = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (r.ok) {
        const data = (await r.json()) as Accion[];
        setAcciones(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAcciones();
    const id = setInterval(fetchAcciones, 60000);
    return () => clearInterval(id);
  }, [fetchAcciones]);

  const filtered = useMemo(() => {
    const list = acciones
      .filter((a) =>
        portalTab === "internacionales"
          ? isInternacionalSeccion(a.seccion)
          : a.seccion === portalTab,
      )
      .map((a) => ({ ...a, hora: normalizeHora(a.hora) }));
    return list.sort((a, b) => {
      if (a.hora === "—" && b.hora !== "—") return 1;
      if (b.hora === "—" && a.hora !== "—") return -1;
      return a.hora.localeCompare(b.hora);
    });
  }, [acciones, portalTab]);

  const openPortalDetail = useCallback((a: Accion) => {
    setSelectedAccion(a);
    setPortalDetailOpen(true);
  }, []);

  const lastUpdate = useMemo(() => {
    if (acciones.length === 0) return "—";
    const ts = Math.max(
      ...acciones.map((a) => new Date(a.updatedAt).getTime()),
    );
    if (!Number.isFinite(ts)) return "—";
    return new Date(ts).toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, [acciones]);

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100dvh",
        background: "#fafafa",
        display: "flex",
        flexDirection: "column",
        fontFamily: SERIF,
      }}
    >
      {/* NAV */}
      <nav
        style={{
          flexShrink: 0,
          background: "#fff",
          borderBottom: "3px solid #cc0000",
          display: "flex",
          alignItems: "center",
          height: 48,
          padding: "0 12px",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 6,
            alignSelf: "stretch",
            background: "#cc0000",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            background: "#cc0000",
            color: "#fff",
            fontSize: 14,
            fontWeight: 900,
            transform: "rotate(45deg)",
            flexShrink: 0,
          }}
        >
          <span style={{ transform: "rotate(-45deg)" }}>✦</span>
        </div>
        <span
          style={{
            color: "#cc0000",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          ◉ PROTESTAS
        </span>
        <div
          className="nav-clock"
          style={{
            marginLeft: 16,
            fontSize: 11,
            color: "#999",
            fontFamily: SANS,
            whiteSpace: "nowrap",
          }}
        >
          Última actualización: {lastUpdate}
        </div>
        <div
          className="nav-clock"
          style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
        >
          <span
            style={{
              color: "#cc0000",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".06em",
            }}
          >
            {clock}
          </span>
        </div>
      </nav>

      {/* PORTAL */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          background: "#fff",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e5e5e5",
            flexShrink: 0,
          }}
        >
          {(
            [
              { id: "internacionales", label: "🌍 INTERNACIONAL" },
              { id: "protestas_ar", label: "🇦🇷 NACIONAL" },
            ] as { id: PortalTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPortalTab(tab.id)}
              style={{
                flex: 1,
                padding: "10px 8px",
                border: "none",
                cursor: "pointer",
                background: portalTab === tab.id ? "#cc0000" : "transparent",
                color: portalTab === tab.id ? "#fff" : "#999",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                fontFamily: SERIF,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 14,
            padding: "6px 14px",
            borderBottom: "1px solid #e5e5e5",
            flexShrink: 0,
            fontSize: 11,
            color: "#888",
            letterSpacing: ".05em",
            flexWrap: "wrap",
          }}
        >
          <span>🟢 programado</span>
          <span>🟡 en curso</span>
          <span>🔴 finalizado</span>
          <span style={{ marginLeft: "auto", color: "#aaa" }}>
            {filtered.length} acciones
          </span>
        </div>

        {/* Header row */}
        <div
          className="table-header"
          style={{
            display: "flex",
            padding: "10px 14px",
            borderBottom: "2px solid #cc0000",
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 700,
            color: "#cc0000",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            background: "#fafafa",
            fontFamily: SANS,
          }}
        >
          <span style={{ width: 64, flexShrink: 0 }}>HORA</span>
          <span style={{ minWidth: 140, flex: 2 }}>LUGAR</span>
          <span
            className="col-tipo"
            style={{ width: 130, flexShrink: 0 }}
          >
            TIPO
          </span>
          <span
            className="col-org"
            style={{ minWidth: 180, flex: 2 }}
          >
            ORGANIZACIONES
          </span>
          <span
            className="col-status"
            style={{ width: 90, flexShrink: 0, textAlign: "right" }}
          >
            STATUS
          </span>
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#999",
                fontSize: 10,
                letterSpacing: ".12em",
                textTransform: "uppercase",
              }}
            >
              Sin acciones registradas
            </div>
          )}
          {filtered.map((a) => {
            const statusColor = STATUS_COLOR[a.status] || "#3a9a3a";
            const statusLabel = STATUS_LABEL[a.status] || "PROGRAMADO";
            const tipoIcon =
              TIPO_ICONOS[a.tipoAccion.toLowerCase()] || "📢";
            const tipoLabel =
              TIPO_LABEL[a.tipoAccion.toLowerCase()] || a.tipoAccion;
            return (
              <div
                key={String(a.id)}
                onClick={() => openPortalDetail(a)}
                className="row-card"
                style={{
                  display: "flex",
                  padding: "10px 14px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#222",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  transition: "background .1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#fff5f5")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#fff")
                }
              >
                <span
                  className="col-hora"
                  style={{
                    width: 64,
                    flexShrink: 0,
                    color: statusColor,
                    fontWeight: 700,
                    fontSize: 16,
                    fontFamily: SANS,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {a.hora}
                </span>
                <span
                  className="col-lugar"
                  style={{
                    minWidth: 140,
                    flex: 2,
                    color: "#333",
                    lineHeight: 1.4,
                    fontFamily: SANS,
                    fontSize: 14,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={`${a.bandera} ${a.lugar}`}
                >
                  <span className="flag">{a.bandera}</span>{" "}
                  <strong style={{ color: "#111" }}>{a.pais}</strong>{" — "}
                  {a.lugar}
                </span>
                <span
                  className="col-tipo"
                  style={{
                    width: 130,
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      background: "#cc0000",
                      color: "#fff",
                      fontWeight: 700,
                      padding: "3px 8px",
                      fontSize: 11,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tipoIcon} {tipoLabel}
                  </span>
                </span>
                <span
                  className="col-org"
                  style={{
                    minWidth: 180,
                    flex: 2,
                    color: "#555",
                    lineHeight: 1.4,
                    fontSize: 13,
                    fontFamily: SANS,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                  title={a.organizaciones.join(", ")}
                >
                  {a.organizaciones.join(", ") || "—"}
                </span>
                <span
                  className="col-status"
                  style={{
                    width: 90,
                    flexShrink: 0,
                    textAlign: "right",
                    color: statusColor,
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: ".08em",
                  }}
                >
                  {statusLabel}
                </span>
                <span
                  className="col-tipo-mobile"
                  style={{ display: "none" }}
                >
                  <span
                    style={{
                      background: "#cc0000",
                      color: "#fff",
                      fontWeight: 700,
                      padding: "3px 8px",
                      fontSize: 11,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tipoIcon} {tipoLabel}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL */}
      {portalDetailOpen && selectedAccion && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            fontFamily: SERIF,
          }}
          onClick={() => setPortalDetailOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              border: "2px solid #cc0000",
              borderRadius: 4,
              maxWidth: 800,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 20px rgba(0,0,0,.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid #e5e5e5",
                flexShrink: 0,
                gap: 8,
              }}
            >
              <span
                style={{
                  color: "#cc0000",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: ".06em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <span className="flag">{selectedAccion.bandera}</span>{" "}
                {selectedAccion.pais} — {selectedAccion.lugar}
              </span>
              <button
                onClick={() => setPortalDetailOpen(false)}
                aria-label="Cerrar"
                style={{
                  background: "none",
                  border: "none",
                  color: "#cc0000",
                  cursor: "pointer",
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 20,
                fontFamily: SANS,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(110px, 140px) 1fr",
                  gap: "10px 16px",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {(
                  [
                    ["Hora", normalizeHora(selectedAccion.hora)],
                    ["Fecha", selectedAccion.fecha],
                    ["País", selectedAccion.pais],
                    ["Lugar", selectedAccion.lugar],
                    [
                      "Tipo",
                      `${
                        TIPO_ICONOS[selectedAccion.tipoAccion.toLowerCase()] ||
                        "📢"
                      } ${
                        TIPO_LABEL[selectedAccion.tipoAccion.toLowerCase()] ||
                        selectedAccion.tipoAccion
                      }`,
                    ],
                    [
                      "Status",
                      `${
                        selectedAccion.status === "en_curso"
                          ? "🟡"
                          : selectedAccion.status === "finalizado"
                            ? "🔴"
                            : "🟢"
                      } ${STATUS_LABEL[selectedAccion.status] || "PROGRAMADO"}`,
                    ],
                    [
                      "Organizaciones",
                      selectedAccion.organizaciones.join(", ") || "—",
                    ],
                    ["Motivo", selectedAccion.motivo],
                  ] as [string, string][]
                ).map(([label, val]) => (
                  <Row key={label} label={label} value={val} />
                ))}
              </div>

              {selectedAccion.fuentes.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    borderTop: "1px solid #e5e5e5",
                    paddingTop: 12,
                  }}
                >
                  <div
                    style={{
                      color: "#888",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Fuentes
                  </div>
                  {selectedAccion.fuentes.map((f, i) => (
                    <div key={i} style={{ marginBottom: 6, wordBreak: "break-all" }}>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#cc0000",
                          fontSize: 13,
                          textDecoration: "underline",
                        }}
                      >
                        {f.nombre || f.url}
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {selectedAccion.lat && selectedAccion.lng && (
                <div
                  style={{
                    marginTop: 16,
                    borderTop: "1px solid #e5e5e5",
                    paddingTop: 12,
                  }}
                >
                  <div
                    style={{
                      color: "#888",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Mapa
                  </div>
                  <div
                    style={{
                      position: "relative",
                      paddingBottom: "56.25%",
                      height: 0,
                      overflow: "hidden",
                      borderRadius: 4,
                    }}
                  >
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(selectedAccion.lng) - 0.1},${Number(selectedAccion.lat) - 0.1},${Number(selectedAccion.lng) + 0.1},${Number(selectedAccion.lat) + 0.1}&layer=mapnik&marker=${selectedAccion.lat},${selectedAccion.lng}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        border: "1px solid #ddd",
                      }}
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{STYLES}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span
        style={{
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          fontSize: 10,
          fontWeight: 700,
          alignSelf: "start",
          paddingTop: 2,
        }}
      >
        {label}
      </span>
      <span style={{ color: "#222", fontSize: 14, wordBreak: "break-word" }}>
        {value}
      </span>
    </>
  );
}
