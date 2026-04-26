"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type OfertaRow = Record<string, any>;

type OfertaResumen = {
  acciones_total: number;
  acciones_af: number;
  acciones_cp: number;
  pendientes_ejecutar: number;
  en_ejecucion: number;
  en_ejecucion_con_incidencia: number;
  finalizadas_total: number;
  finalizadas_pendiente_justificacion: number;
  riesgo_reintegro: number;
  importe_concedido_total: number;
  importe_en_riesgo_total: number;
  importe_pendiente_ejecutar: number;
  incidencias_abiertas: number;
  requerimientos_pendientes: number;
  entidades_con_oferta: number;
  entidades_con_incidencias_o_riesgo: number;
};

function euro(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Number(value ?? 0));
}

function text(row: OfertaRow, keys: string[], fallback = "—") {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }
  return fallback;
}

function numberValue(row: OfertaRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function estadoClass(estado: string) {
  const normalizado = estado.toLowerCase();

  if (normalizado.includes("riesgo")) return "border-red-200 bg-red-50 text-red-800";
  if (normalizado.includes("incidencia")) return "border-amber-200 bg-amber-50 text-amber-800";
  if (normalizado.includes("justificacion")) return "border-slate-200 bg-slate-50 text-slate-700";
  if (normalizado.includes("pendiente")) return "border-blue-200 bg-blue-50 text-blue-800";
  if (normalizado.includes("ejecucion")) return "border-emerald-200 bg-emerald-50 text-emerald-800";

  return "border-slate-200 bg-white text-slate-700";
}

function Kpi({
  label,
  value,
  detail,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "blue" | "green" | "amber" | "red";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200 hover:border-red-400"
      : tone === "amber"
      ? "border-amber-200 hover:border-amber-400"
      : tone === "green"
      ? "border-emerald-200 hover:border-emerald-400"
      : tone === "blue"
      ? "border-blue-200 hover:border-blue-400"
      : "border-slate-200 hover:border-blue-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-white px-3 py-3 text-left shadow-sm transition ${toneClass}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
    </button>
  );
}

export default function OfertaFormativaPage() {
  const router = useRouter();

  const [rows, setRows] = useState<OfertaRow[]>([]);
  const [resumen, setResumen] = useState<OfertaResumen | null>(null);
  const [entidadFiltro, setEntidadFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOferta() {
      setLoading(true);
      setError(null);

      const [rowsRes, resumenRes] = await Promise.all([
        supabase.from("v_oferta_formativa_institucional").select("*").limit(1000),
        supabase.from("v_oferta_formativa_resumen_institucional").select("*").single(),
      ]);

      const firstError = rowsRes.error || resumenRes.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setRows((rowsRes.data ?? []) as OfertaRow[]);
      setResumen(resumenRes.data as OfertaResumen);
      setLoading(false);
    }

    loadOferta();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const estado = params.get("estado");
    const entidad = params.get("entidad");
    const tipo = params.get("tipo");

    if (estado) setEstadoFiltro(estado);
    if (entidad) setEntidadFiltro(entidad);
    if (tipo) setTipoFiltro(tipo.toUpperCase());
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [entidadFiltro, estadoFiltro, tipoFiltro, busqueda, pageSize]);

  const entidades = useMemo(() => {
    const mapa = new Map<string, string>();

    rows.forEach((row) => {
      const id = text(row, ["entidad_id"], "");
      const nombre = text(row, ["entidad_nombre", "entidad", "nombre_entidad"], "");
      if (id && nombre) mapa.set(id, nombre);
    });

    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [rows]);

  const estados = useMemo(() => {
    const set = new Set<string>();

    rows.forEach((row) => {
      const estado = text(
        row,
        ["estado_operativo_administrativo", "estado_operativo", "estado_ejecucion", "estado"],
        ""
      );

      if (estado) set.add(estado);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return rows.filter((row) => {
      const entidadId = text(row, ["entidad_id"], "");
      const estado = text(
        row,
        ["estado_operativo_administrativo", "estado_operativo", "estado_ejecucion", "estado"],
        ""
      );
      const tipo = text(row, ["tipo_oferta", "tipo", "tipo_accion"], "").toUpperCase();

      const textoBusqueda = [
        text(row, ["entidad_nombre", "entidad", "nombre_entidad"], ""),
        text(row, ["cif"], ""),
        text(row, ["codigo_accion", "codigo_administrativo"], ""),
        text(row, ["codigo_especialidad", "especialidad"], ""),
        text(row, ["denominacion", "nombre_accion", "nombre"], ""),
        text(row, ["familia_profesional", "familia"], ""),
        text(row, ["municipio", "entidad_municipio"], ""),
        text(row, ["isla", "entidad_isla"], ""),
      ]
        .join(" ")
        .toLowerCase();

      const pasaEntidad = entidadFiltro === "todos" || entidadId === entidadFiltro;
      const pasaEstado = estadoFiltro === "todos" || estado === estadoFiltro;
      const pasaTipo = tipoFiltro === "todos" || tipo === tipoFiltro;
      const pasaBusqueda = term === "" || textoBusqueda.includes(term);

      return pasaEntidad && pasaEstado && pasaTipo && pasaBusqueda;
    });
  }, [rows, entidadFiltro, estadoFiltro, tipoFiltro, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * pageSize;
  const fin = inicio + pageSize;
  const rowsPagina = filteredRows.slice(inicio, fin);

  function limpiarFiltros() {
    setEntidadFiltro("todos");
    setEstadoFiltro("todos");
    setTipoFiltro("todos");
    setBusqueda("");
    setPagina(1);
  }

  function abrirSubexpediente(row: OfertaRow) {
    const id = text(row, ["oferta_id", "id"], "");
    if (id) router.push(`/oferta-formativa/${id}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando oferta formativa concedida...</p>
        </section>
      </main>
    );
  }

  if (error || !resumen) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error cargando oferta formativa institucional
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se pudo cargar la información."}
          </pre>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold">Oferta formativa concedida</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Mesa de auditoría y fiscalización de subexpedientes AF/CP.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filteredRows.length)} acciones filtradas · {num(rows.length)} totales
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            ← Volver al dashboard
          </Link>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            Clic en una fila para abrir subexpediente
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-5">
          <Kpi
            label="Total acciones"
            value={num(resumen.acciones_total)}
            detail={`${num(resumen.acciones_af)} AF · ${num(resumen.acciones_cp)} CP`}
            onClick={limpiarFiltros}
          />
          <Kpi
            label="Pendientes ejecutar"
            value={num(resumen.pendientes_ejecutar)}
            detail={euro(resumen.importe_pendiente_ejecutar)}
            tone="blue"
            onClick={() => setEstadoFiltro("pendiente_ejecutar")}
          />
          <Kpi
            label="En ejecución"
            value={num(resumen.en_ejecucion)}
            detail="acciones sin incidencia crítica"
            tone="green"
            onClick={() => setEstadoFiltro("en_ejecucion")}
          />
          <Kpi
            label="Con incidencia"
            value={num(resumen.en_ejecucion_con_incidencia)}
            detail={`${num(resumen.incidencias_abiertas)} incidencias abiertas`}
            tone="amber"
            onClick={() => setEstadoFiltro("en_ejecucion_con_incidencia")}
          />
          <Kpi
            label="Riesgo reintegro"
            value={num(resumen.riesgo_reintegro)}
            detail={euro(resumen.importe_en_riesgo_total)}
            tone="red"
            onClick={() => setEstadoFiltro("riesgo_reintegro")}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.25fr_0.95fr_0.75fr_0.55fr_auto]">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, código, especialidad, denominación..."
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad / academia
              </label>
              <select
                value={entidadFiltro}
                onChange={(event) => setEntidadFiltro(event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todas las entidades</option>
                {entidades.map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </label>
              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Tipo
              </label>
              <select
                value={tipoFiltro}
                onChange={(event) => setTipoFiltro(event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                <option value="AF">AF</option>
                <option value="CP">CP</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
            <div>
              <h2 className="text-sm font-semibold">Acciones concedidas</h2>
              <p className="text-[11px] text-slate-500">
                Cada fila es un subexpediente fiscalizable. Clic para abrir detalle.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span>
                Página {num(paginaSegura)} de {num(totalPaginas)}
              </span>

              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px]"
              >
                <option value={25}>25 filas</option>
                <option value={50}>50 filas</option>
                <option value={100}>100 filas</option>
              </select>

              <button
                type="button"
                disabled={paginaSegura <= 1}
                onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={paginaSegura >= totalPaginas}
                onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="max-h-[560px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Código</th>
                  <th className="px-2 py-2">Entidad</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Especialidad</th>
                  <th className="px-2 py-2">Denominación</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2 text-right">Concedido</th>
                  <th className="px-2 py-2 text-right">Riesgo</th>
                  <th className="px-2 py-2 text-right">Inc.</th>
                  <th className="px-2 py-2 text-right">Req.</th>
                </tr>
              </thead>

              <tbody>
                {rowsPagina.map((row, index) => {
                  const estado = text(
                    row,
                    ["estado_operativo_administrativo", "estado_operativo", "estado_ejecucion", "estado"],
                    "sin estado"
                  );

                  const ofertaId = text(row, ["oferta_id", "id"], String(index));

                  return (
                    <tr
                      key={`${ofertaId}-${index}`}
                      onClick={() => abrirSubexpediente(row)}
                      className="cursor-pointer border-t border-slate-100 hover:bg-blue-50"
                    >
                      <td className="px-2 py-1.5 font-semibold text-slate-950">
                        {text(row, ["codigo_accion", "codigo_administrativo"])}
                      </td>
                      <td className="px-2 py-1.5">
                        <p className="font-medium text-slate-900">
                          {text(row, ["entidad_nombre", "entidad", "nombre_entidad"])}
                        </p>
                        <p className="text-[10px] text-slate-500">{text(row, ["cif"])}</p>
                      </td>
                      <td className="px-2 py-1.5">{text(row, ["tipo_oferta", "tipo", "tipo_accion"])}</td>
                      <td className="px-2 py-1.5 font-medium">
                        {text(row, ["codigo_especialidad", "especialidad"])}
                      </td>
                      <td className="max-w-[260px] px-2 py-1.5">
                        <p className="line-clamp-2 text-slate-700">
                          {text(row, ["denominacion", "nombre_accion", "nombre"])}
                        </p>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${estadoClass(estado)}`}>
                          {estado}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium">
                        {euro(numberValue(row, ["importe_concedido", "importe_total_concedido"]))}
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-red-700">
                        {euro(numberValue(row, ["importe_en_riesgo", "riesgo_economico"]))}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {num(numberValue(row, ["incidencias_abiertas"]))}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {num(numberValue(row, ["requerimientos_pendientes"]))}
                      </td>
                    </tr>
                  );
                })}

                {rowsPagina.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay acciones que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
