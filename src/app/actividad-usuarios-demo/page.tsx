"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AuditoriaUsuarioDemo = {
  id: number;
  usuario_demo_id: number | null;
  usuario: string | null;
  nombre: string | null;
  rol: string | null;
  tipo_evento: string;
  ruta: string | null;
  pagina: string | null;
  accion: string | null;
  entidad_tipo: string | null;
  entidad_id: number | null;
  detalle: Record<string, unknown> | null;
  user_agent: string | null;
  created_at: string;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function clean(value: string | number | null | undefined, fallback = "—") {
  const text = String(value ?? "").trim();
  return text === "" ? fallback : text;
}

function label(value: string | null | undefined) {
  return clean(value).replaceAll("_", " ");
}

function eventoBadgeClass(value: string | null | undefined) {
  const normalizado = String(value ?? "").toLowerCase();

  if (normalizado === "login") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (normalizado === "logout") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (normalizado === "page_view") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (normalizado === "accion") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalizado === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function rolBadgeClass(value: string | null | undefined) {
  if (value === "superadmin") {
    return "border-purple-200 bg-purple-50 text-purple-800";
  }

  if (value === "direccion") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (value === "tecnico_sce") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (value === "intervencion") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (value === "consulta") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (value === "entidad_demo") {
    return "border-cyan-200 bg-cyan-50 text-cyan-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{detail}</p>
    </div>
  );
}

export default function ActividadUsuariosDemoPage() {
  const [rows, setRows] = useState<AuditoriaUsuarioDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const [seleccionado, setSeleccionado] =
    useState<AuditoriaUsuarioDemo | null>(null);

  async function loadActividad() {
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from("auditoria_usuarios_demo")
      .select(
        "id, usuario_demo_id, usuario, nombre, rol, tipo_evento, ruta, pagina, accion, entidad_tipo, entidad_id, detalle, user_agent, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (loadError) {
      setRows([]);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as AuditoriaUsuarioDemo[]);
    setLoading(false);
  }

  useEffect(() => {
    loadActividad();
  }, []);

  const usuarios = useMemo(() => {
    const mapa = new Map<string, string>();

    rows.forEach((row) => {
      const key = row.usuario || row.nombre || "sin_usuario";
      const value = row.nombre
        ? `${row.nombre} · ${row.usuario ?? "sin usuario"}`
        : key;

      mapa.set(key, value);
    });

    return Array.from(mapa.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "es")
    );
  }, [rows]);

  const eventos = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.tipo_evento))).sort();
  }, [rows]);

  const filtradas = useMemo(() => {
    return rows
      .filter((row) => {
        if (!filtroUsuario) return true;

        return (
          row.usuario === filtroUsuario ||
          row.nombre === filtroUsuario ||
          `${row.nombre ?? ""} · ${row.usuario ?? ""}`.includes(filtroUsuario)
        );
      })
      .filter((row) => {
        if (!filtroEvento) return true;
        return row.tipo_evento === filtroEvento;
      })
      .slice(0, pageSize);
  }, [rows, filtroUsuario, filtroEvento, pageSize]);

  const resumen = useMemo(() => {
    const total = rows.length;
    const logins = rows.filter((row) => row.tipo_evento === "login").length;
    const visitas = rows.filter((row) => row.tipo_evento === "page_view").length;
    const acciones = rows.filter((row) => row.tipo_evento === "accion").length;
    const usuariosUnicos = new Set(
      rows.map((row) => row.usuario || row.nombre).filter(Boolean)
    ).size;

    return {
      total,
      logins,
      visitas,
      acciones,
      usuariosUnicos,
    };
  }, [rows]);

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="border-b border-[#123052] bg-[#183B63] px-6 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-[22px] font-semibold leading-tight">
              Actividad de usuarios demo
            </h1>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-blue-100">
              Trazabilidad de accesos, navegación y acciones realizadas por los
              usuarios nominales de la demo institucional.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/dashboard"
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white hover:bg-white/15"
            >
              Dashboard
            </Link>
            <Link
              href="/usuarios-demo"
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white hover:bg-white/15"
            >
              Usuarios demo
            </Link>
            <button
              type="button"
              onClick={loadActividad}
              disabled={loading}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Recargando..." : "Recargar"}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4">
        <section className="grid gap-3 md:grid-cols-5">
          <Kpi
            label="Eventos"
            value={resumen.total}
            detail="registros de auditoría"
          />
          <Kpi
            label="Usuarios"
            value={resumen.usuariosUnicos}
            detail="usuarios con actividad"
          />
          <Kpi label="Logins" value={resumen.logins} detail="accesos registrados" />
          <Kpi
            label="Páginas"
            value={resumen.visitas}
            detail="visitas registradas"
          />
          <Kpi
            label="Acciones"
            value={resumen.acciones}
            detail="operaciones relevantes"
          />
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Registro de actividad
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Fuente: <span className="font-mono">public.auditoria_usuarios_demo</span>.
                Esta página mostrará actividad en cuanto el login y la navegación
                empiecen a registrar eventos.
              </p>
            </div>

            <div className="grid gap-2 md:grid-cols-3 lg:min-w-[620px]">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Usuario
                </label>
                <select
                  value={filtroUsuario}
                  onChange={(event) => setFiltroUsuario(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                >
                  <option value="">Todos</option>
                  {usuarios.map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Evento
                </label>
                <select
                  value={filtroEvento}
                  onChange={(event) => setFiltroEvento(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                >
                  <option value="">Todos</option>
                  {eventos.map((evento) => (
                    <option key={evento} value={evento}>
                      {label(evento)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Filas
                </label>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {messageForEmpty(loading, error, rows.length)}

          <div className="overflow-x-auto px-5 py-4">
            <table className="w-full min-w-[1180px] border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Usuario</th>
                  <th className="px-3 py-2 font-semibold">Rol</th>
                  <th className="px-3 py-2 font-semibold">Evento</th>
                  <th className="px-3 py-2 font-semibold">Ruta / página</th>
                  <th className="px-3 py-2 font-semibold">Acción</th>
                  <th className="px-3 py-2 font-semibold">Entidad</th>
                  <th className="px-3 py-2 text-right font-semibold">Detalle</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-xs text-slate-500"
                    >
                      Cargando actividad de usuarios...
                    </td>
                  </tr>
                ) : null}

                {!loading && filtradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-xs text-slate-500"
                    >
                      Todavía no hay actividad registrada con los filtros actuales.
                    </td>
                  </tr>
                ) : null}

                {!loading &&
                  filtradas.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 hover:bg-blue-50/60"
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-slate-950">
                          {formatDate(row.created_at)}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                          #{row.id}
                        </p>
                      </td>

                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-slate-950">
                          {clean(row.nombre, "Usuario no identificado")}
                        </p>
                        <p className="mt-0.5 font-mono text-[10.5px] text-slate-500">
                          {clean(row.usuario)}
                        </p>
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${rolBadgeClass(
                            row.rol
                          )}`}
                        >
                          {label(row.rol)}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${eventoBadgeClass(
                            row.tipo_evento
                          )}`}
                        >
                          {label(row.tipo_evento)}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        <p className="font-mono text-[11px] text-slate-800">
                          {clean(row.ruta)}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-slate-500">
                          {clean(row.pagina)}
                        </p>
                      </td>

                      <td className="px-3 py-2.5">
                        <p className="text-[11px] font-semibold text-slate-800">
                          {clean(row.accion)}
                        </p>
                      </td>

                      <td className="px-3 py-2.5">
                        <p className="text-[11px] text-slate-800">
                          {clean(row.entidad_tipo)}
                        </p>
                        <p className="mt-0.5 font-mono text-[10.5px] text-slate-500">
                          {row.entidad_id ? `#${row.entidad_id}` : "—"}
                        </p>
                      </td>

                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSeleccionado(row)}
                          className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-800 hover:bg-blue-100"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {seleccionado ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-4 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Detalle de actividad
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {clean(seleccionado.nombre, "Usuario no identificado")}
              </h2>
              <p className="mt-0.5 text-xs text-blue-100">
                {formatDate(seleccionado.created_at)} ·{" "}
                {label(seleccionado.tipo_evento)}
              </p>
            </div>

            <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
              <Info label="Usuario" value={clean(seleccionado.usuario)} />
              <Info label="Rol" value={label(seleccionado.rol)} />
              <Info label="Ruta" value={clean(seleccionado.ruta)} />
              <Info label="Página" value={clean(seleccionado.pagina)} />
              <Info label="Acción" value={clean(seleccionado.accion)} />
              <Info
                label="Entidad"
                value={`${clean(seleccionado.entidad_tipo)} ${
                  seleccionado.entidad_id ? `#${seleccionado.entidad_id}` : ""
                }`}
              />
              <div className="md:col-span-2">
                <Info
                  label="User agent"
                  value={clean(seleccionado.user_agent)}
                />
              </div>

              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Detalle técnico
                </p>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] leading-5 text-slate-700">
                  {JSON.stringify(seleccionado.detalle ?? {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setSeleccionado(null)}
                className="rounded-xl bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#102b49]"
              >
                Cerrar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-[12px] font-semibold leading-5 text-slate-900">
        {value}
      </p>
    </div>
  );
}

function messageForEmpty(
  loading: boolean,
  error: string | null,
  totalRows: number
) {
  if (loading) return null;

  if (error) {
    return (
      <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold leading-5 text-red-800">
        Error cargando actividad: {error}
      </div>
    );
  }

  if (totalRows === 0) {
    return (
      <div className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
        <p className="font-semibold">Todavía no hay eventos registrados.</p>
        <p className="mt-1">
          La tabla de auditoría ya está preparada. El siguiente paso es conectar
          el login y la navegación para registrar accesos y páginas visitadas.
        </p>
      </div>
    );
  }

  return null;
}