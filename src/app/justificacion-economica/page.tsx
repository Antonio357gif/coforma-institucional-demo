"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

  estado_operativo_administrativo: string | null;
  estado_operativo_label: string | null;
  incidencias_abiertas: number | null;
  requerimientos_pendientes: number | null;
  riesgo_administrativo: string | null;
  riesgo_economico: string | null;
  actuacion_sugerida: string | null;
};

type PagoAdministrativo =
  | "pagado"
  | "en_revision_parcial"
  | "en_ejecucion_no_abonado"
  | "no_devengado"
  | "revision_riesgo";

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

function label(value: string | null | undefined) {
  return String(value ?? "—").replaceAll("_", " ");
}

function normalizar(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function estadoOperativo(row: JustificacionRow) {
  return normalizar(row.estado_operativo_administrativo);
}

function esEnEjecucion(row: JustificacionRow) {
  return estadoOperativo(row) === "en_ejecucion";
}

function esFinalizada(row: JustificacionRow) {
  return estadoOperativo(row) === "finalizada";
}

function esPendiente(row: JustificacionRow) {
  return estadoOperativo(row) === "pendiente_ejecutar";
}

function esRevisionRiesgo(row: JustificacionRow) {
  const estado = estadoOperativo(row);

  return (
    estado !== "en_ejecucion" &&
    estado !== "finalizada" &&
    estado !== "pendiente_ejecutar"
  );
}

function pagoAdministrativo(row: JustificacionRow): PagoAdministrativo {
  if (esFinalizada(row)) return "pagado";
  if (esPendiente(row)) return "no_devengado";
  if (esRevisionRiesgo(row)) return "revision_riesgo";

  const justificado = Number(row.importe_justificado ?? 0);
  if (esEnEjecucion(row) && justificado > 0) return "en_revision_parcial";

  return "en_ejecucion_no_abonado";
}

function pagoLabel(value: PagoAdministrativo) {
  if (value === "pagado") return "Pagado";
  if (value === "en_revision_parcial") return "Revisión parcial";
  if (value === "en_ejecucion_no_abonado") return "En ejecución no abonado";
  if (value === "no_devengado") return "No devengado";
  return "Revisión/Riesgo";
}

function pagoBadgeClass(value: PagoAdministrativo) {
  if (value === "pagado") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "en_revision_parcial") return "border-blue-200 bg-blue-50 text-blue-800";
  if (value === "en_ejecucion_no_abonado") return "border-slate-200 bg-slate-50 text-slate-700";
  if (value === "no_devengado") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-800";
}

