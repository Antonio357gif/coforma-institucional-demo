"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const VERSION_RECEPCION_DOCUMENTACION = "2026-05-07-rpc-viva-paginada-lenguaje-institucional";

type ResumenDocumental = {
  documentos_total: number;
  no_recibidos: number;
  recibidos: number;
  en_revision: number;
  validados: number;
  subsanables: number;
  rechazados: number;
  vencidos: number;
  no_aplica: number;
  riesgo_alto: number;
  riesgo_critico: number;
  riesgo_alto_critico: number;
  obligatorios: number;
  condicionales: number;
  recomendados: number;
  vencidos_por_fecha: number;
  ofertas: number;
  subexpedientes: number;
  entidades: number;
  calculado_en: string | null;
  riesgo_activo_alto_critico: number;
  riesgo_prioritario_alto_critico: number;
  riesgo_vencido_alto_critico: number;
};

type AccionResumenRow = {
  subexpediente_id: number;
  oferta_id: number | null;
  entidad_id: number | null;
  entidad_nombre: string | null;
  entidad_cif: string | null;
  entidad_isla: string | null;
  entidad_municipio: string | null;

  codigo_accion: string | null;
  denominacion: string | null;
  tipo_oferta: string | null;
  codigo_especialidad: string | null;
  familia_profesional: string | null;
  modalidad: string | null;
  horas: number | null;
  alumnos_previstos: number | null;
  importe_concedido: number | null;
  centro_formacion: string | null;
  oferta_isla: string | null;
  oferta_municipio: string | null;
  oferta_fecha_inicio_prevista: string | null;
  oferta_fecha_fin_prevista: string | null;

  convocatoria_id: number | null;
  convocatoria_codigo: string | null;
  convocatoria_nombre: string | null;

  estado_operativo_administrativo: string | null;
  prioridad_tecnica: string | null;
  documentacion_estado_subexpediente: string | null;
  riesgo_administrativo: string | null;
  riesgo_economico: string | null;
  requerimientos_pendientes: number | null;
  incidencias_abiertas: number | null;
  estado_pago_administrativo: string | null;

  documentos_total: number;

  inicio_total: number;
  inicio_validado: number;
  inicio_recibido: number;
  inicio_en_revision: number;
  inicio_no_recibido: number;
  inicio_no_aplica: number;
  inicio_riesgo_activo: number;

  seguimiento_total: number;
  seguimiento_validado: number;
  seguimiento_recibido: number;
  seguimiento_en_revision: number;
  seguimiento_no_recibido: number;
  seguimiento_no_aplica: number;
  seguimiento_riesgo_activo: number;

  finalizacion_total: number;
  finalizacion_validado: number;
  finalizacion_recibido: number;
  finalizacion_en_revision: number;
  finalizacion_no_recibido: number;
  finalizacion_no_aplica: number;
  finalizacion_riesgo_activo: number;

  justificacion_total: number;
  justificacion_validado: number;
  justificacion_recibido: number;
  justificacion_en_revision: number;
  justificacion_no_recibido: number;
  justificacion_no_aplica: number;
  justificacion_riesgo_activo: number;

  cierre_total: number;
  cierre_validado: number;
  cierre_recibido: number;
  cierre_en_revision: number;
  cierre_no_recibido: number;
  cierre_no_aplica: number;
  cierre_riesgo_activo: number;

  documentos_validados: number;
  documentos_recibidos: number;
  documentos_en_revision: number;
  documentos_no_recibidos: number;
  documentos_no_aplica: number;
  documentos_requieren_subsanacion: number;
  documentos_con_riesgo_activo: number;

  lectura_documental: string | null;
};

type RecepcionRow = {
  recepcion_id: number;
  oferta_id: number;
  subexpediente_id: number;
  documento_normativo_id: number;

  fase: string;
  subfase: string | null;
  nombre_documento: string;
  estado_documental: string;
  obligatoriedad: string;
  riesgo_actual: string;
  fecha_limite: string | null;
  fecha_recepcion: string | null;
  fecha_revision: string | null;
  tecnico_revisor: string | null;
  requiere_subsanacion: boolean;
  fecha_requerimiento: string | null;
  fecha_subsanacion: string | null;
  comunicado_ente_fiscalizador: boolean;
  observaciones: string | null;

  codigo_documento_sce: string | null;
  codigo_documento_ministerio: string | null;
  condicion_aplicacion: string | null;
  plazo_relativo: string | null;
  periodicidad: string | null;
  actuacion_sugerida: string | null;
  fuente_nombre: string | null;
  fuente_url: string | null;
  orden: number | null;

  criticidad_documental: string | null;
  riesgo_activo_documental: string | null;
  riesgo_activo_label: string | null;
};

type DraftRow = {
  estado_documental: string;
  observaciones: string;
  tecnico_revisor: string;
  comunicado_ente_fiscalizador: boolean;
};

type SelectOption = {
  value: string;
  label: string;
};

type FaseKey = "inicio" | "seguimiento" | "finalizacion" | "justificacion" | "cierre";

const PAGE_SIZE_OPTIONS = [15, 25, 50];

const faseOrder: FaseKey[] = [
  "inicio",
  "seguimiento",
  "finalizacion",
  "justificacion",
  "cierre",
];

const faseOptions: SelectOption[] = [
  { value: "todos", label: "Todas" },
  { value: "inicio", label: "Inicio" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "finalizacion", label: "Finalización" },
  { value: "justificacion", label: "Justificación" },
  { value: "cierre", label: "Cierre" },
];

const estadoOptions: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "no_recibido", label: "No recibido" },
  { value: "recibido", label: "Recibido" },
  { value: "en_revision", label: "En revisión" },
  { value: "validado", label: "Validado" },
  { value: "subsanable", label: "Subsanable" },
  { value: "rechazado", label: "Rechazado" },
  { value: "vencido", label: "Vencido" },
  { value: "no_aplica", label: "No aplica" },
];

