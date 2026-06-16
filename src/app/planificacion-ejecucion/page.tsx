"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type VistaPlanning = "anio" | "mes" | "semana";

type AccionTemporal = {
  oferta_id: number | null;
  subexpediente_id: number | null;
  convocatoria_id: number | null;
  convocatoria_codigo: string | null;
  entidad_id: number | null;
  entidad_nombre: string | null;
  cif: string | null;
  codigo_accion: string | null;
  tipo_oferta: string | null;
  codigo_especialidad: string | null;
  denominacion: string | null;
  familia_profesional: string | null;
  modalidad: string | null;
  horas: number | null;
  centro_formacion: string | null;
  isla: string | null;
  municipio: string | null;
  importe_concedido: number | null;
  importe_ejecutado: number | null;
  estado_operativo_administrativo: string | null;
  estado_ejecucion: string | null;
  documentacion_estado: string | null;
  prioridad_tecnica: string | null;
  unidad_responsable: string | null;
  tecnico_asignado: string | null;
  fecha_inicio_prevista: string | null;
  fecha_inicio_comunicada: string | null;
  fecha_inicio_validada: string | null;
  fecha_fin_prevista: string | null;
  fecha_fin_comunicada: string | null;
  fecha_fin_validada: string | null;
  estado_temporal_control: string | null;
  lectura_temporal: string | null;
  prioridad_temporal: number | null;
};

type Festivo = {
  fecha: string | null;
  descripcion: string | null;
  tipo: string | null;
  activo: boolean | null;
  ambito: string | null;
  provincia: string | null;
  isla: string | null;
  municipio: string | null;
};

type Resumen = {
  total: number;
  conFechaCompleta: number;
  sinFechaCompleta: number;
  af: number;
  cp: number;
  finalizadas: number;
  enEjecucion: number;
  pendientes: number;
  entidades: number;
};

type MonthSummary = {
  active: number;
  af: number;
  cp: number;
  starts: number;
  ends: number;
  finalizadas: number;
  enEjecucion: number;
  pendientes: number;
  finPrevistaPasada: number;
};

const VERSION_PLANNING = "2026-05-21-v5-planning-visual-2053-106-entidades";
const PAGE_SIZE = 1000;
const YEAR = 2026;

const mesesES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const ordenIslas = [
  "TENERIFE",
  "GRAN CANARIA",
  "LANZAROTE",
  "LA PALMA",
  "FUERTEVENTURA",
  "LA GOMERA",
  "EL HIERRO",
];

function clean(value: unknown, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
}

function normalize(value: unknown) {
  return clean(value, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Number(value ?? 0));
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const raw = value.slice(0, 10);
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  return current;
}

function getMonthDays(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const days: Date[] = [];
  let cursor = first;

  while (cursor.getMonth() === monthIndex) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  return days;
}

