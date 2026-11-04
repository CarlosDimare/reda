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

interface FuenteObj {
  nombre?: string;
  url: string;
}
type Fuente = FuenteObj | string;

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

type PortalTab = "nacional" | "internacionales";

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

const isInternacionalSeccion = (s?: string): boolean => {
  if (!s) return false;
  const val = String(s).toLowerCase().trim();
  return (
    val === "internacionales" ||
    val === "internacional" ||
    val === "protestas_int" ||
    val === "int" ||
    val.includes("internac")
  );
};

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
  html, body, #root { min-height: 100%; }
  body { margin: 0; padding: 0; background: #fafafa; color: #111; font-family: Georgia, "Times New Roman", serif; }
  .flag { font-family: 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cc0000; border-radius: 3px; }
  @media (max-width: 720px) {
    .nav-clock { display: none !important; }
        .col-tipo, .col-org { display: flex !important; }
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
  const [portalTab, setPortalTab] = useState<PortalTab>("nacional");
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [selectedAccion, setSelectedAccion] = useState<Accion | null>(null);
  const [portalDetailOpen, setPortalDetailOpen] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);

  const DATA_URL =
    import.meta.env.BASE_URL + "data/acciones.json";

  const fetchAcciones = useCallback(async () => {
    try {
      const r = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (r.ok) {
        const data = (await r.json()) as Accion[];
        setAcciones(Array.isArray(data) ? data : []);
      } else {
        try {
          const r2 = await fetch(`${import.meta.env.BASE_URL}data/acciones.json`);
          if (r2.ok) {
            const data = (await r2.json()) as Accion[];
            setAcciones(Array.isArray(data) ? data : []);
          }
        } catch {}
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAcciones();
    const id = setInterval(fetchAcciones, 60000);
    return () => clearInterval(id);
  }, [fetchAcciones]);

  const todayISO = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (showHistorial) {
      const list = acciones
        .filter((a) => {
          const f = a.fecha || a.updatedAt || a.createdAt || "";
          const d = f.slice(0, 10);
          return d < todayISO;
        })
        .map((a) => ({ ...a, hora: normalizeHora(a.hora) }));
      return list.sort((a, b) => {
        const da = new Date(a.fecha || a.updatedAt || a.createdAt).getTime();
        const db = new Date(b.fecha || b.updatedAt || b.createdAt).getTime();
        if (db !== da) return db - da;
        if (a.hora === "—" && b.hora !== "—") return 1;
        if (b.hora === "—" && a.hora !== "—") return -1;
        return a.hora.localeCompare(b.hora);
      });
    }
    const list = acciones
      .filter((a) => {
        if (portalTab === "internacionales") {
          return isInternacionalSeccion(a.seccion);
        }
        return (
          String(a.seccion).toLowerCase() === "protestas_ar" ||
          String(a.seccion).toLowerCase() === "nacional"
        );
      })
      .map((a) => ({ ...a, hora: normalizeHora(a.hora) }));
    return list.sort((a, b) => {
      if (a.hora === "—" && b.hora !== "—") return 1;
      if (b.hora === "—" && a.hora !== "—") return -1;
      return a.hora.localeCompare(b.hora);
    });
  }, [acciones, portalTab, showHistorial, todayISO]);

  const toggleHistorial = () => {
    setShowHistorial((prev) => !prev);
    if (!showHistorial) setPortalTab("nacional");
  };

  const openPortalDetail = useCallback((a: Accion) => {
    setSelectedAccion(a);
    setPortalDetailOpen(true);
  }, []);

  const lastUpdate = useMemo(() => {
    if (acciones.length === 0) return "—";
    const ts = Math.max(
      ...acciones
        .map((a) => {
          const t = a.updatedAt || a.createdAt || "";
          const d = new Date(t).getTime();
          return Number.isFinite(d) ? d : 0;
        })
        .filter((v) => v > 0),
    );
    if (!Number.isFinite(ts) || ts === 0) return "—";
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
              { id: "nacional", label: "🇦🇷 NACIONAL" },
              { id: "internacionales", label: "🌍 INTERNACIONAL" },
            ] as { id: PortalTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setPortalTab(tab.id);
                setShowHistorial(false);
              }}
              style={{
                flex: 1,
                padding: "10px 8px",
                border: "none",
                cursor: "pointer",
                background:
                  portalTab === tab.id && !showHistorial ? "#cc0000" : "transparent",
                color:
                  portalTab === tab.id && !showHistorial ? "#fff" : "#999",
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

        {/* Botón independiente de Historial */}
        <div
          style={{
            padding: "8px 14px",
            borderBottom: "1px solid #e5e5e5",
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={toggleHistorial}
            style={{
              padding: "6px 16px",
              border: "1px solid #cc0000",
              borderRadius: 4,
              cursor: "pointer",
              background: showHistorial ? "#cc0000" : "transparent",
              color: showHistorial ? "#fff" : "#cc0000",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              fontFamily: SERIF,
            }}
          >
            {showHistorial ? "◀ VOLVER" : "📁 HISTORIAL"}
          </button>
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

        {/* Cards container */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
            padding: 16,
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: 60,
                color: "#999",
                fontSize: 12,
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
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderLeft: `4px solid ${statusColor}`,
                  borderRadius: 8,
                  padding: 14,
                  cursor: "pointer",
                  transition: "all .2s",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.08)";
                  e.currentTarget.style.borderColor = "#ddd";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "#eee";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span className="flag" style={{ fontSize: 18 }}>
                    {a.bandera}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#111",
                      fontFamily: SANS,
                    }}
                  >
                    {a.pais}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      fontWeight: 700,
                      color: statusColor,
                      fontFamily: SANS,
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#111",
                    fontFamily: SANS,
                    lineHeight: 1.3,
                  }}
                >
                  {a.lugar}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: "#cc0000",
                      color: "#fff",
                      fontWeight: 700,
                      padding: "4px 10px",
                      fontSize: 11,
                      borderRadius: 4,
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                    }}
                  >
                    {tipoIcon} {tipoLabel}
                  </span>
                  <span
                    style={{
                      background: "#f3f3f3",
                      color: "#666",
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 4,
                      fontFamily: SANS,
                    }}
                  >
                    {a.hora !== "—" ? a.hora : "Sin hora"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#555",
                    lineHeight: 1.5,
                    fontFamily: SANS,
                    marginTop: 6,
                  }}
                >
                  {a.organizaciones.join(", ") || "—"}
                </div>
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
                <span className="flag" style={{ fontSize: 16 }}>{selectedAccion.bandera}</span>{" "}
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
              {selectedAccion.fuentes.map((f, i) => {
                const url = typeof f === "string" ? f : f.url;
                const nombre = typeof f === "string" ? f : f.nombre || f.url;
                return (
                  <div key={i} style={{ marginBottom: 6, wordBreak: "break-all" }}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#cc0000",
                        fontSize: 13,
                        textDecoration: "underline",
                      }}
                    >
                      {nombre}
                    </a>
                  </div>
                );
              })}
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