const tecnicoOptions: SelectOption[] = [
  { value: "", label: "Sin asignar" },
  { value: "Técnico SCE 01", label: "Técnico SCE 01" },
  { value: "Técnico SCE 02", label: "Técnico SCE 02" },
  { value: "Unidad de seguimiento", label: "Unidad de seguimiento" },
  { value: "Unidad de seguimiento SCE", label: "Unidad de seguimiento SCE" },
  { value: "Unidad de justificación", label: "Unidad de justificación" },
  { value: "Unidad de justificación SCE", label: "Unidad de justificación SCE" },
  { value: "Unidad de fiscalización", label: "Unidad de fiscalización" },
];

const estadoOperativoOptions: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "pendiente_ejecutar", label: "Pendiente ejecutar" },
  { value: "en_ejecucion", label: "En ejecución" },
  { value: "en_ejecucion_con_incidencia", label: "En ejecución con incidencia" },
  { value: "finalizada", label: "Finalizada" },
  { value: "finalizada_pendiente_justificacion", label: "Finalizada pendiente justificar" },
  { value: "riesgo_reintegro", label: "Riesgo reintegro" },
];

const lecturaOptions: SelectOption[] = [
  { value: "todos", label: "Todas" },
  { value: "riesgo_activo", label: "Riesgo activo" },
  { value: "documentacion_no_recibida", label: "No recibida" },
  { value: "documentacion_en_revision", label: "En revisión" },
  { value: "subsanacion_pendiente", label: "Subsanación" },
  { value: "documentacion_validada", label: "Validada" },
  { value: "seguimiento_documental", label: "Seguimiento" },
];

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Number(value ?? 0));
}

