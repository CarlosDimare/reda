import { useEffect, useCallback, useState } from "react";

const MONO = '"Cascadia Code","Fira Code",Menlo,Consolas,monospace';
const SANS = '-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif';

function useClock(): string {
  const [time, setTime] = useState(() =>
    new Date().toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(
        new Date().toLocaleString("es-AR", {
          timeZone: "America/Argentina/Buenos_Aires",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

interface Fuente {
  nombre: string;
  url: string;
}

interface Accion {
  id: number;
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
  lat: string | null;
  lng: string | null;
  fuentes: Fuente[];
  createdAt: string;
  updatedAt: string;
}

type PortalTab = "internacionales" | "protestas_ar";

const STYLES = `
  *::-webkit-scrollbar { width: 4px; }
  *::-webkit-scrollbar-track { background: #0a0a0a; }
  *::-webkit-scrollbar-thumb { background: #cc0000; }
  body { margin: 0; padding: 0; background: #0a0a0a; color: #ccc; }
  strong { color: #fff; font-weight: 700; }
`;

export default function App() {
  const clock = useClock();
  const [portalTab, setPortalTab] = useState<PortalTab>("internacionales");
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [selectedAccion, setSelectedAccion] = useState<Accion | null>(null);
  const [portalDetailOpen, setPortalDetailOpen] = useState(false);

  const fetchAcciones = useCallback(async () => {
    try {
      const r = await fetch(`data/acciones.json?t=${Date.now()}`);
      if (r.ok) setAcciones(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchAcciones();
    const id = setInterval(fetchAcciones, 60000);
    return () => clearInterval(id);
  }, [fetchAcciones]);

  const openPortalDetail = useCallback((a: Accion) => {
    setSelectedAccion(a);
    setPortalDetailOpen(true);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: MONO,
      }}
    >
      {/* ════ NAV BAR ════ */}
      <nav
        style={{
          flexShrink: 0,
          background: "#0a0a0a",
          borderBottom: "3px solid #cc0000",
          display: "flex",
          alignItems: "center",
          height: 48,
        }}
      >
        <div style={{ width: 6, background: "#cc0000", flexShrink: 0 }} />
        <div
          style={{
            paddingLeft: 14,
            paddingRight: 18,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              background: "#cc0000",
              display: "grid",
              placeItems: "center",
              transform: "rotate(45deg)",
              flexShrink: 0,
              color: "#fff",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            ✦
          </div>
        </div>
        <span
          style={{
            color: "#cc0000",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            fontFamily: MONO,
          }}
        >
          ◉ PORTAL
        </span>
        <div style={{ marginLeft: "auto", paddingRight: 16 }}>
          <span
            style={{
              color: "#cc0000",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".06em",
              fontFamily: MONO,
            }}
          >
            {clock}
          </span>
        </div>
      </nav>

      {/* ════ PORTAL ════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
          fontFamily: MONO,
        }}
      >
        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            borderBottom: "2px solid #1a1a1a",
            flexShrink: 0,
          }}
        >
          {[
            { id: "internacionales" as const, label: "🌍 INTERNACIONAL" },
            { id: "protestas_ar" as const, label: "🇦🇷 NACIONAL" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPortalTab(tab.id)}
              style={{
                flex: 1,
                padding: "10px 0",
                border: "none",
                cursor: "pointer",
                background: portalTab === tab.id ? "#cc0000" : "transparent",
                color: portalTab === tab.id ? "#fff" : "#555",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".15em",
                textTransform: "uppercase",
                fontFamily: MONO,
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
            padding: "6px 12px",
            borderBottom: "1px solid #1a1a1a",
            flexShrink: 0,
            fontSize: 9,
            color: "#555",
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          <span>🟢 programado</span>
          <span>🟡 en curso</span>
          <span>🔴 finalizado</span>
        </div>

        {/* Table header */}
        <div
          style={{
            display: "flex",
            padding: "6px 12px",
            borderBottom: "2px solid #cc0000",
            flexShrink: 0,
            fontSize: 9,
            fontWeight: 700,
            color: "#cc0000",
            letterSpacing: ".1em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ width: 50, flexShrink: 0 }}>HORA</span>
          <span style={{ minWidth: 160, flex: 2 }}>LUGAR</span>
          <span style={{ width: 90, flexShrink: 0 }}>TIPO</span>
          <span style={{ minWidth: 140, flex: 1 }}>ORGANIZACIONES</span>
          <span style={{ minWidth: 140, flex: 1 }}>MOTIVO</span>
        </div>

        {/* Table rows */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {acciones.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#333",
                fontSize: 10,
                letterSpacing: ".12em",
                textTransform: "uppercase",
              }}
            >
              Sin acciones registradas
            </div>
          )}
          {acciones
            .filter((a) => a.seccion === portalTab)
            .map((a) => {
              const statusColor =
                a.status === "en_curso"
                  ? "#e8c030"
                  : a.status === "finalizado"
                    ? "#cc0000"
                    : "#3a9a3a";
              return (
                <div
                  key={a.id}
                  onClick={() => openPortalDetail(a)}
                  style={{
                    display: "flex",
                    padding: "8px 12px",
                    borderBottom: "1px solid #141414",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "#ccc",
                    alignItems: "flex-start",
                    transition: "background .1s",
                    gap: 4,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#111")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <span
                    style={{
                      width: 50,
                      flexShrink: 0,
                      color: statusColor,
                      fontWeight: 700,
                    }}
                  >
                    {a.hora}
                  </span>
                  <span
                    style={{
                      minWidth: 160,
                      flex: 2,
                      color: "#999",
                      lineHeight: 1.4,
                      fontFamily: SANS,
                    }}
                  >
                    {a.bandera} {a.lugar}
                  </span>
                  <span
                    style={{
                      width: 90,
                      flexShrink: 0,
                      textTransform: "uppercase",
                      fontSize: 9,
                      letterSpacing: ".08em",
                      lineHeight: 1.4,
                    }}
                  >
                    {a.tipoAccion}
                  </span>
                  <span style={{ minWidth: 140, flex: 1, lineHeight: 1.4 }}>
                    {a.organizaciones.join(", ")}
                  </span>
                  <span
                    style={{
                      minWidth: 140,
                      flex: 1,
                      color: "#888",
                      lineHeight: 1.4,
                    }}
                  >
                    {a.motivo}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* ════ PORTAL DETAIL MODAL ════ */}
      {portalDetailOpen && selectedAccion && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: MONO,
          }}
          onClick={() => setPortalDetailOpen(false)}
        >
          <div
            style={{
              background: "#111",
              border: "2px solid #cc0000",
              maxWidth: 700,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid #1a1a1a",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: "#cc0000",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                }}
              >
                {selectedAccion.bandera} {selectedAccion.lugar}
              </span>
              <button
                onClick={() => setPortalDetailOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr",
                  gap: "6px 12px",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#555", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Hora
                </span>
                <span style={{ color: "#d0d0d0" }}>
                  {selectedAccion.hora} hs
                </span>
                <span style={{ color: "#555", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Fecha
                </span>
                <span style={{ color: "#d0d0d0" }}>{selectedAccion.fecha}</span>
                <span style={{ color: "#555", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Lugar
                </span>
                <span style={{ color: "#d0d0d0" }}>
                  {selectedAccion.pais} — {selectedAccion.lugar}
                </span>
                <span style={{ color: "#555", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Tipo
                </span>
                <span style={{ color: "#d0d0d0", textTransform: "uppercase", fontSize: 10 }}>
                  {selectedAccion.tipoAccion}
                </span>
                <span style={{ color: "#555", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Status
                </span>
                <span
                  style={{
                    color:
                      selectedAccion.status === "en_curso"
                        ? "#e8c030"
                        : selectedAccion.status === "finalizado"
                          ? "#cc0000"
                          : "#3a9a3a",
                    textTransform: "uppercase",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {selectedAccion.status === "en_curso"
                    ? "🟡 EN CURSO"
                    : selectedAccion.status === "finalizado"
                      ? "🔴 FINALIZADO"
                      : "🟢 PROGRAMADO"}
                </span>
                <span style={{ color: "#555", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Organizaciones
                </span>
                <span style={{ color: "#d0d0d0" }}>
                  {selectedAccion.organizaciones.join(", ") || "—"}
                </span>
                <span style={{ color: "#555", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Motivo
                </span>
                <span style={{ color: "#d0d0d0" }}>
                  {selectedAccion.motivo}
                </span>
              </div>

              {selectedAccion.fuentes.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    borderTop: "1px solid #1a1a1a",
                    paddingTop: 12,
                  }}
                >
                  <div
                    style={{
                      color: "#555",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Fuentes
                  </div>
                  {selectedAccion.fuentes.map((f, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener"
                        style={{
                          color: "#4a9eff",
                          fontSize: 11,
                          textDecoration: "underline",
                          cursor: "pointer",
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
                    borderTop: "1px solid #1a1a1a",
                    paddingTop: 12,
                  }}
                >
                  <div
                    style={{
                      color: "#555",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: ".12em",
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
                        border: "1px solid #1a1a1a",
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
