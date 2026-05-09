"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  estado_operativo_administrativo: string | null;
  estado_operativo_label: string | null;
  incidencias_abiertas: number | null;
  requerimientos_pendientes: number | null;
  riesgo_administrativo: string | null;
  riesgo_economico: string | null;
  actuacion_sugerida: string | null;
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

  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1,
  }).format((p / t) * 100)} %`;
}

function normalize(value: string | number | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function label(value: string | null | undefined) {
  const raw = String(value ?? "—").trim();

  if (!raw || raw === "—") return "—";

  const mapa: Record<string, string> = {
    en_ejecucion: "En ejecución",
    finalizada: "Finalizada",
    pendiente_ejecutar: "Pendiente de ejecutar",
    justificacion_parcial_en_curso: "Justificación parcial en curso",
    pendiente_aportacion: "Pendiente de aportación",
    no_devengado: "No devengado",
    normal: "Normal",
    ordinaria: "Ordinaria",
    media: "Media",
    baja: "Baja",
    alta: "Alta",
    seguimiento_ejecucion_y_justificacion: "Seguimiento de ejecución y justificación",
    seguimiento_ordinario: "Seguimiento ordinario",
    control_inicio: "Control de inicio",
    cierre_y_justificacion: "Cierre y justificación",
  };

  return mapa[raw] ?? raw.replaceAll("_", " ");
}

function estadoOperativo(row: DecisionMesaRow) {
  return row.estado_operativo_administrativo ?? row.estado_ejecucion ?? "sin_estado";
}

function estadoOperativoLabel(row: DecisionMesaRow) {
  return row.estado_operativo_label ?? estadoOperativo(row);
}

function badgeClass(value: string | null | undefined) {
  const normalizado = normalize(value);

  if (
    normalizado.includes("riesgo") ||
    normalizado.includes("reintegro") ||
    normalizado.includes("alta")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    normalizado.includes("media") ||
    normalizado.includes("pendiente") ||
    normalizado.includes("aportacion") ||
    normalizado.includes("aportación") ||
    normalizado.includes("parcial") ||
    normalizado.includes("no_devengado") ||
    normalizado.includes("no devengado")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    normalizado.includes("ejecucion") ||
    normalizado.includes("ejecución") ||
    normalizado.includes("finalizada") ||
    normalizado.includes("normal") ||
    normalizado.includes("ordinaria")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function lecturaControl(row: DecisionMesaRow) {
  const estado = normalize(estadoOperativo(row));
  const justificacion = normalize(row.estado_justificacion);
  const riesgo = Number(row.importe_en_riesgo ?? 0);
  const pendiente = Number(row.importe_pendiente_justificar ?? 0);

  if (riesgo > 0) {
    return {
      control: "Revisión / riesgo",
      descripcion: "Subexpediente con importe económico en revisión.",
      tono: "risk" as const,
    };
  }

  if (estado === "pendiente_ejecutar") {
    return {
      control: "Pendiente / no devengado",
      descripcion: "Acción pendiente de ejecución. Importe no devengado.",
      tono: "pending" as const,
    };
  }

  if (estado === "finalizada" && justificacion.includes("pendiente")) {
    return {
      control: "Cierre / aportación",
      descripcion: "Acción finalizada con documentación económica pendiente.",
      tono: "pending" as const,
    };
  }

  if (estado === "finalizada") {
    return {
      control: "Cierre económico",
      descripcion: "Acción finalizada con seguimiento económico ordinario.",
      tono: "ok" as const,
    };
  }

  if (estado === "en_ejecucion" && justificacion.includes("parcial")) {
    return {
      control: "Seguimiento",
      descripcion: "Acción en ejecución con avance económico registrado.",
      tono: "ok" as const,
    };
  }

  if (estado === "en_ejecucion" && justificacion.includes("pendiente")) {
    return {
      control: "Seguimiento / aportación",
      descripcion: "Acción en ejecución con aportación documental pendiente.",
      tono: "pending" as const,
    };
  }

  return {
    control: "Control ordinario",
    descripcion: "Lectura económica ordinaria del subexpediente.",
    tono: "ok" as const,
  };
}

function controlBadgeClass(tono: "ok" | "pending" | "risk") {
  if (tono === "risk") return "border-red-200 bg-red-50 text-red-800";
  if (tono === "pending") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

async function cargarTodasLasDecisiones() {
  const pageSize = 1000;
  let from = 0;
  let allRows: DecisionMesaRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("v_justificacion_economica")
      .select("*")
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
  tone = "default",
  onClick,
}: {
  labelText: string;
  value: string;
  detail: string;
  tone?: "default" | "green" | "blue" | "amber" | "red";
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
      className={`rounded-lg border bg-white px-3 py-1.5 text-left shadow-sm transition ${toneClass}`}
    >
      <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {labelText}
      </p>
      <p className="mt-0.5 truncate text-[14px] font-semibold leading-4 text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">
        {detail}
      </p>
    </button>
  );
}

function DecisionesPageContent() {
  const searchParams = useSearchParams();
  const ofertaIdParam = searchParams.get("ofertaId");
  const ofertaIdFiltro = ofertaIdParam ? Number(ofertaIdParam) : null;
  const tieneFiltroOferta = ofertaIdFiltro !== null && !Number.isNaN(ofertaIdFiltro);

  const [rows, setRows] = useState<DecisionMesaRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoOperativoFiltro, setEstadoOperativoFiltro] = useState("todos");
  const [estadoJustificacionFiltro, setEstadoJustificacionFiltro] = useState("todos");
  const [prioridadFiltro, setPrioridadFiltro] = useState("todos");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Cargando lectura económica saneada...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function loadDecisiones() {
      setLoading(true);
      setError(null);
      setLoadingMsg("Cargando subexpedientes económicos...");

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

  const rowsPorOferta = useMemo(() => {
    if (!tieneFiltroOferta) return rows;

    return rows.filter((row) => Number(row.oferta_id) === Number(ofertaIdFiltro));
  }, [rows, tieneFiltroOferta, ofertaIdFiltro]);

  const ofertaFiltrada = useMemo(() => {
    if (!tieneFiltroOferta) return null;

    return rows.find((row) => Number(row.oferta_id) === Number(ofertaIdFiltro)) ?? null;
  }, [rows, tieneFiltroOferta, ofertaIdFiltro]);

  const estadosOperativos = useMemo(() => {
    return Array.from(new Set(rowsPorOferta.map((row) => estadoOperativo(row))))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), "es")) as string[];
  }, [rowsPorOferta]);

  const estadosJustificacion = useMemo(() => {
    return Array.from(new Set(rowsPorOferta.map((row) => row.estado_justificacion)))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), "es")) as string[];
  }, [rowsPorOferta]);

  const prioridades = useMemo(() => {
    return Array.from(new Set(rowsPorOferta.map((row) => row.prioridad_decision)))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), "es")) as string[];
  }, [rowsPorOferta]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return rowsPorOferta.filter((row) => {
      const estadoOp = estadoOperativo(row);

      const texto = [
        row.entidad_nombre,
        row.cif,
        row.codigo_accion,
        row.tipo_oferta,
        row.codigo_especialidad,
        row.denominacion,
        estadoOp,
        row.estado_operativo_label,
        row.estado_justificacion,
        row.decision_recomendada,
        row.prioridad_decision,
        row.motivo_decision,
        row.tecnico_nombre,
        row.alerta,
        row.actuacion_sugerida,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaEstadoOperativo =
        estadoOperativoFiltro === "todos" || estadoOp === estadoOperativoFiltro;
      const pasaEstadoJustificacion =
        estadoJustificacionFiltro === "todos" ||
        row.estado_justificacion === estadoJustificacionFiltro;
      const pasaPrioridad =
        prioridadFiltro === "todos" || row.prioridad_decision === prioridadFiltro;

      return pasaBusqueda && pasaEstadoOperativo && pasaEstadoJustificacion && pasaPrioridad;
    });
  }, [
    rowsPorOferta,
    busqueda,
    estadoOperativoFiltro,
    estadoJustificacionFiltro,
    prioridadFiltro,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    busqueda,
    estadoOperativoFiltro,
    estadoJustificacionFiltro,
    prioridadFiltro,
    pageSize,
    ofertaIdParam,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginadas = filtradas.slice(startIndex, endIndex);

  const resumen = useMemo(() => {
    return filtradas.reduce(
      (acc, row) => {
        const estado = estadoOperativo(row);
        const riesgo = Number(row.importe_en_riesgo ?? 0);

        acc.concedido += Number(row.importe_concedido ?? 0);
        acc.ejecutado += Number(row.importe_ejecutado ?? 0);
        acc.justificado += Number(row.importe_justificado ?? 0);
        acc.pendiente += Number(row.importe_pendiente_justificar ?? 0);
        acc.riesgo += riesgo;

        if (estado === "en_ejecucion") acc.enEjecucion++;
        if (estado === "finalizada") acc.finalizadas++;
        if (estado === "pendiente_ejecutar") acc.pendientes++;
        if (riesgo > 0) acc.revisionRiesgo++;
        if (row.prioridad_decision === "alta") acc.prioridadAlta++;

        return acc;
      },
      {
        concedido: 0,
        ejecutado: 0,
        justificado: 0,
        pendiente: 0,
        riesgo: 0,
        enEjecucion: 0,
        finalizadas: 0,
        pendientes: 0,
        revisionRiesgo: 0,
        prioridadAlta: 0,
      }
    );
  }, [filtradas]);

  function limpiarFiltros() {
    setBusqueda("");
    setEstadoOperativoFiltro("todos");
    setEstadoJustificacionFiltro("todos");
    setPrioridadFiltro("todos");
  }

  function filtrarEstado(estado: string) {
    setEstadoOperativoFiltro(estado);
    setEstadoJustificacionFiltro("todos");
    setPrioridadFiltro("todos");
  }

  function filtrarRiesgo() {
    setEstadoOperativoFiltro("todos");
    setEstadoJustificacionFiltro("todos");
    setPrioridadFiltro("alta");
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
          <p className="text-sm font-semibold text-red-700">
            Error cargando mesa económica
          </p>
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
              Lectura económica saneada para seguimiento, cierre, pendiente no devengado y actuación administrativa.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} visibles · {num(rows.length)} subexpedientes económicos
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-1.5 px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
            <Link href="/actuaciones-emitidas" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Actuaciones emitidas
            </Link>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm">
            Lectura desde v_justificacion_economica
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi
            labelText="Subexpedientes"
            value={num(filtradas.length)}
            detail="lectura económica"
            onClick={limpiarFiltros}
          />

          <Kpi
            labelText="En ejecución"
            value={num(resumen.enEjecucion)}
            detail={`${pct(resumen.ejecutado, resumen.concedido)} avance`}
            tone="green"
            onClick={() => filtrarEstado("en_ejecucion")}
          />

          <Kpi
            labelText="Finalizados"
            value={num(resumen.finalizadas)}
            detail="cierre económico"
            tone="green"
            onClick={() => filtrarEstado("finalizada")}
          />

          <Kpi
            labelText="Pendientes"
            value={num(resumen.pendientes)}
            detail={euro(
              filtradas
                .filter((row) => estadoOperativo(row) === "pendiente_ejecutar")
                .reduce((acc, row) => acc + Number(row.importe_pendiente_justificar ?? 0), 0)
            )}
            tone="blue"
            onClick={() => filtrarEstado("pendiente_ejecutar")}
          />

          <Kpi
            labelText="Revisión/riesgo"
            value={num(resumen.revisionRiesgo)}
            detail={euro(resumen.riesgo)}
            tone={resumen.revisionRiesgo > 0 ? "red" : "green"}
            onClick={filtrarRiesgo}
          />

          <Kpi
            labelText="Prioridad alta"
            value={num(resumen.prioridadAlta)}
            detail="control técnico"
            tone={resumen.prioridadAlta > 0 ? "red" : "green"}
            onClick={filtrarRiesgo}
          />
        </section>

        {tieneFiltroOferta ? (
          <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-blue-950 shadow-sm">
            <div>
              <p className="font-semibold leading-4">Filtro activo por subexpediente</p>
              <p className="mt-0.5 leading-4">
                {ofertaFiltrada?.entidad_nombre ?? "Subexpediente seleccionado"}
                {ofertaFiltrada?.cif ? ` · ${ofertaFiltrada.cif}` : ""}
                {ofertaFiltrada?.codigo_accion ? ` · ${ofertaFiltrada.codigo_accion}` : ""}
                {ofertaFiltrada?.codigo_especialidad ? ` · ${ofertaFiltrada.codigo_especialidad}` : ""}
              </p>
            </div>

            <Link
              href="/decisiones"
              className="rounded-md border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-50"
            >
              Ver todas
            </Link>
          </section>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.1fr_0.75fr_0.8fr_0.65fr_auto]">
            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, acción, estado, técnico..."
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Estado operativo
              </label>
              <select
                value={estadoOperativoFiltro}
                onChange={(event) => setEstadoOperativoFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                {estadosOperativos.map((estado) => (
                  <option key={estado} value={estado}>
                    {label(estado)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Pago / justificación
              </label>
              <select
                value={estadoJustificacionFiltro}
                onChange={(event) => setEstadoJustificacionFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                {estadosJustificacion.map((estado) => (
                  <option key={estado} value={estado}>
                    {label(estado)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Prioridad
              </label>
              <select
                value={prioridadFiltro}
                onChange={(event) => setPrioridadFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
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
                onClick={limpiarFiltros}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-1.5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[14px] font-semibold leading-5">
                Mesa económica por subexpediente
              </h2>
              <p className="text-[10.5px] leading-4 text-slate-500">
                Control de avance, no devengado, revisión/riesgo y actuación administrativa vinculada.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-600">
              <span className="font-semibold">
                Página {num(safeCurrentPage)} de {num(totalPages)}
              </span>

              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[10.5px] font-semibold outline-none"
              >
                <option value={25}>25 filas</option>
                <option value={50}>50 filas</option>
                <option value={100}>100 filas</option>
              </select>

              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10.5px] font-semibold text-slate-700 disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10.5px] font-semibold text-slate-700 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="max-h-[620px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[9.5px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Control</th>
                  <th className="px-2 py-1.5">Entidad / acción</th>
                  <th className="px-2 py-1.5">Base económica</th>
                  <th className="px-2 py-1.5">Estado</th>
                  <th className="px-2 py-1.5">Lectura</th>
                  <th className="px-2 py-1.5">Técnico</th>
                  <th className="px-2 py-1.5">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {paginadas.map((row) => {
                  const lectura = lecturaControl(row);
                  const riesgo = Number(row.importe_en_riesgo ?? 0);

                  return (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                      <td className="px-2 py-1 align-top">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${controlBadgeClass(
                            lectura.tono
                          )}`}
                        >
                          {lectura.control}
                        </span>
                        <p className="mt-1 text-[10px] leading-4 text-slate-500">
                          Prioridad: {label(row.prioridad_decision)}
                        </p>
                      </td>

                      <td className="px-2 py-1 align-top">
                        <p className="font-semibold leading-4 text-slate-950">
                          {row.entidad_nombre ?? "—"}
                        </p>
                        <p className="text-[10px] leading-4 text-slate-500">{row.cif ?? "—"}</p>
                        <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                          {row.codigo_accion ?? "—"} · {row.codigo_especialidad ?? "—"} ·{" "}
                          {row.tipo_oferta ?? "—"}
                        </p>
                        <p className="mt-0.5 max-w-[300px] truncate text-[10px] leading-4 text-slate-500">
                          {row.denominacion ?? "—"}
                        </p>
                      </td>

                      <td className="px-2 py-1 align-top">
                        <p className="text-[10px] leading-4 text-slate-500">
                          Concedido: <strong>{euro(row.importe_concedido)}</strong>
                        </p>
                        <p className="text-[10px] leading-4 text-emerald-700">
                          Avance: <strong>{euro(row.importe_ejecutado)}</strong>
                        </p>
                        <p className="text-[10px] leading-4 text-blue-700">
                          Justificado: <strong>{euro(row.importe_justificado)}</strong>
                        </p>
                        <p className="text-[10px] leading-4 text-amber-700">
                          Pendiente/no devengado:{" "}
                          <strong>{euro(row.importe_pendiente_justificar)}</strong>
                        </p>
                        <p
                          className={
                            riesgo > 0
                              ? "text-[10px] leading-4 text-red-700"
                              : "text-[10px] leading-4 text-emerald-700"
                          }
                        >
                          Revisión/riesgo: <strong>{euro(row.importe_en_riesgo)}</strong>
                        </p>
                      </td>

                      <td className="px-2 py-1 align-top">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                            estadoOperativo(row)
                          )}`}
                        >
                          {label(estadoOperativoLabel(row))}
                        </span>

                        <p className="mt-1">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                              row.estado_justificacion
                            )}`}
                          >
                            {label(row.estado_justificacion)}
                          </span>
                        </p>
                      </td>

                      <td className="max-w-[260px] px-2 py-1 align-top">
                        <p className="line-clamp-2 text-[11px] leading-4 text-slate-700">
                          {lectura.descripcion}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">
                          {row.motivo_decision ??
                            row.actuacion_sugerida ??
                            "Sin observación económica adicional registrada."}
                        </p>
                      </td>

                      <td className="px-2 py-1 align-top">
                        <p className="font-semibold leading-4 text-slate-950">
                          {row.tecnico_nombre ?? "—"}
                        </p>
                        <p className="text-[10px] leading-4 text-slate-500">
                          {row.tecnico_unidad ?? "—"}
                        </p>
                      </td>

                      <td className="px-2 py-1 align-top">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/decisiones-economicas/${row.id}`}
                            className="rounded-md bg-[#183B63] px-2 py-1 text-center text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                          >
                            Ficha económica
                          </Link>

                          <Link
                            href={`/subexpedientes-accion/${row.oferta_id}`}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Subexpediente
                          </Link>

                          <Link
                            href={`/acciones/nueva?ofertaId=${row.oferta_id}`}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Preparar actuación
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay subexpedientes económicos que coincidan con los filtros aplicados.
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

export default function DecisionesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
          <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Cargando mesa económica...</p>
          </section>
        </main>
      }
    >
      <DecisionesPageContent />
    </Suspense>
  );
}