function operativoBadgeClass(row: JustificacionRow) {
  if (esFinalizada(row)) return "border-slate-200 bg-slate-50 text-slate-800";
  if (esEnEjecucion(row)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (esPendiente(row)) return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-red-200 bg-red-50 text-red-800";
}

function lecturaControl(row: JustificacionRow) {
  if (esFinalizada(row)) return "Finalizada con pago administrativo";
  if (esEnEjecucion(row)) return "Ejecución viva / seguimiento económico";
  if (esPendiente(row)) return "Pendiente de ejecución / no devengado";
  return "Revisión o riesgo activo";
}

function textoEstadoOperativo(row: JustificacionRow) {
  if (esEnEjecucion(row)) return "En ejecución";
  if (esFinalizada(row)) return "Finalizada";
  if (esPendiente(row)) return "Pendiente de ejecutar";
  return label(row.estado_operativo_label ?? row.estado_operativo_administrativo);
}

async function cargarTodaLaJustificacion() {
  const pageSize = 1000;
  let from = 0;
  let allRows: JustificacionRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("v_justificacion_economica")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const bloque = (data ?? []) as JustificacionRow[];
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
  href,
  tone = "slate",
}: {
  labelText: string;
  value: string;
  detail: string;
  href?: string;
  tone?: "slate" | "green" | "blue" | "amber" | "red" | "violet";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-white hover:bg-emerald-50"
      : tone === "blue"
        ? "border-blue-200 bg-white hover:bg-blue-50"
        : tone === "amber"
          ? "border-amber-200 bg-white hover:bg-amber-50"
          : tone === "red"
            ? "border-red-200 bg-white hover:bg-red-50"
            : tone === "violet"
              ? "border-violet-200 bg-white hover:bg-violet-50"
              : "border-slate-200 bg-white hover:bg-slate-50";

  const valueClass =
    tone === "green"
      ? "text-emerald-800"
      : tone === "blue"
        ? "text-blue-800"
        : tone === "amber"
          ? "text-amber-800"
          : tone === "red"
            ? "text-red-800"
            : tone === "violet"
              ? "text-violet-800"
              : "text-slate-950";

  const card = (
    <div className={`rounded-lg border px-3 py-1.5 shadow-sm transition ${toneClass}`}>
      <p className="truncate text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {labelText}
      </p>
      <p className={`mt-0.5 truncate text-[14px] font-semibold leading-4 ${valueClass}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">
        {detail}
      </p>
    </div>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block min-w-0">
      {card}
    </Link>
  );
}

function JustificacionEconomicaPageContent() {
  const searchParams = useSearchParams();

  const ofertaIdParam = searchParams.get("ofertaId");
  const ofertaIdFiltro = ofertaIdParam ? Number(ofertaIdParam) : null;
  const tieneFiltroOferta =
    ofertaIdFiltro !== null && !Number.isNaN(ofertaIdFiltro);

  const [rows, setRows] = useState<JustificacionRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [operativoFiltro, setOperativoFiltro] = useState("todos");
  const [pagoFiltro, setPagoFiltro] = useState("todos");
  const [importeFiltro, setImporteFiltro] = useState("todos");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Cargando justificación económica...");
  const [error, setError] = useState<string | null>(null);

  function justificacionHref(params: Record<string, string>) {
    const query = new URLSearchParams();

    if (tieneFiltroOferta && ofertaIdFiltro !== null) {
      query.set("ofertaId", String(ofertaIdFiltro));
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });

    const qs = query.toString();
    return qs ? `/justificacion-economica?${qs}` : "/justificacion-economica";
  }

  useEffect(() => {
    let activo = true;

    async function loadJustificacion() {
      setLoading(true);
      setError(null);
      setLoadingMsg("Cargando justificación económica completa...");

      try {
        const data = await cargarTodaLaJustificacion();

        if (!activo) return;

        setRows(data);
        setLoading(false);
      } catch (err: any) {
        if (!activo) return;

        setError(err?.message ?? "No se pudo cargar la justificación económica.");
        setLoading(false);
      }
    }

    loadJustificacion();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const operativo = searchParams.get("operativo");
    const pago = searchParams.get("pago");
    const importe = searchParams.get("importe");
    const revision = searchParams.get("revision");

    if (operativo) {
      setOperativoFiltro(operativo);
    }

    if (pago) {
      setPagoFiltro(pago);
    }

    if (importe) {
      setImporteFiltro(importe);
    }

    if (revision === "1" || revision === "true") {
      setOperativoFiltro("revision_riesgo");
    }

    const pendienteJustificar = searchParams.get("pendiente_justificar");
    if (pendienteJustificar === "1" || pendienteJustificar === "true") {
      setPagoFiltro("no_devengado");
    }
  }, [searchParams]);

  const rowsPorOferta = useMemo(() => {
    if (!tieneFiltroOferta) return rows;

    return rows.filter((row) => Number(row.oferta_id) === Number(ofertaIdFiltro));
  }, [rows, tieneFiltroOferta, ofertaIdFiltro]);

  const ofertaActiva = useMemo(() => {
    return rowsPorOferta[0] ?? null;
  }, [rowsPorOferta]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return rowsPorOferta.filter((row) => {
      const texto = [
        row.entidad_nombre,
        row.cif,
        row.codigo_accion,
        row.tipo_oferta,
        row.codigo_especialidad,
        row.denominacion,
        textoEstadoOperativo(row),
        pagoLabel(pagoAdministrativo(row)),
        lecturaControl(row),
        row.tecnico_nombre,
        row.tecnico_unidad,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);

      const estado = estadoOperativo(row);
      const pago = pagoAdministrativo(row);

      const pasaOperativo =
        operativoFiltro === "todos" ||
        estado === operativoFiltro ||
        (operativoFiltro === "revision_riesgo" && esRevisionRiesgo(row));

      const pasaPago = pagoFiltro === "todos" || pago === pagoFiltro;

      const pasaImporte =
        importeFiltro === "todos" ||
        (importeFiltro === "ejecutado" && Number(row.importe_ejecutado ?? 0) > 0) ||
        (importeFiltro === "justificado" && Number(row.importe_justificado ?? 0) > 0);

      return pasaBusqueda && pasaOperativo && pasaPago && pasaImporte;
    });
  }, [
    rowsPorOferta,
    busqueda,
    operativoFiltro,
    pagoFiltro,
    importeFiltro,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, operativoFiltro, pagoFiltro, importeFiltro, pageSize, ofertaIdFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginadas = filtradas.slice(startIndex, endIndex);

  const resumen = useMemo(() => {
    return filtradas.reduce(
      (acc, row) => {
        const concedido = Number(row.importe_concedido ?? 0);
        const ejecutado = Number(row.importe_ejecutado ?? 0);

        acc.concedido += concedido;
        acc.ejecutado += ejecutado;

        if (esEnEjecucion(row)) {
          acc.enEjecucionAcciones++;
          acc.enEjecucionImporte += concedido;
        } else if (esFinalizada(row)) {
          acc.finalizadasAcciones++;
          acc.finalizadoImporte += concedido;
        } else if (esPendiente(row)) {
          acc.pendientesAcciones++;
          acc.pendienteImporte += concedido;
        } else {
          acc.revisionAcciones++;
          acc.revisionImporte += concedido;
        }

        const pago = pagoAdministrativo(row);

        if (pago === "pagado") acc.pagadoAcciones++;
        if (pago === "en_revision_parcial") acc.revisionParcialAcciones++;
        if (pago === "en_ejecucion_no_abonado") acc.noAbonadoAcciones++;
        if (pago === "no_devengado") acc.noDevengadoAcciones++;

        return acc;
      },
      {
        concedido: 0,
        ejecutado: 0,
        enEjecucionAcciones: 0,
        enEjecucionImporte: 0,
        finalizadasAcciones: 0,
        finalizadoImporte: 0,
        pendientesAcciones: 0,
        pendienteImporte: 0,
        revisionAcciones: 0,
        revisionImporte: 0,
        pagadoAcciones: 0,
        revisionParcialAcciones: 0,
        noAbonadoAcciones: 0,
        noDevengadoAcciones: 0,
      }
    );
  }, [filtradas]);

  function limpiarFiltros() {
    setBusqueda("");
    setOperativoFiltro("todos");
    setPagoFiltro("todos");
    setImporteFiltro("todos");
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
              Lectura económica saneada: concedido, ejecución, pago administrativo, no devengado y revisión.
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
            <Link href="/acciones" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Acciones administrativas
            </Link>
            <Link href="/actuaciones-emitidas" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Actuaciones emitidas
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {operativoFiltro !== "todos" ? (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-800 shadow-sm">
                Estado: {label(operativoFiltro)}
              </span>
            ) : null}

            {pagoFiltro !== "todos" ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 shadow-sm">
                Pago: {label(pagoFiltro)}
              </span>
            ) : null}

            {importeFiltro !== "todos" ? (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm">
                Importe: {label(importeFiltro)}
              </span>
            ) : null}

            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm">
              Foto madre económica
            </span>
          </div>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi
            labelText="Concedido"
            value={euro(resumen.concedido)}
            detail={`${num(filtradas.length)} acciones`}
            href={justificacionHref({})}
            tone="violet"
          />
          <Kpi
            labelText="En ejecución"
            value={euro(resumen.enEjecucionImporte)}
            detail={`${num(resumen.enEjecucionAcciones)} acciones · ${pct(resumen.enEjecucionImporte, resumen.concedido)}`}
            href={justificacionHref({ operativo: "en_ejecucion" })}
            tone="green"
          />
          <Kpi
            labelText="Finalizado / pagado"
            value={euro(resumen.finalizadoImporte)}
            detail={`${num(resumen.finalizadasAcciones)} acciones · ${pct(resumen.finalizadoImporte, resumen.concedido)}`}
            href={justificacionHref({ operativo: "finalizada" })}
            tone="slate"
          />
          <Kpi
            labelText="Pendiente / no devengado"
            value={euro(resumen.pendienteImporte)}
            detail={`${num(resumen.pendientesAcciones)} acciones · ${pct(resumen.pendienteImporte, resumen.concedido)}`}
            href={justificacionHref({ operativo: "pendiente_ejecutar" })}
            tone="blue"
          />
          <Kpi
            labelText="Revisión / riesgo"
            value={euro(resumen.revisionImporte)}
            detail={`${num(resumen.revisionAcciones)} acciones`}
            href={justificacionHref({ revision: "1" })}
            tone="red"
          />
          <Kpi
            labelText="Avance registrado"
            value={euro(resumen.ejecutado)}
            detail={`${pct(resumen.ejecutado, resumen.concedido)} sobre concedido`}
            href={justificacionHref({ importe: "ejecutado" })}
            tone="green"
          />
        </section>

        {tieneFiltroOferta ? (
          <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] text-blue-950 shadow-sm">
            <div>
              <p className="font-semibold leading-4">Filtro activo por subexpediente</p>
              <p className="mt-0.5 leading-4">
                {ofertaActiva
                  ? `${ofertaActiva.entidad_nombre ?? "Entidad no informada"} · ${
                      ofertaActiva.cif ?? "CIF no informado"
                    } · ${ofertaActiva.codigo_accion ?? "Acción no informada"} · ${
                      ofertaActiva.codigo_especialidad ?? "Especialidad no informada"
                    }`
                  : `Oferta ${ofertaIdFiltro}`}
              </p>
            </div>

            <Link
              href="/justificacion-economica"
              className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-50"
            >
              Ver toda la justificación
            </Link>
          </section>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.25fr_0.7fr_0.75fr_auto_auto_auto_auto]">
            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, acción, especialidad, estado, pago..."
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Estado operativo
              </label>
              <select
                value={operativoFiltro}
                onChange={(event) => setOperativoFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                <option value="en_ejecucion">En ejecución</option>
                <option value="finalizada">Finalizada</option>
                <option value="pendiente_ejecutar">Pendiente de ejecutar</option>
                <option value="revision_riesgo">Revisión/Riesgo</option>
              </select>
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Pago administrativo
              </label>
              <select
                value={pagoFiltro}
                onChange={(event) => setPagoFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                <option value="pagado">Pagado</option>
                <option value="en_revision_parcial">Revisión parcial</option>
                <option value="en_ejecucion_no_abonado">En ejecución no abonado</option>
                <option value="no_devengado">No devengado</option>
                <option value="revision_riesgo">Revisión/Riesgo</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setOperativoFiltro((prev) => (prev === "en_ejecucion" ? "todos" : "en_ejecucion"))}
                className={
                  operativoFiltro === "en_ejecucion"
                    ? "h-7 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    : "h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                }
              >
                Ejecución
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setOperativoFiltro((prev) => (prev === "pendiente_ejecutar" ? "todos" : "pendiente_ejecutar"))}
                className={
                  operativoFiltro === "pendiente_ejecutar"
                    ? "h-7 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[10px] font-semibold text-blue-800 hover:bg-blue-100"
                    : "h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                }
              >
                Pendiente
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setImporteFiltro((prev) => (prev === "ejecutado" ? "todos" : "ejecutado"))}
                className={
                  importeFiltro === "ejecutado"
                    ? "h-7 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    : "h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                }
              >
                Avance
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
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
                Control económico por subexpediente
              </h2>
              <p className="text-[10.5px] leading-4 text-slate-500">
                Lectura saneada por estado operativo, pago administrativo y avance registrado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-600">
              <span className="font-semibold">
                Página {safeCurrentPage} de {totalPages}
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
                  <th className="px-2 py-1.5">Entidad / acción</th>
                  <th className="px-2 py-1.5 text-right">Concedido</th>
                  <th className="px-2 py-1.5 text-right">Avance registrado</th>
                  <th className="px-2 py-1.5 text-right">% avance</th>
                  <th className="px-2 py-1.5">Estado operativo</th>
                  <th className="px-2 py-1.5">Pago administrativo</th>
                  <th className="px-2 py-1.5">Lectura de control</th>
                  <th className="px-2 py-1.5">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {paginadas.map((row) => {
                  const pago = pagoAdministrativo(row);

                  return (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                      <td className="px-2 py-1">
                        <p className="font-semibold leading-4 text-slate-950">{row.entidad_nombre ?? "—"}</p>
                        <p className="text-[10px] leading-4 text-slate-500">{row.cif ?? "—"}</p>
                        <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                          {row.codigo_accion ?? "—"} · {row.codigo_especialidad ?? "—"} · {row.tipo_oferta ?? "—"}
                        </p>
                        <p className="mt-0.5 max-w-[360px] truncate text-[10px] leading-4 text-slate-500">
                          {row.denominacion ?? "—"}
                        </p>
                      </td>

                      <td className="px-2 py-1 text-right font-semibold">{euro(row.importe_concedido)}</td>
                      <td className="px-2 py-1 text-right">{euro(row.importe_ejecutado)}</td>
                      <td className="px-2 py-1 text-right">{pct(row.importe_ejecutado, row.importe_concedido)}</td>

                      <td className="px-2 py-1">
                        <span
                          className={`w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${operativoBadgeClass(
                            row
                          )}`}
                        >
                          {textoEstadoOperativo(row)}
                        </span>
                      </td>

                      <td className="px-2 py-1">
                        <span
                          className={`w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pagoBadgeClass(
                            pago
                          )}`}
                        >
                          {pagoLabel(pago)}
                        </span>
                      </td>

                      <td className="px-2 py-1">
                        <p className="line-clamp-2 text-[10.5px] leading-4 text-slate-700">
                          {lecturaControl(row)}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/decisiones-economicas/${row.id}`}
                            className="rounded-lg bg-[#183B63] px-2 py-1 text-center text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                          >
                            Ficha económica
                          </Link>

                          <Link
                            href={`/subexpedientes-accion/${row.oferta_id}`}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Subexpediente
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay registros económicos que coincidan con los filtros aplicados.
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

export default function JustificacionEconomicaPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
          <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Cargando justificación económica...</p>
          </section>
        </main>
      }
    >
      <JustificacionEconomicaPageContent />
    </Suspense>
  );
}