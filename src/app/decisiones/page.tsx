"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type DecisionMesaRow = {
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

async function cargarTodasLasDecisiones() {
  const pageSize = 1000;
  let from = 0;
  let allRows: DecisionMesaRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("v_justificacion_economica")
      .select("*")
      .order("prioridad_decision", { ascending: true })
      .order("importe_en_riesgo", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const bloque = (data ?? []) as DecisionMesaRow[];
    allRows = [...allRows, ...bloque];

    if (bloque.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
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

export default function DecisionesPage() {
  const [rows, setRows] = useState<DecisionMesaRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [decisionFiltro, setDecisionFiltro] = useState("todos");
  const [prioridadFiltro, setPrioridadFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [seleccionada, setSeleccionada] = useState<DecisionMesaRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Cargando mesa de toma de decisiones...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function loadDecisiones() {
      setLoading(true);
      setError(null);
      setLoadingMsg("Cargando decisiones completas...");

      try {
        const data = await cargarTodasLasDecisiones();

        if (!activo) return;

        setRows(data);
        setLoading(false);
      } catch (err: any) {
        if (!activo) return;

        setError(err?.message ?? "No se pudo cargar la toma de decisiones.");
        setLoading(false);
      }
    }

    loadDecisiones();

    return () => {
      activo = false;
    };
  }, []);

  const decisiones = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.decision_recomendada)))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), "es")) as string[];
  }, [rows]);

  const prioridades = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.prioridad_decision)))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), "es")) as string[];
  }, [rows]);

  const estados = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.estado_justificacion)))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), "es")) as string[];
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
        row.alerta,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaDecision = decisionFiltro === "todos" || row.decision_recomendada === decisionFiltro;
      const pasaPrioridad = prioridadFiltro === "todos" || row.prioridad_decision === prioridadFiltro;
      const pasaEstado = estadoFiltro === "todos" || row.estado_justificacion === estadoFiltro;

      return pasaBusqueda && pasaDecision && pasaPrioridad && pasaEstado;
    });
  }, [rows, busqueda, decisionFiltro, prioridadFiltro, estadoFiltro]);

  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, decisionFiltro, prioridadFiltro, estadoFiltro, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginadas = filtradas.slice(startIndex, endIndex);

  const resumen = useMemo(() => {
    return filtradas.reduce(
      (acc, row) => {
        acc.importeRiesgo += Number(row.importe_en_riesgo ?? 0);
        acc.pendiente += Number(row.importe_pendiente_justificar ?? 0);
        acc.noAdmitido += Number(row.importe_no_admitido ?? 0);

        if (row.prioridad_decision === "alta") acc.prioridadAlta++;
        if (row.decision_recomendada === "revisar_posible_reintegro") acc.reintegro++;
        if (row.decision_recomendada === "requerir_documentacion_justificativa") acc.requerir++;
        if (row.estado_justificacion === "en_revision") acc.enRevision++;

        return acc;
      },
      {
        importeRiesgo: 0,
        pendiente: 0,
        noAdmitido: 0,
        prioridadAlta: 0,
        reintegro: 0,
        requerir: 0,
        enRevision: 0,
      }
    );
  }, [filtradas]);

  function limpiarFiltros() {
    setBusqueda("");
    setDecisionFiltro("todos");
    setPrioridadFiltro("todos");
    setEstadoFiltro("todos");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">{loadingMsg}</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error cargando toma de decisiones</p>
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
            <h1 className="mt-1 text-xl font-semibold">Toma de decisiones</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Mesa de decisión sobre justificación, riesgo, documentación y posible reintegro.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} decisiones visibles · {num(rows.length)} subexpedientes
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver al dashboard
            </Link>
            <Link href="/justificacion-economica" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Justificación económica
            </Link>
            <Link href="/acciones" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Acciones administrativas
            </Link>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            Decisión basada en justificación económica
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi labelText="Decisiones" value={num(filtradas.length)} detail="subexpedientes evaluados" />
          <Kpi labelText="Prioridad alta" value={num(resumen.prioridadAlta)} detail="requieren intervención" />
          <Kpi labelText="Posible reintegro" value={num(resumen.reintegro)} detail="revisión económica" />
          <Kpi labelText="Requerir documentación" value={num(resumen.requerir)} detail="justificación pendiente" />
          <Kpi labelText="Pendiente justificar" value={euro(resumen.pendiente)} detail="importe acumulado" />
          <Kpi labelText="Riesgo económico" value={euro(resumen.importeRiesgo)} detail={`${num(resumen.enRevision)} en revisión`} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.15fr_0.8fr_0.65fr_0.75fr_auto]">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, acción, decisión, motivo, técnico..."
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
              />
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
                    {label(estado)}
                  </option>
                ))}
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
          <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Mesa de decisiones por subexpediente</h2>
              <p className="text-[11px] text-slate-500">
                La decisión se apoya en justificación económica, riesgo, estado del subexpediente y documentación pendiente.
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
                  <th className="px-2 py-2">Prioridad</th>
                  <th className="px-2 py-2">Entidad / acción</th>
                  <th className="px-2 py-2">Base económica</th>
                  <th className="px-2 py-2">Decisión</th>
                  <th className="px-2 py-2">Motivo</th>
                  <th className="px-2 py-2">Técnico</th>
                  <th className="px-2 py-2">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {paginadas.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                          row.prioridad_decision
                        )}`}
                      >
                        {label(row.prioridad_decision)}
                      </span>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {label(row.estado_justificacion)}
                      </p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{row.entidad_nombre ?? "—"}</p>
                      <p className="text-[10px] text-slate-500">{row.cif ?? "—"}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {row.codigo_accion ?? "—"} · {row.codigo_especialidad ?? "—"} · {row.tipo_oferta ?? "—"}
                      </p>
                      <p className="mt-0.5 max-w-[320px] truncate text-[10px] text-slate-500">
                        {row.denominacion ?? "—"}
                      </p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="text-[10px] text-slate-500">
                        Concedido: <strong>{euro(row.importe_concedido)}</strong>
                      </p>
                      <p className="text-[10px] text-emerald-700">
                        Justificado: <strong>{euro(row.importe_justificado)}</strong>
                      </p>
                      <p className="text-[10px] text-amber-700">
                        Pendiente: <strong>{euro(row.importe_pendiente_justificar)}</strong>
                      </p>
                      <p className="text-[10px] text-red-700">
                        Riesgo: <strong>{euro(row.importe_en_riesgo)}</strong>
                      </p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{label(row.decision_recomendada)}</p>
                      <p className="text-[10px] text-slate-500">{row.estado_ejecucion ?? "—"}</p>
                    </td>

                    <td className="max-w-[240px] px-2 py-1.5">
                      <p className="line-clamp-3 text-xs leading-5 text-slate-700">
                        {row.motivo_decision ?? "Sin motivo específico registrado."}
                      </p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{row.tecnico_nombre ?? "—"}</p>
                      <p className="text-[10px] text-slate-500">{row.tecnico_unidad ?? "—"}</p>
                    </td>

                    <td className="px-2 py-1.5">
                      <div className="flex flex-col gap-1">
                        <Link
  href={`/decisiones-economicas/${row.id}`}
  className="rounded-lg bg-[#183B63] px-2 py-1 text-center text-[10px] font-semibold text-white hover:bg-[#122f4f]"
>
  Ver decisión
</Link>

                        <Link
                          href={`/subexpedientes-accion/${row.oferta_id}`}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Subexpediente
                        </Link>

                        <Link
                          href="/acciones"
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Emitir actuación
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {paginadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay decisiones que coincidan con los filtros aplicados.
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
                Decisión administrativa
              </p>
              <h2 className="mt-1 text-lg font-semibold">{label(seleccionada.decision_recomendada)}</h2>
              <p className="mt-0.5 text-xs text-blue-100">
                {seleccionada.entidad_nombre} · {seleccionada.codigo_accion} · {seleccionada.codigo_especialidad}
              </p>
            </div>

            <div className="space-y-3 p-5">
              <section className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Prioridad</p>
                  <p className="mt-1 text-sm font-semibold">{label(seleccionada.prioridad_decision)}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Pendiente justificar</p>
                  <p className="mt-1 text-sm font-semibold text-amber-700">
                    {euro(seleccionada.importe_pendiente_justificar)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Riesgo</p>
                  <p className="mt-1 text-sm font-semibold text-red-700">{euro(seleccionada.importe_en_riesgo)}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Técnico</p>
                  <p className="mt-1 text-sm font-semibold">{seleccionada.tecnico_nombre ?? "—"}</p>
                  <p className="text-[10px] text-slate-500">{seleccionada.tecnico_unidad ?? "—"}</p>
                </div>
              </section>

              <section className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                <p className="font-semibold">Base para la toma de decisiones</p>
                <p className="mt-1">
                  Esta decisión se apoya en la justificación económica del subexpediente, el importe pendiente,
                  el posible riesgo de reintegro, el estado de ejecución y la evidencia documental pendiente.
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Motivo de decisión</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {seleccionada.motivo_decision ?? "Sin motivo específico registrado."}
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Datos de ejecución</p>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <p className="text-sm">
                    Inicio: <strong>{num(seleccionada.alumnos_inicio)}</strong>
                  </p>
                  <p className="text-sm">
                    Activos: <strong>{num(seleccionada.alumnos_activos)}</strong>
                  </p>
                  <p className="text-sm">
                    Bajas: <strong>{num(seleccionada.bajas)}</strong>
                  </p>
                  <p className="text-sm">
                    Aptos: <strong>{num(seleccionada.aptos)}</strong>
                  </p>
                </div>
              </section>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/subexpedientes-accion/${seleccionada.oferta_id}`}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver subexpediente
                </Link>

                <Link
                  href="/justificacion-economica"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver justificación
                </Link>

                <Link
                  href={`/acciones?ofertaId=${seleccionada.oferta_id}`}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Emitir actuación
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