function getWeekDays(baseDate: Date) {
  const first = startOfWeek(baseDate);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

function fechaInicioControl(accion: AccionTemporal) {
  return (
    parseDate(accion.fecha_inicio_validada) ??
    parseDate(accion.fecha_inicio_comunicada) ??
    parseDate(accion.fecha_inicio_prevista)
  );
}

function fechaFinControl(accion: AccionTemporal) {
  return (
    parseDate(accion.fecha_fin_validada) ??
    parseDate(accion.fecha_fin_comunicada) ??
    parseDate(accion.fecha_fin_prevista)
  );
}

function estadoLabel(value: string | null | undefined) {
  if (value === "finalizada") return "Finalizada";
  if (value === "en_ejecucion") return "En ejecución";
  if (value === "pendiente_ejecutar") return "Pendiente";
  return clean(value).replaceAll("_", " ");
}

function estadoDotClass(value: string | null | undefined) {
  if (value === "finalizada") return "bg-emerald-500";
  if (value === "en_ejecucion") return "bg-blue-500";
  if (value === "pendiente_ejecutar") return "bg-amber-500";
  return "bg-slate-400";
}

function esNoLectivo(
  date: Date,
  festivos: Festivo[],
  isla?: string | null,
  municipio?: string | null
) {

  const iso = isoDate(date);
  const islaNorm = normalize(isla);
  const municipioNorm = normalize(municipio);

  return festivos.some((festivo) => {
    if (!festivo.activo) return false;
    if (!festivo.fecha || festivo.fecha.slice(0, 10) !== iso) return false;

    const festivoIsla = normalize(festivo.isla);
    const festivoMunicipio = normalize(festivo.municipio);

    if (festivoMunicipio && municipioNorm && festivoMunicipio !== municipioNorm) {
      return false;
    }

    if (festivoIsla && islaNorm && festivoIsla !== islaNorm) {
      return false;
    }

    return true;
  });
}

function accionCruzaRango(accion: AccionTemporal, inicioRango: Date, finRango: Date) {
  const inicio = fechaInicioControl(accion);
  const fin = fechaFinControl(accion);
  if (!inicio || !fin) return false;
  return inicio <= finRango && fin >= inicioRango;
}

function accionTieneRangoTemporal(accion: AccionTemporal) {
  return Boolean(fechaInicioControl(accion) && fechaFinControl(accion));
}

function accionDentroAnio(accion: AccionTemporal, year: number) {
  const inicioAnio = new Date(year, 0, 1);
  const finAnio = new Date(year, 11, 31);
  return accionCruzaRango(accion, inicioAnio, finAnio);
}

function tooltipAccion(accion: AccionTemporal) {
  return [
    clean(accion.entidad_nombre),
    `${clean(accion.codigo_accion)} · ${clean(accion.tipo_oferta)} · ${clean(accion.codigo_especialidad)}`,
    clean(accion.denominacion),
    `${clean(accion.isla)} · ${clean(accion.municipio)}`,
    `Inicio: ${formatDate(fechaInicioControl(accion))}`,
    `Fin: ${formatDate(fechaFinControl(accion))}`,
    `Estado: ${estadoLabel(accion.estado_operativo_administrativo)}`,
  ].join("\n");
}

async function fetchAllAccionesTemporales() {
  const allRows: AccionTemporal[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("v_planificacion_ejecucion_temporal")
      .select("*")
      .order("prioridad_temporal", { ascending: true })
      .order("fecha_fin_prevista", { ascending: true })
      .order("oferta_id", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const rows = (data ?? []) as AccionTemporal[];
    allRows.push(...rows);

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-[16px] font-bold leading-5 text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>
    </article>
  );
}

function MonthMassCell({ summary }: { summary: MonthSummary }) {
  const total = Math.max(1, summary.active);
  const pFinalizadas = (summary.finalizadas / total) * 100;
  const pEjecucion = (summary.enEjecucion / total) * 100;
  const pPendientes = (summary.pendientes / total) * 100;

  if (summary.active === 0) {
    return (
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-center text-[9px] text-slate-300">
        —
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm"
      title={[
        `Activas: ${num(summary.active)}`,
        `AF: ${num(summary.af)} · CP: ${num(summary.cp)}`,
        `Inician: ${num(summary.starts)} · Finalizan: ${num(summary.ends)}`,
        `Finalizadas: ${num(summary.finalizadas)}`,
        `En ejecución: ${num(summary.enEjecucion)}`,
        `Pendientes: ${num(summary.pendientes)}`,
        `Fin prevista pasada: ${num(summary.finPrevistaPasada)}`,
      ].join("\n")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-bold text-slate-700">
          {num(summary.active)}
        </span>
        <span className="text-[9px] text-slate-400">F {num(summary.ends)}</span>
      </div>

      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-emerald-300" style={{ width: `${pFinalizadas}%` }} />
        <div className="h-full bg-blue-300" style={{ width: `${pEjecucion}%` }} />
        <div className="h-full bg-amber-300" style={{ width: `${pPendientes}%` }} />
      </div>

      <div className="mt-1 flex justify-between text-[8px] text-slate-500">
        <span>{num(summary.finalizadas)}</span>
        <span>{num(summary.enEjecucion)}</span>
        <span>{num(summary.pendientes)}</span>
      </div>
    </div>
  );
}

function DayCell({
  date,
  acciones,
  festivos,
  isla,
  municipio,
}: {
  date: Date;
  acciones: AccionTemporal[];
  festivos: Festivo[];
  isla: string;
  municipio: string;
}) {
  const noLectivo = esNoLectivo(
    date,
    festivos,
    isla === "todas" ? null : isla,
    municipio === "todos" ? null : municipio
  );

  const activas = acciones.filter((accion) => {
    const inicio = fechaInicioControl(accion);
    const fin = fechaFinControl(accion);
    if (!inicio || !fin) return false;
    return inicio <= date && fin >= date;
  });

  const inician = acciones.filter((accion) => {
    const inicio = fechaInicioControl(accion);
    return inicio ? isoDate(inicio) === isoDate(date) : false;
  });

  const finalizan = acciones.filter((accion) => {
    const fin = fechaFinControl(accion);
    return fin ? isoDate(fin) === isoDate(date) : false;
  });

  const finalizadas = activas.filter(
    (accion) => accion.estado_operativo_administrativo === "finalizada"
  ).length;
  const ejecucion = activas.filter(
    (accion) => accion.estado_operativo_administrativo === "en_ejecucion"
  ).length;
  const pendientes = activas.filter(
    (accion) => accion.estado_operativo_administrativo === "pendiente_ejecutar"
  ).length;

  return (
    <div
      className={`min-h-[88px] rounded-xl border px-2 py-1.5 shadow-sm ${
        noLectivo ? "border-slate-200 bg-slate-100" : "border-slate-200 bg-white"
      }`}
      title={[
        formatDate(date),
        noLectivo ? "No lectivo" : "Lectivo",
        `Activas: ${num(activas.length)}`,
        `Inician: ${num(inician.length)}`,
        `Finalizan: ${num(finalizan.length)}`,
        `Finalizadas: ${num(finalizadas)}`,
        `En ejecución: ${num(ejecucion)}`,
        `Pendientes: ${num(pendientes)}`,
      ].join("\n")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-800">{date.getDate()}</span>
        {noLectivo ? (
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500">
            NL
          </span>
        ) : null}
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between text-[9px] text-slate-600">
          <span>Activas</span>
          <span className="font-bold">{num(activas.length)}</span>
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-600">
          <span>Inician</span>
          <span className="font-bold">{num(inician.length)}</span>
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-600">
          <span>Finalizan</span>
          <span className="font-bold">{num(finalizan.length)}</span>
        </div>
      </div>

      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-emerald-300"
          style={{ width: `${activas.length ? (finalizadas / activas.length) * 100 : 0}%` }}
        />
        <div
          className="h-full bg-blue-300"
          style={{ width: `${activas.length ? (ejecucion / activas.length) * 100 : 0}%` }}
        />
        <div
          className="h-full bg-amber-300"
          style={{ width: `${activas.length ? (pendientes / activas.length) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

function AccionBar({
  accion,
  periodoInicio,
  periodoFin,
}: {
  accion: AccionTemporal;
  periodoInicio: Date;
  periodoFin: Date;
}) {
  const inicio = fechaInicioControl(accion);
  const fin = fechaFinControl(accion);

  if (!inicio || !fin) return null;
  if (fin < periodoInicio || inicio > periodoFin) return null;

  const start = inicio < periodoInicio ? periodoInicio : inicio;
  const end = fin > periodoFin ? periodoFin : fin;

  const totalDays =
    Math.max(1, Math.round((periodoFin.getTime() - periodoInicio.getTime()) / 86400000)) + 1;
  const startOffset = Math.max(
    0,
    Math.round((start.getTime() - periodoInicio.getTime()) / 86400000)
  );
  const duration =
    Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000)) + 1;

  const left = (startOffset / totalDays) * 100;
  const width = (duration / totalDays) * 100;

  return (
    <div className="grid grid-cols-[280px_1fr] items-center gap-2 border-b border-slate-100 py-1">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold text-slate-800">
          {clean(accion.entidad_nombre)}
        </p>
        <p className="truncate text-[9.5px] text-slate-500">
          {clean(accion.tipo_oferta)} · {clean(accion.codigo_accion)} · {clean(accion.denominacion)}
        </p>
      </div>

      <div className="relative h-5 rounded-full bg-slate-100">
        <div
          className={`absolute top-1 h-3 rounded-full ${estadoDotClass(
            accion.estado_operativo_administrativo
          )}`}
          style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
          title={tooltipAccion(accion)}
        />
      </div>
    </div>
  );
}

function summarizeMonth(acciones: AccionTemporal[], monthIndex: number, year: number): MonthSummary {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);

  const activeRows = acciones.filter((accion) => accionCruzaRango(accion, monthStart, monthEnd));

  return activeRows.reduce(
    (acc, accion) => {
      const inicio = fechaInicioControl(accion);
      const fin = fechaFinControl(accion);

      acc.active += 1;
      if (accion.tipo_oferta === "AF") acc.af += 1;
      if (accion.tipo_oferta === "CP") acc.cp += 1;
      if (inicio && inicio >= monthStart && inicio <= monthEnd) acc.starts += 1;
      if (fin && fin >= monthStart && fin <= monthEnd) acc.ends += 1;
      if (accion.estado_operativo_administrativo === "finalizada") acc.finalizadas += 1;
      if (accion.estado_operativo_administrativo === "en_ejecucion") acc.enEjecucion += 1;
      if (accion.estado_operativo_administrativo === "pendiente_ejecutar") acc.pendientes += 1;
      if (accion.estado_temporal_control === "fin_prevista_pasada") acc.finPrevistaPasada += 1;
      return acc;
    },
    {
      active: 0,
      af: 0,
      cp: 0,
      starts: 0,
      ends: 0,
      finalizadas: 0,
      enEjecucion: 0,
      pendientes: 0,
      finPrevistaPasada: 0,
    }
  );
}

export default function PlanificacionEjecucionPage() {
  const [vista, setVista] = useState<VistaPlanning>("anio");
  const [mes, setMes] = useState(4);
  const [semanaBase, setSemanaBase] = useState(() => new Date(YEAR, 4, 21));

  const [acciones, setAcciones] = useState<AccionTemporal[]>([]);
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);

  const [filtroEntidad, setFiltroEntidad] = useState("todas");
  const [filtroIsla, setFiltroIsla] = useState("todas");
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorLectura(null);

    try {
      const [accionesCompletas, festivosResult] = await Promise.all([
        fetchAllAccionesTemporales(),
        supabase.from("cat_festivos_no_lectivos").select("*").eq("activo", true),
      ]);

      if (festivosResult.error) {
        setErrorLectura(festivosResult.error.message);
        setLoading(false);
        return;
      }

      setAcciones(accionesCompletas);
      setFestivos((festivosResult.data ?? []) as Festivo[]);
      setLoading(false);
    } catch (error) {
      setErrorLectura(
        error instanceof Error ? error.message : "Error leyendo el planning completo"
      );
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resumenConvocatoria = useMemo<Resumen>(() => {
    const entidades = new Set(
      acciones.map((accion) =>
        accion.entidad_id !== null && accion.entidad_id !== undefined
          ? `id:${accion.entidad_id}`
          : `nombre:${clean(accion.entidad_nombre)}`
      )
    );

    return acciones.reduce(
      (acc, accion) => {
        acc.total += 1;
        if (accionTieneRangoTemporal(accion)) acc.conFechaCompleta += 1;
        else acc.sinFechaCompleta += 1;
        if (accion.tipo_oferta === "AF") acc.af += 1;
        if (accion.tipo_oferta === "CP") acc.cp += 1;
        if (accion.estado_operativo_administrativo === "finalizada") acc.finalizadas += 1;
        if (accion.estado_operativo_administrativo === "en_ejecucion") acc.enEjecucion += 1;
        if (accion.estado_operativo_administrativo === "pendiente_ejecutar") acc.pendientes += 1;
        return acc;
      },
      {
        total: 0,
        conFechaCompleta: 0,
        sinFechaCompleta: 0,
        af: 0,
        cp: 0,
        finalizadas: 0,
        enEjecucion: 0,
        pendientes: 0,
        entidades: entidades.size,
      }
    );
  }, [acciones]);

  const accionesPlanificables2026 = useMemo(() => {
    return acciones.filter((accion) => accionDentroAnio(accion, YEAR));
  }, [acciones]);

  const entidadesDisponibles = useMemo(() => {
    return Array.from(new Set(acciones.map((accion) => clean(accion.entidad_nombre))))
      .filter((value) => value !== "—")
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [acciones]);

  const accionesPorEntidad = useMemo(() => {
    return filtroEntidad === "todas"
      ? acciones
      : acciones.filter((accion) => clean(accion.entidad_nombre) === filtroEntidad);
  }, [acciones, filtroEntidad]);

  const islasDisponibles = useMemo(() => {
    return Array.from(new Set(accionesPorEntidad.map((accion) => clean(accion.isla))))
      .filter((value) => value !== "—")
      .sort((a, b) => {
        const ia = ordenIslas.indexOf(a);
        const ib = ordenIslas.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b, "es");
      });
  }, [accionesPorEntidad]);

  const municipiosDisponibles = useMemo(() => {
    const base = accionesPorEntidad.filter(
      (accion) => filtroIsla === "todas" || clean(accion.isla) === filtroIsla
    );

    return Array.from(new Set(base.map((accion) => clean(accion.municipio))))
      .filter((value) => value !== "—")
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [accionesPorEntidad, filtroIsla]);

  const accionesFiltradas = useMemo(() => {
    return accionesPlanificables2026.filter((accion) => {
      const entidadOk =
        filtroEntidad === "todas" || clean(accion.entidad_nombre) === filtroEntidad;
      const islaOk = filtroIsla === "todas" || clean(accion.isla) === filtroIsla;
      const municipioOk =
        filtroMunicipio === "todos" || clean(accion.municipio) === filtroMunicipio;
      const tipoOk = filtroTipo === "todos" || clean(accion.tipo_oferta) === filtroTipo;
      const estadoOk =
        filtroEstado === "todos" || clean(accion.estado_operativo_administrativo) === filtroEstado;

      return entidadOk && islaOk && municipioOk && tipoOk && estadoOk;
    });
  }, [
    accionesPlanificables2026,
    filtroEntidad,
    filtroEstado,
    filtroIsla,
    filtroMunicipio,
    filtroTipo,
  ]);

  const accionesSinFechaFiltradas = useMemo(() => {
    return acciones.filter((accion) => {
      if (accionTieneRangoTemporal(accion)) return false;
      const entidadOk =
        filtroEntidad === "todas" || clean(accion.entidad_nombre) === filtroEntidad;
      const islaOk = filtroIsla === "todas" || clean(accion.isla) === filtroIsla;
      const municipioOk =
        filtroMunicipio === "todos" || clean(accion.municipio) === filtroMunicipio;
      const tipoOk = filtroTipo === "todos" || clean(accion.tipo_oferta) === filtroTipo;
      const estadoOk =
        filtroEstado === "todos" || clean(accion.estado_operativo_administrativo) === filtroEstado;
      return entidadOk && islaOk && municipioOk && tipoOk && estadoOk;
    });
  }, [acciones, filtroEntidad, filtroEstado, filtroIsla, filtroMunicipio, filtroTipo]);

  const resumenFiltrado = useMemo(() => {
    return accionesFiltradas.reduce(
      (acc, accion) => {
        acc.total += 1;
        if (accion.estado_operativo_administrativo === "finalizada") acc.finalizadas += 1;
        if (accion.estado_operativo_administrativo === "en_ejecucion") acc.enEjecucion += 1;
        if (accion.estado_operativo_administrativo === "pendiente_ejecutar") acc.pendientes += 1;
        if (accion.tipo_oferta === "AF") acc.af += 1;
        if (accion.tipo_oferta === "CP") acc.cp += 1;
        return acc;
      },
      { total: 0, finalizadas: 0, enEjecucion: 0, pendientes: 0, af: 0, cp: 0 }
    );
  }, [accionesFiltradas]);

  const monthDays = useMemo(() => getMonthDays(YEAR, mes), [mes]);
  const weekDays = useMemo(() => getWeekDays(semanaBase), [semanaBase]);

  const periodoMesInicio = new Date(YEAR, mes, 1);
  const periodoMesFin = new Date(YEAR, mes + 1, 0);
  const periodoSemanaInicio = weekDays[0];
  const periodoSemanaFin = weekDays[6];

  const accionesMes = accionesFiltradas.filter((accion) =>
    accionCruzaRango(accion, periodoMesInicio, periodoMesFin)
  );

  const accionesSemana = accionesFiltradas.filter((accion) =>
    accionCruzaRango(accion, periodoSemanaInicio, periodoSemanaFin)
  );

  const islasPlanningAnual =
    filtroIsla === "todas"
      ? ordenIslas.filter((isla) =>
          accionesFiltradas.some((accion) => clean(accion.isla) === isla)
        )
      : [filtroIsla];

  function limpiarFiltros() {
    setFiltroEntidad("todas");
    setFiltroIsla("todas");
    setFiltroMunicipio("todos");
    setFiltroTipo("todos");
    setFiltroEstado("todos");
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold">Planificación de ejecución</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Vista visual de AF y CP por año, mes y semana. Convocatoria 2026 completa y entidades beneficiarias.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-blue-50">
            {loading ? "…" : num(resumenConvocatoria.total)} AF/CP ·{" "}
            {loading ? "…" : num(resumenConvocatoria.entidades)} entidades beneficiarias
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-3">
        {errorLectura ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 shadow-sm">
            {errorLectura}
          </section>
        ) : null}

        <section className="grid gap-2 md:grid-cols-6">
          <KpiCard
            label="Acciones concedidas"
            value={loading ? "…" : num(resumenConvocatoria.total)}
            detail={`${num(resumenConvocatoria.af)} AF · ${num(resumenConvocatoria.cp)} CP`}
          />
          <KpiCard
            label="Con fecha completa"
            value={loading ? "…" : num(resumenConvocatoria.conFechaCompleta)}
            detail="visibles en planificación"
          />
          <KpiCard
            label="Sin fecha comunicada"
            value={loading ? "…" : num(resumenConvocatoria.sinFechaCompleta)}
            detail="pendientes de inicio"
          />
          <KpiCard
            label="En ejecución"
            value={loading ? "…" : num(resumenConvocatoria.enEjecucion)}
            detail="actividad viva"
          />
          <KpiCard
            label="Finalizadas"
            value={loading ? "…" : num(resumenConvocatoria.finalizadas)}
            detail="acciones cerradas"
          />
          <KpiCard
            label="Pendientes"
            value={loading ? "…" : num(resumenConvocatoria.pendientes)}
            detail="pendientes de ejecutar"
          />
        </section>

        {!loading && resumenConvocatoria.sinFechaCompleta > 0 ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 shadow-sm">
            <span className="font-bold">
              {num(resumenConvocatoria.sinFechaCompleta)} acciones pendientes de ejecutar sin comunicación temporal de inicio/fin.
            </span>{" "}
            No desaparecen del control: quedan identificadas como pendientes de comunicación de arranque por parte de la entidad beneficiaria.
            {accionesSinFechaFiltradas.length !== resumenConvocatoria.sinFechaCompleta ? (
              <span> Con los filtros actuales: {num(accionesSinFechaFiltradas.length)}.</span>
            ) : null}{" "}
            Calendario no lectivo configurado por ambito territorial: fines de semana y festivos se aplican segun isla/municipio de cada accion.
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[0.8fr_0.8fr_1.35fr_1fr_1fr_0.8fr_0.9fr_auto]">
            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Vista
              </label>
              <select
                value={vista}
                onChange={(event) => setVista(event.target.value as VistaPlanning)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                <option value="anio">Año</option>
                <option value="mes">Mes</option>
                <option value="semana">Semana</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Mes
              </label>
              <select
                value={mes}
                onChange={(event) => setMes(Number(event.target.value))}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                {mesesES.map((nombre, index) => (
                  <option key={nombre} value={index}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad beneficiaria
              </label>
              <select
                value={filtroEntidad}
                onChange={(event) => {
                  setFiltroEntidad(event.target.value);
                  setFiltroIsla("todas");
                  setFiltroMunicipio("todos");
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                <option value="todas">Todas</option>
                {entidadesDisponibles.map((entidad) => (
                  <option key={entidad} value={entidad}>
                    {entidad}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Isla
              </label>
              <select
                value={filtroIsla}
                onChange={(event) => {
                  setFiltroIsla(event.target.value);
                  setFiltroMunicipio("todos");
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                <option value="todas">Todas</option>
                {islasDisponibles.map((isla) => (
                  <option key={isla} value={isla}>
                    {isla}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Municipio
              </label>
              <select
                value={filtroMunicipio}
                onChange={(event) => setFiltroMunicipio(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                <option value="todos">Todos</option>
                {municipiosDisponibles.map((municipio) => (
                  <option key={municipio} value={municipio}>
                    {municipio}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(event) => setFiltroTipo(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                <option value="todos">Todos</option>
                <option value="AF">AF</option>
                <option value="CP">CP</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                <option value="todos">Todos</option>
                <option value="finalizada">Finalizada</option>
                <option value="en_ejecucion">En ejecución</option>
                <option value="pendiente_ejecutar">Pendiente</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
            Cargando planning completo...
          </section>
        ) : null}

        {!loading && vista === "anio" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-950">Vista anual {YEAR}</h2>
                <p className="text-[10px] text-slate-500">
                  {num(resumenFiltrado.total)} acciones planificables visibles · {num(resumenFiltrado.af)} AF · {num(resumenFiltrado.cp)} CP
                </p>
              </div>

              <div className="flex gap-3 text-[10px] text-slate-500">
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-300" />Finalizadas</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-300" />En ejecución</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300" />Pendientes</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="grid min-w-[1080px] grid-cols-[120px_repeat(12,minmax(76px,1fr))] gap-1 text-[10px]">
                <div />
                {mesesES.map((month) => (
                  <div key={month} className="rounded-md bg-slate-100 px-2 py-1 text-center font-bold text-slate-600">
                    {month.slice(0, 3)}
                  </div>
                ))}

                {islasPlanningAnual.map((isla) => {
                  const accionesIsla = accionesFiltradas.filter((accion) => clean(accion.isla) === isla);

                  return (
                    <div key={isla} className="contents">
                      <div className="flex items-center rounded-md bg-slate-50 px-2 py-1 font-bold text-slate-700">
                        {isla}
                      </div>

                      {Array.from({ length: 12 }, (_, monthIndex) => (
                        <MonthMassCell
                          key={`${isla}-${monthIndex}`}
                          summary={summarizeMonth(accionesIsla, monthIndex, YEAR)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && vista === "mes" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-950">
                Vista mensual · {mesesES[mes]} {YEAR}
              </h2>
              <p className="text-[10px] text-slate-500">
                No lectivos marcados como NL. Información ampliada al pasar el ratón.
              </p>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((day) => (
                <DayCell
                  key={isoDate(day)}
                  date={day}
                  acciones={accionesFiltradas}
                  festivos={festivos}
                  isla={filtroIsla}
                  municipio={filtroMunicipio}
                />
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Barras temporales del mes
              </p>
              <div className="max-h-[360px] overflow-y-auto pr-1">
                {accionesMes.slice(0, 160).map((accion) => (
                  <AccionBar
                    key={`${accion.oferta_id}-${accion.subexpediente_id}`}
                    accion={accion}
                    periodoInicio={periodoMesInicio}
                    periodoFin={periodoMesFin}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && vista === "semana" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black text-slate-950">
                Vista semanal · {formatDate(periodoSemanaInicio)} - {formatDate(periodoSemanaFin)}
              </h2>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSemanaBase((date) => addDays(date, -7))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  Semana anterior
                </button>
                <button
                  type="button"
                  onClick={() => setSemanaBase((date) => addDays(date, 7))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  Semana siguiente
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <DayCell
                  key={isoDate(day)}
                  date={day}
                  acciones={accionesFiltradas}
                  festivos={festivos}
                  isla={filtroIsla}
                  municipio={filtroMunicipio}
                />
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Barras temporales de la semana
              </p>
              <div className="max-h-[360px] overflow-y-auto pr-1">
                {accionesSemana.slice(0, 160).map((accion) => (
                  <AccionBar
                    key={`${accion.oferta_id}-${accion.subexpediente_id}`}
                    accion={accion}
                    periodoInicio={periodoSemanaInicio}
                    periodoFin={periodoSemanaFin}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </section>

      <span className="hidden">{VERSION_PLANNING}</span>
    </main>
  );
}