function eur(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function labelFromOptions(options: SelectOption[], value: string | null | undefined) {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label ?? value;
}

function clean(value: string | null | undefined, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function shortText(value: string | null | undefined, length = 78) {
  const text = clean(value, "");
  if (!text) return "—";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function estadoBadgeClass(value: string | null | undefined) {
  const estado = (value ?? "").toLowerCase();

  if (estado === "validado") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (estado === "recibido") return "border-blue-200 bg-blue-50 text-blue-800";
  if (estado === "en_revision") return "border-amber-200 bg-amber-50 text-amber-800";
  if (estado === "subsanable") return "border-orange-200 bg-orange-50 text-orange-800";
  if (estado === "vencido" || estado === "rechazado") return "border-red-200 bg-red-50 text-red-800";
  if (estado === "no_aplica") return "border-slate-200 bg-slate-50 text-slate-500";

  return "border-slate-200 bg-white text-slate-700";
}

function faseBadgeClass(value: string | null | undefined) {
  const fase = (value ?? "").toLowerCase();

  if (fase === "inicio") return "border-blue-200 bg-blue-50 text-blue-800";
  if (fase === "seguimiento") return "border-cyan-200 bg-cyan-50 text-cyan-800";
  if (fase === "finalizacion") return "border-violet-200 bg-violet-50 text-violet-800";
  if (fase === "justificacion") return "border-orange-200 bg-orange-50 text-orange-800";
  if (fase === "cierre") return "border-slate-300 bg-slate-100 text-slate-800";

  return "border-slate-200 bg-white text-slate-700";
}

function criticidadBadgeClass(value: string | null | undefined) {
  const criticidad = (value ?? "").toLowerCase();

  if (criticidad === "critico") return "border-red-300 bg-red-50 text-red-800";
  if (criticidad === "alto") return "border-rose-200 bg-rose-50 text-rose-800";
  if (criticidad === "medio") return "border-amber-200 bg-amber-50 text-amber-800";
  if (criticidad === "bajo") return "border-emerald-200 bg-emerald-50 text-emerald-800";

  return "border-slate-200 bg-white text-slate-700";
}

function riesgoActivoBadgeClass(value: string | null | undefined) {
  const riesgo = (value ?? "").toLowerCase();

  if (riesgo === "critico") return "border-red-300 bg-red-50 text-red-800";
  if (riesgo === "alto") return "border-rose-200 bg-rose-50 text-rose-800";

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function operativoBadgeClass(value: string | null | undefined) {
  const estado = (value ?? "").toLowerCase();

  if (estado === "riesgo_reintegro") return "border-red-200 bg-red-50 text-red-800";
  if (estado === "en_ejecucion_con_incidencia") return "border-amber-200 bg-amber-50 text-amber-800";
  if (estado === "finalizada_pendiente_justificacion") return "border-violet-200 bg-violet-50 text-violet-800";
  if (estado === "finalizada") return "border-slate-300 bg-slate-100 text-slate-800";
  if (estado === "en_ejecucion") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (estado === "pendiente_ejecutar") return "border-blue-200 bg-blue-50 text-blue-800";

  return "border-slate-200 bg-white text-slate-700";
}

function lecturaBadgeClass(value: string | null | undefined) {
  const lectura = (value ?? "").toLowerCase();

  if (lectura === "riesgo_activo") return "border-red-200 bg-red-50 text-red-800";
  if (lectura === "documentacion_no_recibida") return "border-orange-200 bg-orange-50 text-orange-800";
  if (lectura === "documentacion_en_revision") return "border-amber-200 bg-amber-50 text-amber-800";
  if (lectura === "subsanacion_pendiente") return "border-violet-200 bg-violet-50 text-violet-800";
  if (lectura === "documentacion_validada") return "border-emerald-200 bg-emerald-50 text-emerald-800";

  return "border-slate-200 bg-white text-slate-700";
}

function pagoBadgeClass(value: string | null | undefined) {
  const pago = (value ?? "").toLowerCase();

  if (pago === "autorizado" || pago === "pagado") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (pago === "pendiente") return "border-amber-200 bg-amber-50 text-amber-800";
  if (pago === "no_devengado") return "border-slate-200 bg-slate-50 text-slate-600";
  if (pago === "bloqueado" || pago === "retenido") return "border-red-200 bg-red-50 text-red-800";
  if (pago === "en_ejecucion_no_abonado") return "border-blue-200 bg-blue-50 text-blue-800";
  if (pago === "pendiente_justificacion") return "border-violet-200 bg-violet-50 text-violet-800";

  return "border-slate-200 bg-white text-slate-700";
}

function SmallBadge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function KpiCard({
  label,
  value,
  detail,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "blue" | "green" | "amber" | "red" | "slate" | "violet";
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
      : tone === "violet"
      ? "border-violet-200 hover:border-violet-400"
      : tone === "slate"
      ? "border-slate-200 hover:border-slate-400"
      : "border-slate-200 hover:border-blue-300";

  const content = (
    <>
      <p className="truncate text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[16px] font-semibold leading-5 text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">
        {detail}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`min-h-[62px] rounded-xl border bg-white px-3 py-1.5 text-left shadow-sm transition ${toneClass}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`min-h-[62px] rounded-xl border bg-white px-3 py-1.5 shadow-sm ${toneClass}`}>
      {content}
    </div>
  );
}

function makeDraft(row: RecepcionRow): DraftRow {
  return {
    estado_documental: row.estado_documental,
    observaciones: row.observaciones ?? "",
    tecnico_revisor: row.tecnico_revisor ?? "",
    comunicado_ente_fiscalizador: row.comunicado_ente_fiscalizador ?? false,
  };
}

function faseStats(row: AccionResumenRow, fase: FaseKey) {
  if (fase === "inicio") {
    return {
      total: row.inicio_total,
      validado: row.inicio_validado,
      recibido: row.inicio_recibido,
      enRevision: row.inicio_en_revision,
      noRecibido: row.inicio_no_recibido,
      noAplica: row.inicio_no_aplica,
      riesgoActivo: row.inicio_riesgo_activo,
    };
  }

  if (fase === "seguimiento") {
    return {
      total: row.seguimiento_total,
      validado: row.seguimiento_validado,
      recibido: row.seguimiento_recibido,
      enRevision: row.seguimiento_en_revision,
      noRecibido: row.seguimiento_no_recibido,
      noAplica: row.seguimiento_no_aplica,
      riesgoActivo: row.seguimiento_riesgo_activo,
    };
  }

  if (fase === "finalizacion") {
    return {
      total: row.finalizacion_total,
      validado: row.finalizacion_validado,
      recibido: row.finalizacion_recibido,
      enRevision: row.finalizacion_en_revision,
      noRecibido: row.finalizacion_no_recibido,
      noAplica: row.finalizacion_no_aplica,
      riesgoActivo: row.finalizacion_riesgo_activo,
    };
  }

  if (fase === "justificacion") {
    return {
      total: row.justificacion_total,
      validado: row.justificacion_validado,
      recibido: row.justificacion_recibido,
      enRevision: row.justificacion_en_revision,
      noRecibido: row.justificacion_no_recibido,
      noAplica: row.justificacion_no_aplica,
      riesgoActivo: row.justificacion_riesgo_activo,
    };
  }

  return {
    total: row.cierre_total,
    validado: row.cierre_validado,
    recibido: row.cierre_recibido,
    enRevision: row.cierre_en_revision,
    noRecibido: row.cierre_no_recibido,
    noAplica: row.cierre_no_aplica,
    riesgoActivo: row.cierre_riesgo_activo,
  };
}

function faseResumenText(row: AccionResumenRow, fase: FaseKey) {
  const stats = faseStats(row, fase);

  if (stats.riesgoActivo > 0) return `${num(stats.riesgoActivo)} riesgo`;
  if (stats.enRevision > 0) return `${num(stats.enRevision)} revisión`;
  if (stats.noRecibido > 0) return `${num(stats.noRecibido)} no recib.`;
  if (stats.total > 0 && stats.validado === stats.total) return `${num(stats.validado)}/${num(stats.total)} valid.`;

  if (stats.total > 0 && stats.validado + stats.recibido === stats.total) {
    return `${num(stats.validado)} val. · ${num(stats.recibido)} rec.`;
  }

  if (stats.total > 0 && stats.noAplica === stats.total) return "No aplica";
  if (stats.total === 0) return "—";

  return `${num(stats.validado)}/${num(stats.total)}`;
}

function faseResumenClass(row: AccionResumenRow, fase: FaseKey) {
  const stats = faseStats(row, fase);

  if (stats.riesgoActivo > 0) return "border-red-200 bg-red-50 text-red-800";
  if (stats.noRecibido > 0) return "border-orange-200 bg-orange-50 text-orange-800";
  if (stats.enRevision > 0) return "border-amber-200 bg-amber-50 text-amber-800";
  if (stats.total > 0 && stats.validado === stats.total) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (stats.total > 0 && stats.validado + stats.recibido === stats.total) return "border-blue-200 bg-blue-50 text-blue-800";
  if (stats.total > 0 && stats.noAplica === stats.total) return "border-slate-200 bg-slate-50 text-slate-500";

  return "border-slate-200 bg-white text-slate-700";
}

function detallePorFase(rows: RecepcionRow[]) {
  return faseOrder.map((fase) => ({
    fase,
    rows: rows.filter((row) => row.fase === fase),
  }));
}

export default function RecepcionDocumentacionPage() {
  const bandejaRef = useRef<HTMLDivElement | null>(null);
  const mesaRef = useRef<HTMLDivElement | null>(null);
  const reglaRef = useRef<HTMLDivElement | null>(null);

  const [resumen, setResumen] = useState<ResumenDocumental | null>(null);
  const [acciones, setAcciones] = useState<AccionResumenRow[]>([]);
  const [loadingAcciones, setLoadingAcciones] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [selectedAccion, setSelectedAccion] = useState<AccionResumenRow | null>(null);
  const [detalleRows, setDetalleRows] = useState<RecepcionRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const [loadingResumen, setLoadingResumen] = useState(true);
  const [resumenError, setResumenError] = useState<string | null>(null);
  const [accionesError, setAccionesError] = useState<string | null>(null);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const inicio = (pagina - 1) * pageSize;

  const resumenCalculado = useMemo(() => {
    return {
      total: resumen?.documentos_total ?? 0,
      noRecibidos: resumen?.no_recibidos ?? 0,
      recibidos: resumen?.recibidos ?? 0,
      enRevision: resumen?.en_revision ?? 0,
      validados: resumen?.validados ?? 0,
      subsanables: resumen?.subsanables ?? 0,
      vencidos: resumen?.vencidos ?? 0,
      noAplica: resumen?.no_aplica ?? 0,
      riesgoActivoAltoCritico: resumen?.riesgo_activo_alto_critico ?? 0,
      riesgoPrioritarioAltoCritico: resumen?.riesgo_prioritario_alto_critico ?? 0,
      riesgoVencidoAltoCritico: resumen?.riesgo_vencido_alto_critico ?? 0,
      ofertas: resumen?.ofertas ?? 0,
      subexpedientes: resumen?.subexpedientes ?? 0,
      entidades: resumen?.entidades ?? 0,
      obligatorios: resumen?.obligatorios ?? 0,
      condicionales: resumen?.condicionales ?? 0,
    };
  }, [resumen]);

  async function loadResumen() {
    setLoadingResumen(true);
    setResumenError(null);

    const { data, error } = await supabase
      .from("v_recepcion_documentacion_resumen")
      .select("*")
      .maybeSingle();

    if (error) {
      setResumenError(error.message);
      setLoadingResumen(false);
      return;
    }

    setResumen((data ?? null) as ResumenDocumental | null);
    setLoadingResumen(false);
  }

  async function loadAcciones() {
    setLoadingAcciones(true);
    setAccionesError(null);

    try {
      const { data, error } = await supabase.rpc(
        "get_recepcion_documentacion_acciones_pagina",
        {
          p_limit: pageSize + 1,
          p_offset: inicio,
        }
      );

      if (error) {
        setAccionesError(error.message);
        setAcciones([]);
        setHasNextPage(false);
        setLoadingAcciones(false);
        return;
      }

      const loadedFull = (data ?? []) as AccionResumenRow[];
      const loadedVisible = loadedFull.slice(0, pageSize);

      setAcciones(loadedVisible);
      setHasNextPage(loadedFull.length > pageSize);

      setSelectedAccion((current) => {
        if (!current) return null;

        const refreshed = loadedVisible.find(
          (item) => item.subexpediente_id === current.subexpediente_id
        );

        return refreshed ?? current;
      });

      setLoadingAcciones(false);
    } catch (err: any) {
      setAccionesError(err?.message ?? "No se pudo cargar la bandeja documental.");
      setAcciones([]);
      setHasNextPage(false);
      setLoadingAcciones(false);
    }
  }

  async function loadDetalle(subexpedienteId: number | null) {
    if (!subexpedienteId) {
      setDetalleRows([]);
      setDrafts({});
      setDetalleError(null);
      return;
    }

    setLoadingDetalle(true);
    setDetalleError(null);

    try {
      const { data, error } = await supabase
        .from("v_recepcion_documentacion_panel")
        .select("*")
        .eq("subexpediente_id", subexpedienteId)
        .order("orden", { ascending: true })
        .order("recepcion_id", { ascending: true });

      if (error) {
        setDetalleError(error.message);
        setDetalleRows([]);
        setDrafts({});
        setLoadingDetalle(false);
        return;
      }

      const loadedRows = (data ?? []) as RecepcionRow[];
      const nextDrafts: Record<number, DraftRow> = {};

      loadedRows.forEach((row) => {
        nextDrafts[row.recepcion_id] = makeDraft(row);
      });

      setDetalleRows(loadedRows);
      setDrafts(nextDrafts);
      setLoadingDetalle(false);
    } catch (err: any) {
      setDetalleError(err?.message ?? "No se pudo cargar la mesa documental.");
      setDetalleRows([]);
      setDrafts({});
      setLoadingDetalle(false);
    }
  }

  useEffect(() => {
    loadResumen();
  }, []);

  useEffect(() => {
    loadAcciones();
  }, [pagina, pageSize]);

  useEffect(() => {
    loadDetalle(selectedAccion?.subexpediente_id ?? null);
  }, [selectedAccion?.subexpediente_id]);

  function scrollToBandeja() {
    bandejaRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function scrollToMesa() {
    mesaRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function scrollToRegla() {
    reglaRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function abrirMesa(accion: AccionResumenRow) {
    setSelectedAccion(accion);

    window.setTimeout(() => {
      scrollToMesa();
    }, 120);
  }

  function cerrarMesa() {
    setSelectedAccion(null);
    setDetalleRows([]);
    setDrafts({});
    setDetalleError(null);

    window.setTimeout(() => {
      scrollToBandeja();
    }, 80);
  }

  function updateDraft(id: number, changes: Partial<DraftRow>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {
          estado_documental: "no_recibido",
          observaciones: "",
          tecnico_revisor: "",
          comunicado_ente_fiscalizador: false,
        }),
        ...changes,
      },
    }));
  }

  function rowHasChanges(row: RecepcionRow) {
    const draft = drafts[row.recepcion_id];
    if (!draft) return false;

    return (
      draft.estado_documental !== row.estado_documental ||
      draft.observaciones !== (row.observaciones ?? "") ||
      draft.tecnico_revisor !== (row.tecnico_revisor ?? "") ||
      draft.comunicado_ente_fiscalizador !== Boolean(row.comunicado_ente_fiscalizador)
    );
  }

  async function guardarFila(row: RecepcionRow) {
    const draft = drafts[row.recepcion_id];

    if (!draft) return;

    setSavingId(row.recepcion_id);
    setSavedId(null);
    setSaveError(null);

    const nowIso = new Date().toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const updatePayload: Record<string, any> = {
      estado_documental: draft.estado_documental,
      observaciones: draft.observaciones.trim() === "" ? null : draft.observaciones.trim(),
      tecnico_revisor: draft.tecnico_revisor.trim() === "" ? null : draft.tecnico_revisor.trim(),
      comunicado_ente_fiscalizador: draft.comunicado_ente_fiscalizador,
      updated_at: nowIso,
    };

    if (draft.estado_documental === "recibido" && !row.fecha_recepcion) {
      updatePayload.fecha_recepcion = nowIso;
    }

    if (
      ["en_revision", "validado", "rechazado", "subsanable", "vencido"].includes(
        draft.estado_documental
      )
    ) {
      updatePayload.fecha_revision = nowIso;
    }

    if (draft.estado_documental === "subsanable" || draft.estado_documental === "rechazado") {
      updatePayload.requiere_subsanacion = true;

      if (!row.fecha_requerimiento) {
        updatePayload.fecha_requerimiento = today;
      }
    }

    if (draft.estado_documental === "validado") {
      updatePayload.requiere_subsanacion = false;

      if (row.estado_documental === "subsanable" || row.requiere_subsanacion) {
        updatePayload.fecha_subsanacion = today;
      }

      if (!row.fecha_revision) {
        updatePayload.fecha_revision = nowIso;
      }
    }

    if (draft.estado_documental === "no_aplica") {
      updatePayload.requiere_subsanacion = false;
    }

    const { error } = await supabase
      .from("recepcion_documentacion")
      .update(updatePayload)
      .eq("id", row.recepcion_id);

    if (error) {
      setSaveError(error.message);
      setSavingId(null);
      return;
    }

    setSavingId(null);
    setSavedId(row.recepcion_id);

    await loadDetalle(row.subexpediente_id);
    loadResumen();
    loadAcciones();

    window.setTimeout(() => {
      setSavedId((current) => (current === row.recepcion_id ? null : current));
    }, 1800);
  }

  const selectedDetalleAgrupado = useMemo(() => {
    return detallePorFase(detalleRows);
  }, [detalleRows]);

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold">Recepción documental</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Control técnico de documentación por subexpediente, fase y estado de revisión.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
              {loadingResumen
                ? "Calculando resumen..."
                : resumen
                ? `${num(acciones.length)} subexpedientes visibles · ${num(resumenCalculado.subexpedientes)} subexpedientes en resolución`
                : `${num(acciones.length)} subexpedientes visibles · resumen no disponible`}
            </div>
            <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-100">
              Control documental sobre {num(resumenCalculado.total)} registros vivos
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-2 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              ← Volver al dashboard
            </Link>

            <Link
              href="/oferta-formativa"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Oferta
            </Link>

            <Link
              href="/alertas"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Alertas
            </Link>

            <Link
              href="/justificacion-economica"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Justificación económica
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm">
              {num(resumenCalculado.ofertas)} ofertas · {num(resumenCalculado.subexpedientes)} subexpedientes · {num(resumenCalculado.entidades)} entidades
            </span>

            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-800 shadow-sm">
              Guardado directo sobre recepcion_documentacion
            </span>
          </div>
        </div>

        {resumenError ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 shadow-sm">
            No se pudo actualizar el resumen documental en este intento. La bandeja puede seguir operativa.
            <button
              type="button"
              onClick={loadResumen}
              className="ml-2 rounded-lg border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
            >
              Reintentar resumen
            </button>
          </section>
        ) : null}

        {accionesError ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 shadow-sm">
            No se pudo cargar la bandeja documental en este intento: {accionesError}
            <button
              type="button"
              onClick={loadAcciones}
              className="ml-2 rounded-lg border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-800 hover:bg-red-100"
            >
              Reintentar bandeja
            </button>
          </section>
        ) : null}

        {saveError ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 shadow-sm">
            No se pudo guardar el cambio documental: {saveError}
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="ml-2 rounded-lg border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-800 hover:bg-red-100"
            >
              Cerrar aviso
            </button>
          </section>
        ) : null}

        <section className="grid gap-2 lg:grid-cols-7">
          <KpiCard
            label="Controles documentales"
            value={num(resumenCalculado.total)}
            detail={`${num(resumenCalculado.obligatorios)} oblig. · ${num(resumenCalculado.condicionales)} cond.`}
          />

          <KpiCard
            label="No recibidos"
            value={num(resumenCalculado.noRecibidos)}
            detail="pendientes documentales"
            tone="slate"
          />

          <KpiCard
            label="En revisión"
            value={num(resumenCalculado.enRevision)}
            detail="pendientes de validar"
            tone="amber"
          />

          <KpiCard
            label="Validados"
            value={num(resumenCalculado.validados)}
            detail="documentación conforme"
            tone="green"
          />

          <KpiCard
            label="Subsanables"
            value={num(resumenCalculado.subsanables)}
            detail="requieren actuación"
            tone="amber"
          />

          <KpiCard
            label="Riesgo activo"
            value={num(resumenCalculado.riesgoActivoAltoCritico)}
            detail={`${num(resumenCalculado.riesgoPrioritarioAltoCritico)} priorit. · ${num(resumenCalculado.riesgoVencidoAltoCritico)} vencidos`}
            tone="red"
          />

          <KpiCard
            label="Lectura técnica"
            value="Paginada"
            detail="sobre dato vivo"
            tone="blue"
          />
        </section>

        <section className="space-y-2">
          <section
            ref={bandejaRef}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-1.5">
              <div>
                <h2 className="text-[14px] font-semibold leading-5">
                  Bandeja documental por subexpediente
                </h2>
                <p className="text-[10.5px] leading-4 text-slate-500">
                  Una línea por subexpediente. Pulse Abrir mesa para revisar la documentación por fases.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-600">
                <span>Página {num(pagina)}</span>

                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPagina(1);
                    setSelectedAccion(null);
                  }}
                  className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[10.5px]"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} filas
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() => {
                    setPagina((prev) => Math.max(1, prev - 1));
                    setSelectedAccion(null);
                  }}
                  className="h-7 rounded-lg border border-slate-200 bg-white px-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>

                <button
                  type="button"
                  disabled={!hasNextPage}
                  onClick={() => {
                    setPagina((prev) => prev + 1);
                    setSelectedAccion(null);
                  }}
                  className="h-7 rounded-lg border border-slate-200 bg-white px-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>

            <div className="max-h-[720px] overflow-auto">
              <table className="w-full table-fixed border-collapse text-left text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9.5px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-[30%] px-2 py-1.5">Entidad / acción</th>
                    <th className="w-[14%] px-2 py-1.5">Estado</th>
                    <th className="w-[28%] px-2 py-1.5">Fases</th>
                    <th className="w-[16%] px-2 py-1.5">Documentos</th>
                    <th className="w-[12%] px-2 py-1.5 text-right">Mesa</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingAcciones ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-xs text-slate-500">
                        Cargando bandeja documental...
                      </td>
                    </tr>
                  ) : null}

                  {!loadingAcciones && acciones.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-xs text-slate-500">
                        No hay subexpedientes en esta página.
                      </td>
                    </tr>
                  ) : null}

                  {!loadingAcciones &&
                    acciones.map((accion) => {
                      const selected =
                        selectedAccion?.subexpediente_id === accion.subexpediente_id;

                      return (
                        <tr
                          key={accion.subexpediente_id}
                          className={
                            selected
                              ? "border-t border-blue-100 bg-blue-50"
                              : "border-t border-slate-100 hover:bg-blue-50"
                          }
                        >
                          <td className="px-2 py-1.5 align-top">
                            <p className="truncate font-semibold leading-4 text-slate-950" title={clean(accion.entidad_nombre)}>
                              {clean(accion.entidad_nombre)}
                            </p>
                            <p className="truncate text-[10px] leading-4 text-slate-500">
                              {clean(accion.entidad_cif)} · {clean(accion.entidad_isla)}
                            </p>
                            <p className="truncate text-[10px] leading-4 text-slate-700">
                              {clean(accion.codigo_accion)} · {clean(accion.tipo_oferta)} · {clean(accion.codigo_especialidad)}
                            </p>
                            <p className="truncate text-[10px] leading-4 text-slate-500" title={clean(accion.denominacion)}>
                              {clean(accion.denominacion)}
                            </p>
                            <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                              Inicio {formatDate(accion.oferta_fecha_inicio_prevista)} · Fin {formatDate(accion.oferta_fecha_fin_prevista)}
                            </p>
                          </td>

                          <td className="px-2 py-1.5 align-top">
                            <div className="flex flex-col gap-1">
                              <SmallBadge className={operativoBadgeClass(accion.estado_operativo_administrativo)}>
                                {labelFromOptions(
                                  estadoOperativoOptions,
                                  accion.estado_operativo_administrativo ?? ""
                                )}
                              </SmallBadge>

                              <SmallBadge className={lecturaBadgeClass(accion.lectura_documental)}>
                                {labelFromOptions(lecturaOptions, accion.lectura_documental ?? "")}
                              </SmallBadge>

                              <SmallBadge className={pagoBadgeClass(accion.estado_pago_administrativo)}>
                                Pago: {clean(accion.estado_pago_administrativo)}
                              </SmallBadge>
                            </div>
                          </td>

                          <td className="px-2 py-1.5 align-top">
                            <div className="grid grid-cols-1 gap-1">
                              {faseOrder.map((fase) => (
                                <div
                                  key={`${accion.subexpediente_id}-${fase}`}
                                  className={`flex items-center justify-between rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${faseResumenClass(
                                    accion,
                                    fase
                                  )}`}
                                >
                                  <span>{labelFromOptions(faseOptions, fase)}</span>
                                  <span>{faseResumenText(accion, fase)}</span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="px-2 py-1.5 align-top">
                            <p className="font-semibold text-slate-900">
                              {num(accion.documentos_total)} controles
                            </p>
                            <p className="text-[10px] leading-4 text-slate-500">
                              {num(accion.documentos_validados)} validados
                            </p>
                            <p className="text-[10px] leading-4 text-slate-500">
                              {num(accion.documentos_recibidos)} recibidos
                            </p>
                            <p className="text-[10px] leading-4 text-slate-500">
                              {num(accion.documentos_en_revision)} en revisión
                            </p>
                            <p className="text-[10px] leading-4 text-slate-500">
                              {num(accion.documentos_no_aplica)} no aplica
                            </p>
                            {accion.documentos_con_riesgo_activo > 0 ? (
                              <p className="mt-0.5 text-[10px] font-semibold text-red-700">
                                {num(accion.documentos_con_riesgo_activo)} riesgo activo
                              </p>
                            ) : null}
                          </td>

                          <td className="px-2 py-1.5 text-right align-top">
                            <div className="flex flex-col items-end gap-1">
                              <button
                                type="button"
                                onClick={() => abrirMesa(accion)}
                                className={
                                  selected
                                    ? "w-full rounded-lg bg-[#183B63] px-2 py-1.5 text-[10px] font-semibold text-white"
                                    : "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-[#183B63] hover:bg-slate-50"
                                }
                              >
                                {selected ? "Mesa abierta" : "Abrir mesa"}
                              </button>

                              {accion.oferta_id ? (
                                <Link
                                  href={`/subexpedientes-accion/${accion.oferta_id}`}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Subexp.
                                </Link>
                              ) : null}

                              <p className="text-[10px] text-slate-500">
                                {eur(accion.importe_concedido)}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          <section
            ref={mesaRef}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-3 py-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-[14px] font-semibold leading-5">
                    Mesa técnica documental
                  </h2>
                  <p className="text-[10.5px] leading-4 text-slate-500">
                    Revisión por fases de la acción seleccionada.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={scrollToBandeja}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-[#183B63] hover:bg-slate-50"
                  >
                    Volver a bandeja
                  </button>

                  {selectedAccion ? (
                    <button
                      type="button"
                      onClick={cerrarMesa}
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-800 hover:bg-red-100"
                    >
                      Cerrar mesa
                    </button>
                  ) : null}
                </div>
              </div>

              {selectedAccion ? (
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="truncate text-xs font-semibold text-slate-950" title={clean(selectedAccion.entidad_nombre)}>
                        {clean(selectedAccion.entidad_nombre)}
                      </p>
                      <p className="truncate text-[10.5px] text-slate-600">
                        {clean(selectedAccion.codigo_accion)} · {clean(selectedAccion.tipo_oferta)} · {clean(selectedAccion.denominacion)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Inicio {formatDate(selectedAccion.oferta_fecha_inicio_prevista)} · Fin {formatDate(selectedAccion.oferta_fecha_fin_prevista)} · {eur(selectedAccion.importe_concedido)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <SmallBadge className={operativoBadgeClass(selectedAccion.estado_operativo_administrativo)}>
                        {labelFromOptions(
                          estadoOperativoOptions,
                          selectedAccion.estado_operativo_administrativo ?? ""
                        )}
                      </SmallBadge>
                      <SmallBadge className={lecturaBadgeClass(selectedAccion.lectura_documental)}>
                        {labelFromOptions(lecturaOptions, selectedAccion.lectura_documental ?? "")}
                      </SmallBadge>
                      <SmallBadge className={pagoBadgeClass(selectedAccion.estado_pago_administrativo)}>
                        Pago: {clean(selectedAccion.estado_pago_administrativo)}
                      </SmallBadge>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-5 gap-1">
                    {faseOrder.map((fase) => (
                      <button
                        key={`selected-${fase}`}
                        type="button"
                        onClick={scrollToMesa}
                        className={`rounded-lg border px-2 py-1 text-center text-[9.5px] font-semibold ${faseResumenClass(
                          selectedAccion,
                          fase
                        )}`}
                      >
                        <p>{labelFromOptions(faseOptions, fase)}</p>
                        <p>{faseResumenText(selectedAccion, fase)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {detalleError ? (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  No se pudo cargar la mesa documental en este intento: {detalleError}
                  <button
                    type="button"
                    onClick={() => loadDetalle(selectedAccion?.subexpediente_id ?? null)}
                    className="ml-2 rounded-lg border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Reintentar mesa
                  </button>
                </div>
              ) : null}
            </div>

            <div className="max-h-[720px] overflow-auto px-3 py-2">
              {!selectedAccion ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  Seleccione una acción pulsando Abrir mesa para revisar su documentación por fases.
                </div>
              ) : null}

              {selectedAccion && loadingDetalle ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  Cargando controles documentales de la acción seleccionada...
                </div>
              ) : null}

              {selectedAccion && !loadingDetalle && detalleRows.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  No hay controles documentales asociados a esta acción.
                </div>
              ) : null}

              {selectedAccion &&
                !loadingDetalle &&
                selectedDetalleAgrupado.map((group) => {
                  const faseRows = group.rows;

                  if (faseRows.length === 0) return null;

                  return (
                    <section key={group.fase} className="mb-2 rounded-xl border border-slate-200 bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <SmallBadge className={faseBadgeClass(group.fase)}>
                            {labelFromOptions(faseOptions, group.fase)}
                          </SmallBadge>
                          <span className="text-[10.5px] font-semibold text-slate-700">
                            {num(faseRows.length)} controles
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                          <span>{num(faseRows.filter((r) => r.estado_documental === "validado").length)} validados</span>
                          <span>·</span>
                          <span>{num(faseRows.filter((r) => r.estado_documental === "recibido").length)} recibidos</span>
                          <span>·</span>
                          <span>{num(faseRows.filter((r) => r.estado_documental === "en_revision").length)} revisión</span>
                          <span>·</span>
                          <span>{num(faseRows.filter((r) => r.riesgo_activo_documental !== "sin_riesgo_activo").length)} riesgo</span>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {faseRows.map((row) => {
                          const draft = drafts[row.recepcion_id] ?? makeDraft(row);
                          const hasChanges = rowHasChanges(row);
                          const estadoActualLabel = labelFromOptions(
                            estadoOptions,
                            row.estado_documental
                          );
                          const criticidadLabel = labelFromOptions(
                            [
                              { value: "bajo", label: "Baja" },
                              { value: "medio", label: "Media" },
                              { value: "alto", label: "Alta" },
                              { value: "critico", label: "Crítica" },
                            ],
                            row.criticidad_documental ?? row.riesgo_actual
                          );
                          const riesgoActivoValue =
                            row.riesgo_activo_documental ?? "sin_riesgo_activo";
                          const riesgoActivoLabel =
                            row.riesgo_activo_label ?? "Sin riesgo activo";

                          return (
                            <div
                              key={row.recepcion_id}
                              className={
                                hasChanges
                                  ? "grid gap-2 bg-amber-50/50 px-3 py-2 lg:grid-cols-[1.2fr_0.74fr_0.9fr_auto]"
                                  : "grid gap-2 px-3 py-2 hover:bg-blue-50 lg:grid-cols-[1.2fr_0.74fr_0.9fr_auto]"
                              }
                            >
                              <div>
                                <p className="text-[11px] font-semibold leading-4 text-slate-950" title={clean(row.nombre_documento)}>
                                  {clean(row.nombre_documento)}
                                </p>
                                <p className="text-[10px] leading-4 text-slate-500">
                                  {row.codigo_documento_sce || row.codigo_documento_ministerio
                                    ? `${clean(row.codigo_documento_sce, "")}${
                                        row.codigo_documento_sce &&
                                        row.codigo_documento_ministerio
                                          ? " · "
                                          : ""
                                      }${clean(row.codigo_documento_ministerio, "")}`
                                    : "Matriz documental"}
                                  {" · "}
                                  {row.obligatoriedad === "obligatorio"
                                    ? "Obligatorio"
                                    : row.obligatoriedad === "condicional"
                                    ? "Condicional"
                                    : clean(row.obligatoriedad)}
                                </p>
                                <p className="mt-0.5 text-[10px] leading-4 text-slate-500" title={clean(row.plazo_relativo)}>
                                  Plazo: {clean(row.plazo_relativo)}
                                </p>
                                <p className="text-[10px] leading-4 text-slate-500" title={clean(row.actuacion_sugerida)}>
                                  Actuación: {shortText(row.actuacion_sugerida, 92)}
                                </p>
                              </div>

                              <div>
                                <div className="flex flex-wrap gap-1">
                                  <SmallBadge className={estadoBadgeClass(row.estado_documental)}>
                                    {estadoActualLabel}
                                  </SmallBadge>
                                  <SmallBadge className={criticidadBadgeClass(row.criticidad_documental ?? row.riesgo_actual)}>
                                    {criticidadLabel}
                                  </SmallBadge>
                                  <SmallBadge className={riesgoActivoBadgeClass(riesgoActivoValue)}>
                                    {riesgoActivoLabel}
                                  </SmallBadge>
                                </div>

                                <div className="mt-1 text-[10px] leading-4 text-slate-500">
                                  <p>Límite: {formatDate(row.fecha_limite)}</p>
                                  <p>Recepción: {formatDate(row.fecha_recepcion)}</p>
                                  <p>Revisión: {formatDate(row.fecha_revision)}</p>
                                  <p>Subsanación: {row.requiere_subsanacion ? "Sí" : "No"}</p>
                                </div>
                              </div>

                              <div>
                                <div className="grid gap-1">
                                  <select
                                    value={draft.estado_documental}
                                    onChange={(event) =>
                                      updateDraft(row.recepcion_id, {
                                        estado_documental: event.target.value,
                                      })
                                    }
                                    className="h-7 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[10.5px] font-semibold outline-none focus:border-blue-400"
                                  >
                                    {estadoOptions
                                      .filter((option) => option.value !== "todos")
                                      .map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                  </select>

                                  <select
                                    value={draft.tecnico_revisor}
                                    onChange={(event) =>
                                      updateDraft(row.recepcion_id, {
                                        tecnico_revisor: event.target.value,
                                      })
                                    }
                                    className="h-7 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[10.5px] outline-none focus:border-blue-400"
                                  >
                                    {tecnicoOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>

                                  <textarea
                                    value={draft.observaciones}
                                    onChange={(event) =>
                                      updateDraft(row.recepcion_id, {
                                        observaciones: event.target.value,
                                      })
                                    }
                                    rows={2}
                                    placeholder={shortText(row.actuacion_sugerida, 55)}
                                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10.5px] leading-4 outline-none focus:border-blue-400"
                                  />

                                  <label className="flex items-center gap-1 text-[9.5px] text-slate-500">
                                    <input
                                      type="checkbox"
                                      checked={draft.comunicado_ente_fiscalizador}
                                      onChange={(event) =>
                                        updateDraft(row.recepcion_id, {
                                          comunicado_ente_fiscalizador:
                                            event.target.checked,
                                        })
                                      }
                                    />
                                    Comunicado al ente fiscalizador
                                  </label>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <button
                                  type="button"
                                  disabled={!hasChanges || savingId === row.recepcion_id}
                                  onClick={() => guardarFila(row)}
                                  className={
                                    hasChanges
                                      ? "w-full rounded-lg bg-[#183B63] px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-[#102a47] disabled:opacity-60 lg:w-[96px]"
                                      : "w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-400 lg:w-[96px]"
                                  }
                                  title={hasChanges ? "Guardar cambios del control documental" : "Sin cambios pendientes"}
                                >
                                  {savingId === row.recepcion_id
                                    ? "Guardando..."
                                    : savedId === row.recepcion_id
                                    ? "Guardado"
                                    : hasChanges
                                    ? "Guardar"
                                    : "Sin cambios"}
                                </button>

                                {row.fuente_url ? (
                                  <a
                                    href={row.fuente_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50 lg:w-[96px]"
                                  >
                                    Fuente
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
            </div>
          </section>
        </section>

        <section
          ref={reglaRef}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-800">
                Regla operativa
              </p>
              <p className="text-[10.5px] leading-4 text-slate-500">
                La bandeja muestra una página de trabajo por subexpedientes y calcula la documentación asociada sobre registros vivos. La mesa técnica permite revisar cada control documental por fase y guardar directamente sobre la tabla transaccional recepcion_documentacion.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px]">
              <button
                type="button"
                onClick={scrollToBandeja}
                className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-800 hover:bg-blue-100"
              >
                Bandeja por subexpediente
              </button>
              <button
                type="button"
                onClick={scrollToMesa}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                Mesa por fases
              </button>
              <button
                type="button"
                onClick={scrollToMesa}
                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-800 hover:bg-amber-100"
              >
                Guardado por control
              </button>
              <button
                type="button"
                onClick={scrollToRegla}
                className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 font-semibold text-red-800 hover:bg-red-100"
              >
                Riesgo activo ≠ criticidad normativa
              </button>
            </div>
          </div>
        </section>
      </section>

      <span className="hidden">{VERSION_RECEPCION_DOCUMENTACION}</span>
    </main>
  );
}