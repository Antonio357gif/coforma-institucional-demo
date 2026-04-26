"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type JustificacionRow = {
  id: number;
  oferta_id: number;
  entidad_id: number;
  tecnico_nombre: string | null;
  tecnico_unidad: string | null;
  importe_concedido: number | null;
  importe_ejecutado: number | null;
  importe_justificado: number | null;
  importe_pendiente_justificar: number | null;
  importe_no_admitido: number | null;
  importe_en_riesgo: number | null;
  estado_justificacion: string | null;
  decision_recomendada: string | null;
  prioridad_decision: string | null;
  motivo_decision: string | null;
  convocatoria_codigo: string | null;
  entidad_nombre: string | null;
  cif: string | null;
  codigo_accion: string | null;
  tipo_oferta: string | null;
  codigo_especialidad: string | null;
  denominacion: string | null;
  estado_ejecucion: string | null;
  alumnos_inicio: number | null;
  alumnos_activos: number | null;
  bajas: number | null;
  aptos: number | null;
  alerta: string | null;
  nivel_riesgo: string | null;
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

function pct(parte: number | null | undefined, total: number | null | undefined) {
  const p = Number(parte ?? 0);
  const t = Number(total ?? 0);
  if (!t) return "0 %";
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format((p / t) * 100)} %`;
}

function label(value: string | null | undefined) {
  return String(value ?? "—").replaceAll("_", " ");
}

function badgeClass(value: string | null | undefined) {
  const normalizado = String(value ?? "").toLowerCase();

  if (
    normalizado.includes("alta") ||
    normalizado.includes("riesgo") ||
    normalizado.includes("reintegro") ||
    normalizado.includes("revision")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    normalizado.includes("media") ||
    normalizado.includes("pendiente") ||
    normalizado.includes("parcial")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    normalizado.includes("total") ||
    normalizado.includes("validada") ||
    normalizado.includes("ordinario")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function Kpi({
  labelText,
  value,
  detail,
}: {
  labelText: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {labelText}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

export default function JustificacionEconomicaPage() {
  const [rows, setRows] = useState<JustificacionRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [decisionFiltro, setDecisionFiltro] = useState("todos");
  const [prioridadFiltro, setPrioridadFiltro] = useState("todos");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [seleccionada, setSeleccionada] = useState<JustificacionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJustificacion() {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("v_justificacion_economica")
        .select("*")
        .order("importe_en_riesgo", { ascending: false });

      if (supabaseError) {
        setError(supabaseError.message);
        setLoading(false);
        return;
      }

      setRows((data ?? []) as JustificacionRow[]);
      setLoading(false);
    }

    loadJustificacion();
  }, []);

  const estados = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.estado_justificacion))).filter(Boolean) as string[];
  }, [rows]);

  const decisiones = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.decision_recomendada))).filter(Boolean) as string[];
  }, [rows]);

  const prioridades = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.prioridad_decision))).filter(Boolean) as string[];
  }, [rows]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return rows.filter((row) => {
      const texto = [
        row.entidad_nombre,
        row.cif,
        row.codigo_accion,
        row.tipo_oferta,
        row.codigo_especialidad,
        row.denominacion,
        row.estado_justificacion,
        row.decision_recomendada,
        row.prioridad_decision,
        row.motivo_decision,
        row.tecnico_nombre,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaEstado = estadoFiltro === "todos" || row.estado_justificacion === estadoFiltro;
      const pasaDecision = decisionFiltro === "todos" || row.decision_recomendada === decisionFiltro;
      const pasaPrioridad = prioridadFiltro === "todos" || row.prioridad_decision === prioridadFiltro;

      return pasaBusqueda && pasaEstado && pasaDecision && pasaPrioridad;
    });
  }, [rows, busqueda, estadoFiltro, decisionFiltro, prioridadFiltro]);

  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, estadoFiltro, decisionFiltro, prioridadFiltro, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginadas = filtradas.slice(startIndex, endIndex);

  const resumen = useMemo(() => {
    return filtradas.reduce(
      (acc, row) => {
        acc.concedido += Number(row.importe_concedido ?? 0);
        acc.ejecutado += Number(row.importe_ejecutado ?? 0);
        acc.justificado += Number(row.importe_justificado ?? 0);
        acc.pendiente += Number(row.importe_pendiente_justificar ?? 0);
        acc.noAdmitido += Number(row.importe_no_admitido ?? 0);
        acc.riesgo += Number(row.importe_en_riesgo ?? 0);

        if (row.prioridad_decision === "alta") acc.alta++;
        if (row.estado_justificacion === "en_revision") acc.enRevision++;
        if (row.decision_recomendada === "revisar_posible_reintegro") acc.reintegro++;

        return acc;
      },
      {
        concedido: 0,
        ejecutado: 0,
        justificado: 0,
        pendiente: 0,
        noAdmitido: 0,
        riesgo: 0,
        alta: 0,
        enRevision: 0,
        reintegro: 0,
      }
    );
  }, [filtradas]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando justificación económica...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error cargando justificación económica</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error}
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
            <h1 className="mt-1 text-xl font-semibold">Justificación económica</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Control del dinero concedido, ejecutado, justificado, pendiente y en riesgo de reintegro.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} acciones visibles · {num(rows.length)} con justificación
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver al dashboard
            </Link>
            <Link href="/acciones" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Acciones administrativas
            </Link>
            <Link href="/actuaciones-emitidas" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Actuaciones emitidas
            </Link>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            Justificación económica · toma de decisiones
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi labelText="Concedido" value={euro(resumen.concedido)} detail={`${num(filtradas.length)} acciones`} />
          <Kpi labelText="Ejecutado" value={euro(resumen.ejecutado)} detail={pct(resumen.ejecutado, resumen.concedido)} />
          <Kpi labelText="Justificado" value={euro(resumen.justificado)} detail={pct(resumen.justificado, resumen.concedido)} />
          <Kpi labelText="Pendiente justificar" value={euro(resumen.pendiente)} detail={pct(resumen.pendiente, resumen.concedido)} />
          <Kpi labelText="En riesgo" value={euro(resumen.riesgo)} detail={`${num(resumen.reintegro)} posibles reintegros`} />
          <Kpi labelText="Prioridad alta" value={num(resumen.alta)} detail={`${num(resumen.enRevision)} en revisión`} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.2fr_0.75fr_0.75fr_0.65fr_auto]">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, acción, especialidad, decisión, técnico..."
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Estado justificación
              </label>
              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {label(estado)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Decisión
              </label>
              <select
                value={decisionFiltro}
                onChange={(event) => setDecisionFiltro(event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todas</option>
                {decisiones.map((decision) => (
                  <option key={decision} value={decision}>
                    {label(decision)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Prioridad
              </label>
              <select
                value={prioridadFiltro}
                onChange={(event) => setPrioridadFiltro(event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todas</option>
                {prioridades.map((prioridad) => (
                  <option key={prioridad} value={prioridad}>
                    {label(prioridad)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setEstadoFiltro("todos");
                  setDecisionFiltro("todos");
                  setPrioridadFiltro("todos");
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Control de justificación por subexpediente</h2>
              <p className="text-[11px] text-slate-500">
                Cada fila permite ver el dinero concedido, ejecutado, justificado, pendiente, riesgo y decisión recomendada.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span className="font-semibold">
                Página {safeCurrentPage} de {totalPages}
              </span>

              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold outline-none"
              >
                <option value={25}>25 filas</option>
                <option value={50}>50 filas</option>
                <option value={100}>100 filas</option>
              </select>

              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Entidad / acción</th>
                  <th className="px-2 py-2 text-right">Concedido</th>
                  <th className="px-2 py-2 text-right">Ejecutado</th>
                  <th className="px-2 py-2 text-right">Justificado</th>
                  <th className="px-2 py-2 text-right">Pendiente</th>
                  <th className="px-2 py-2 text-right">Riesgo</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Decisión</th>
                  <th className="px-2 py-2">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {paginadas.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{row.entidad_nombre ?? "—"}</p>
                      <p className="text-[10px] text-slate-500">{row.cif ?? "—"}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {row.codigo_accion ?? "—"} · {row.codigo_especialidad ?? "—"} · {row.tipo_oferta ?? "—"}
                      </p>
                      <p className="mt-0.5 max-w-[360px] truncate text-[10px] text-slate-500">
                        {row.denominacion ?? "—"}
                      </p>
                    </td>

                    <td className="px-2 py-1.5 text-right font-semibold">{euro(row.importe_concedido)}</td>
                    <td className="px-2 py-1.5 text-right">{euro(row.importe_ejecutado)}</td>
                    <td className="px-2 py-1.5 text-right text-emerald-700">{euro(row.importe_justificado)}</td>
                    <td className="px-2 py-1.5 text-right text-amber-700">{euro(row.importe_pendiente_justificar)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-red-700">{euro(row.importe_en_riesgo)}</td>

                    <td className="px-2 py-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.estado_justificacion)}`}>
                        {label(row.estado_justificacion)}
                      </span>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{label(row.decision_recomendada)}</p>
                      <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.prioridad_decision)}`}>
                        {label(row.prioridad_decision)}
                      </span>
                    </td>

                    <td className="px-2 py-1.5">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setSeleccionada(row)}
                          className="rounded-lg bg-[#183B63] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                        >
                          Ver decisión
                        </button>

                        <Link
                          href={`/oferta-formativa/${row.oferta_id}`}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Subexpediente
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay registros de justificación que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {seleccionada ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Decisión sobre justificación económica
              </p>
              <h2 className="mt-1 text-lg font-semibold">{seleccionada.entidad_nombre}</h2>
              <p className="mt-0.5 text-xs text-blue-100">
                {seleccionada.codigo_accion} · {seleccionada.codigo_especialidad} · {seleccionada.tipo_oferta}
              </p>
            </div>

            <div className="space-y-3 p-5">
              <section className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Importe concedido</p>
                  <p className="mt-1 text-lg font-semibold">{euro(seleccionada.importe_concedido)}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Pendiente justificar</p>
                  <p className="mt-1 text-lg font-semibold text-amber-700">
                    {euro(seleccionada.importe_pendiente_justificar)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">En riesgo</p>
                  <p className="mt-1 text-lg font-semibold text-red-700">{euro(seleccionada.importe_en_riesgo)}</p>
                </div>
              </section>

              <section className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                <p className="font-semibold">Lectura para toma de decisiones</p>
                <p className="mt-1">
                  La actuación recomendada se calcula desde el estado económico del subexpediente: importe concedido,
                  ejecución, justificación, pendiente documental/económico e importe en riesgo.
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Decisión recomendada</p>
                <p className="mt-1 text-sm font-semibold">{label(seleccionada.decision_recomendada)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {seleccionada.motivo_decision ?? "Sin motivo específico registrado."}
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Datos de ejecución</p>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <p className="text-sm">Inicio: <strong>{num(seleccionada.alumnos_inicio)}</strong></p>
                  <p className="text-sm">Activos: <strong>{num(seleccionada.alumnos_activos)}</strong></p>
                  <p className="text-sm">Bajas: <strong>{num(seleccionada.bajas)}</strong></p>
                  <p className="text-sm">Aptos: <strong>{num(seleccionada.aptos)}</strong></p>
                </div>
              </section>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/oferta-formativa/${seleccionada.oferta_id}`}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver subexpediente
                </Link>

                <Link
                  href="/acciones"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ir a acciones administrativas
                </Link>

                <button
                  type="button"
                  onClick={() => setSeleccionada(null)}
                  className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}


