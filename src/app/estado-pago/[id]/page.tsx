"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const VERSION_ESTADO_PAGO =
  "2026-06-09-v8-estado-pago-periodo-ejecucion-visible";

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
  importe_concedido: number | string | null;
  centro_formacion: string | null;
  oferta_isla: string | null;
  oferta_municipio: string | null;
  oferta_fecha_inicio_prevista: string | null;
  oferta_fecha_fin_prevista: string | null;
  oferta_fecha_inicio_validada: string | null;
  oferta_fecha_fin_validada: string | null;

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

type PagoOption = {
  value: string;
  label: string;
  helper: string;
};

type BloqueoPago = {
  codigo: string;
  titulo: string;
  detalle: string;
  tipo: "documental" | "operativo" | "economico" | "informativo";
};

const pagoOptions: PagoOption[] = [
  {
    value: "pagado",
    label: "Pagado",
    helper: "Pago autorizado o registrado administrativamente.",
  },
  {
    value: "en_revision_parcial",
    label: "En revisión parcial",
    helper: "Existe revisión económica parcial o pendiente de cierre.",
  },
  {
    value: "en_ejecucion_no_abonado",
    label: "En ejecución · pendiente de devengo",
    helper:
      "La acción sigue en ejecución; no existe cierre económico final ni devengo completo.",
  },
  {
    value: "no_devengado",
    label: "No devengado",
    helper: "No procede pago porque no existe devengo económico suficiente.",
  },
  {
    value: "retenido_revision",
    label: "Retenido por revisión",
    helper: "Pago retenido hasta completar revisión técnica o económica.",
  },
  {
    value: "retenido_riesgo",
    label: "Retenido por riesgo",
    helper: "Pago retenido por riesgo administrativo, documental o económico.",
  },
];

function getInitialId(paramsId: string | string[] | undefined) {
  if (Array.isArray(paramsId)) return paramsId[0] ?? "";
  return paramsId ?? "";
}

function n(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function num(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Number(value ?? 0));
}

function eur(value: number | string | null | undefined) {
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

function clean(value: string | number | null | undefined, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function pagoLabel(value: string | null | undefined) {
  return pagoOptions.find((option) => option.value === value)?.label ?? clean(value);
}

function pagoHelper(value: string | null | undefined) {
  return (
    pagoOptions.find((option) => option.value === value)?.helper ??
    "Estado de pago no catalogado."
  );
}

function pagoBadgeClass(value: string | null | undefined) {
  const pago = (value ?? "").toLowerCase();

  if (pago === "pagado") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (pago === "no_devengado") return "border-slate-200 bg-slate-50 text-slate-600";
  if (pago === "en_ejecucion_no_abonado") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }
  if (pago === "en_revision_parcial") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (pago === "retenido_revision" || pago === "retenido_riesgo") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function estadoOperativoLabel(value: string | null | undefined) {
  if (value === "finalizada") return "Finalizada";
  if (value === "en_ejecucion") return "En ejecución";
  if (value === "pendiente_ejecutar") return "Pendiente de ejecutar";
  return clean(value);
}

function operativoBadgeClass(value: string | null | undefined) {
  const estado = (value ?? "").toLowerCase();

  if (estado === "finalizada") return "border-slate-300 bg-slate-100 text-slate-800";
  if (estado === "en_ejecucion") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (estado === "pendiente_ejecutar") return "border-blue-200 bg-blue-50 text-blue-800";

  return "border-slate-200 bg-white text-slate-700";
}

function riesgoBadgeClass(value: string | null | undefined) {
  const riesgo = (value ?? "").toLowerCase();

  if (riesgo === "alto" || riesgo === "critico" || riesgo === "crítico") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (riesgo === "medio") return "border-amber-200 bg-amber-50 text-amber-800";
  if (riesgo === "bajo") return "border-emerald-200 bg-emerald-50 text-emerald-800";

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
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function KpiCard({
  label,
  value,
  detail,
  tone = "slate",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "green" | "amber" | "red" | "slate" | "violet";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200"
      : tone === "blue"
        ? "border-blue-200"
        : tone === "amber"
          ? "border-amber-200"
          : tone === "red"
            ? "border-red-200"
            : tone === "violet"
              ? "border-violet-200"
              : "border-slate-200";

  return (
    <div className={`rounded-xl border ${toneClass} bg-white px-3 py-2 shadow-sm`}>
      <p className="truncate text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[17px] font-semibold leading-5 text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function faseCompleta(
  nombre: string,
  total: number | null | undefined,
  validado: number | null | undefined,
  enRevision: number | null | undefined,
  noRecibido: number | null | undefined,
  riesgoActivo: number | null | undefined
): BloqueoPago | null {
  const totalNum = n(total);
  const validadoNum = n(validado);
  const revisionNum = n(enRevision);
  const noRecibidoNum = n(noRecibido);
  const riesgoNum = n(riesgoActivo);

  if (totalNum <= 0) {
    return {
      codigo: `fase_${nombre.toLowerCase()}_sin_controles`,
      titulo: `${nombre}: sin controles definidos`,
      detalle:
        "No consta ningún control documental en esta fase. Debe revisarse en la mesa documental antes de autorizar pago.",
      tipo: "documental",
    };
  }

  if (validadoNum !== totalNum || revisionNum > 0 || noRecibidoNum > 0 || riesgoNum > 0) {
    return {
      codigo: `fase_${nombre.toLowerCase()}_incompleta`,
      titulo: `${nombre}: fase no completada`,
      detalle: `${validadoNum}/${totalNum} validados · ${revisionNum} en revisión · ${noRecibidoNum} no recibidos · ${riesgoNum} con riesgo activo.`,
      tipo: "documental",
    };
  }

  return null;
}

function getBloqueosPago(accion: AccionResumenRow | null): BloqueoPago[] {
  if (!accion) {
    return [
      {
        codigo: "sin_datos",
        titulo: "Sin lectura económica",
        detalle: "La pantalla todavía no ha cargado los datos del subexpediente.",
        tipo: "informativo",
      },
    ];
  }

  const bloqueos: BloqueoPago[] = [];

  if (accion.estado_operativo_administrativo !== "finalizada") {
    bloqueos.push({
      codigo: "estado_no_finalizado",
      titulo: "La acción no está finalizada",
      detalle: `Estado actual: ${estadoOperativoLabel(
        accion.estado_operativo_administrativo
      )}. El pago final solo puede autorizarse cuando la acción esté finalizada.`,
      tipo: "operativo",
    });
  }

  if (accion.documentacion_estado_subexpediente !== "validada") {
    bloqueos.push({
      codigo: "documentacion_global_no_validada",
      titulo: "Documentación global no validada",
      detalle: `Estado documental actual: ${clean(
        accion.documentacion_estado_subexpediente
      )}. Debe quedar validada antes de autorizar pago.`,
      tipo: "documental",
    });
  }

  const fases = [
    faseCompleta(
      "Inicio",
      accion.inicio_total,
      accion.inicio_validado,
      accion.inicio_en_revision,
      accion.inicio_no_recibido,
      accion.inicio_riesgo_activo
    ),
    faseCompleta(
      "Seguimiento",
      accion.seguimiento_total,
      accion.seguimiento_validado,
      accion.seguimiento_en_revision,
      accion.seguimiento_no_recibido,
      accion.seguimiento_riesgo_activo
    ),
    faseCompleta(
      "Finalización",
      accion.finalizacion_total,
      accion.finalizacion_validado,
      accion.finalizacion_en_revision,
      accion.finalizacion_no_recibido,
      accion.finalizacion_riesgo_activo
    ),
    faseCompleta(
      "Justificación",
      accion.justificacion_total,
      accion.justificacion_validado,
      accion.justificacion_en_revision,
      accion.justificacion_no_recibido,
      accion.justificacion_riesgo_activo
    ),
    faseCompleta(
      "Cierre",
      accion.cierre_total,
      accion.cierre_validado,
      accion.cierre_en_revision,
      accion.cierre_no_recibido,
      accion.cierre_riesgo_activo
    ),
  ].filter(Boolean) as BloqueoPago[];

  bloqueos.push(...fases);

  if (n(accion.documentos_en_revision) > 0) {
    bloqueos.push({
      codigo: "documentos_en_revision",
      titulo: "Hay documentos en revisión",
      detalle: `${num(
        accion.documentos_en_revision
      )} documentos siguen en revisión documental.`,
      tipo: "documental",
    });
  }

  if (n(accion.documentos_no_recibidos) > 0) {
    bloqueos.push({
      codigo: "documentos_no_recibidos",
      titulo: "Hay documentos no recibidos",
      detalle: `${num(
        accion.documentos_no_recibidos
      )} documentos constan como no recibidos.`,
      tipo: "documental",
    });
  }

  if (n(accion.documentos_requieren_subsanacion) > 0) {
    bloqueos.push({
      codigo: "documentos_subsanacion",
      titulo: "Hay subsanaciones pendientes",
      detalle: `${num(
        accion.documentos_requieren_subsanacion
      )} documentos requieren subsanación.`,
      tipo: "documental",
    });
  }

  if (n(accion.documentos_con_riesgo_activo) > 0) {
    bloqueos.push({
      codigo: "riesgo_documental_activo",
      titulo: "Hay riesgo documental activo",
      detalle: `${num(
        accion.documentos_con_riesgo_activo
      )} documentos tienen riesgo activo.`,
      tipo: "documental",
    });
  }

  if (n(accion.incidencias_abiertas) > 0) {
    bloqueos.push({
      codigo: "incidencias_abiertas",
      titulo: "Hay incidencias abiertas",
      detalle: `${num(accion.incidencias_abiertas)} incidencias permanecen abiertas.`,
      tipo: "operativo",
    });
  }

  if (n(accion.requerimientos_pendientes) > 0) {
    bloqueos.push({
      codigo: "requerimientos_pendientes",
      titulo: "Hay requerimientos pendientes",
      detalle: `${num(
        accion.requerimientos_pendientes
      )} requerimientos siguen pendientes.`,
      tipo: "operativo",
    });
  }

  if (accion.estado_pago_administrativo === "pagado") {
    bloqueos.push({
      codigo: "pago_ya_registrado",
      titulo: "Pago ya registrado",
      detalle:
        "El estado administrativo ya consta como pagado. Solo debe revisarse si existe incidencia sobrevenida.",
      tipo: "informativo",
    });
  }

  return bloqueos;
}

function getBloqueosNoInformativosPago(accion: AccionResumenRow | null) {
  return getBloqueosPago(accion).filter(
    (bloqueo) => bloqueo.codigo !== "pago_ya_registrado"
  );
}

function canAutorizarPago(accion: AccionResumenRow | null) {
  if (!accion) return false;
  if (accion.estado_pago_administrativo === "pagado") return false;

  return getBloqueosNoInformativosPago(accion).length === 0;
}

function pagoRegistradoConCondicionesPendientes(accion: AccionResumenRow | null) {
  if (!accion) return false;

  return (
    accion.estado_pago_administrativo === "pagado" &&
    getBloqueosNoInformativosPago(accion).length > 0
  );
}

function decisionRecomendada(accion: AccionResumenRow | null) {
  if (!accion) return "Cargando lectura económica del subexpediente.";

  const bloqueos = getBloqueosPago(accion);
  const bloqueosNoInformativos = getBloqueosNoInformativosPago(accion);

  if (
    accion.estado_pago_administrativo === "pagado" &&
    bloqueosNoInformativos.length > 0
  ) {
    const primerBloqueo = bloqueosNoInformativos[0];

    return `Pago registrado con condiciones pendientes: ${
      primerBloqueo?.titulo ?? "existen controles pendientes"
    }. Revisión económica/documental recomendada; no considerar cierre económico defendible hasta completar la regularización.`;
  }

  if (accion.estado_pago_administrativo === "pagado") {
    return "Pago ya registrado. Mantener trazabilidad y revisar solo si existe incidencia sobrevenida.";
  }

  if (bloqueos.length > 0) {
    const primerBloqueo = bloqueosNoInformativos[0];

    return `No autorizar pago todavía: ${
      primerBloqueo?.titulo ?? "existen condiciones pendientes"
    }. Revise o subsane desde la mesa documental antes de la decisión económica.`;
  }

  return "Puede autorizarse pago: acción finalizada, fases documentales completas, sin riesgo activo, sin incidencias y sin requerimientos pendientes.";
}

function accionSemantica(accion: AccionResumenRow | null) {
  if (!accion) return "Cargando regla operativa.";

  if (accion.estado_operativo_administrativo === "finalizada") {
    return "Finalizada: la revisión de pago debe comprobar documentación validada por fases, ausencia de riesgo activo, ausencia de incidencias y coherencia económica antes de autorizar o mantener el pago.";
  }

  if (accion.estado_operativo_administrativo === "en_ejecucion") {
    return "En ejecución: el pago no debe tratarse como cierre final; puede mantenerse como pendiente de devengo o en revisión parcial.";
  }

  if (accion.estado_operativo_administrativo === "pendiente_ejecutar") {
    return "Pendiente de ejecutar: no existe devengo económico ordinario; el estado natural es no devengado.";
  }

  return "Revise la situación operativa antes de actuar sobre el pago.";
}

function bloqueoClass(tipo: BloqueoPago["tipo"]) {
  if (tipo === "documental") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tipo === "operativo") return "border-blue-200 bg-blue-50 text-blue-900";
  if (tipo === "economico") return "border-red-200 bg-red-50 text-red-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function EstadoPagoPage() {
  const params = useParams();
  const id = getInitialId(params?.id as string | string[] | undefined);
  const subexpedienteId = Number(id);

  const [accion, setAccion] = useState<AccionResumenRow | null>(null);
  const [pagoDraft, setPagoDraft] = useState("");
  const [pagoObservacion, setPagoObservacion] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingPago, setSavingPago] = useState(false);
  const [pagoSaved, setPagoSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagoError, setPagoError] = useState<string | null>(null);

  async function loadAccion() {
    if (!subexpedienteId || Number.isNaN(subexpedienteId)) {
      setError("No se recibió un identificador válido de subexpediente.");
      setAccion(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc(
      "get_estado_pago_subexpediente_v1",
      {
        p_subexpediente_id: subexpedienteId,
      }
    );

    if (error) {
      setError(error.message);
      setAccion(null);
      setLoading(false);
      return;
    }

    const found = Array.isArray(data) ? data[0] ?? null : data ?? null;

    if (!found) {
      setError("No se encontró el subexpediente en la lectura económica.");
      setAccion(null);
      setLoading(false);
      return;
    }

    const normalized = found as AccionResumenRow;

    setAccion(normalized);
    setPagoDraft(normalized.estado_pago_administrativo ?? "");
    setPagoObservacion("");
    setLoading(false);
  }

  useEffect(() => {
    loadAccion();
  }, [subexpedienteId]);

  const bloqueosPago = useMemo(() => getBloqueosPago(accion), [accion]);
  const bloqueosNoInformativosPago = useMemo(
    () => getBloqueosNoInformativosPago(accion),
    [accion]
  );
  const puedeAutorizarPago = canAutorizarPago(accion);
  const pagoConCondicionesPendientes = pagoRegistradoConCondicionesPendientes(accion);

  const hasPagoChanges = useMemo(() => {
    return Boolean(accion && pagoDraft && pagoDraft !== accion.estado_pago_administrativo);
  }, [accion, pagoDraft]);

  async function guardarPago(nuevoEstado?: string, observacionForzada?: string) {
    if (!accion) return;

    const nextPago = nuevoEstado ?? pagoDraft;

    if (!nextPago) {
      setPagoError("Debe seleccionar un estado de pago.");
      return;
    }

    if (nextPago === "pagado" && !canAutorizarPago(accion)) {
      setPagoError(
        "No se puede autorizar el pago: la acción debe estar finalizada, la documentación global validada, todas las fases completas y sin incidencias, requerimientos ni riesgos activos."
      );
      return;
    }

    setSavingPago(true);
    setPagoSaved(false);
    setPagoError(null);

    const nowIso = new Date().toISOString();
    const observacion =
      observacionForzada?.trim() ||
      pagoObservacion.trim() ||
      `Cambio de estado de pago desde página Estado de pago: ${pagoLabel(
        accion.estado_pago_administrativo
      )} → ${pagoLabel(nextPago)}.`;

    const { error } = await supabase
      .from("subexpedientes_accion")
      .update({
        estado_pago_administrativo: nextPago,
        observaciones_administrativas: `${observacion}\nFecha actuación: ${new Date().toLocaleString(
          "es-ES"
        )}.`,
        updated_at: nowIso,
      })
      .eq("id", subexpedienteId);

    if (error) {
      setPagoError(error.message);
      setSavingPago(false);
      return;
    }

    setAccion((current) =>
      current
        ? {
            ...current,
            estado_pago_administrativo: nextPago,
          }
        : current
    );

    setPagoDraft(nextPago);
    setPagoObservacion("");
    setSavingPago(false);
    setPagoSaved(true);

    await loadAccion();

    window.setTimeout(() => {
      setPagoSaved(false);
    }, 1800);
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold">Estado de pago operativo</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Revisión económica separada para perfiles superiores: decisión de pago, retención o no devengo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
              Subexpediente {id || "—"}
            </div>
            <div className="rounded-xl border border-violet-300/30 bg-violet-400/10 px-4 py-2 text-xs font-semibold text-violet-100">
              {loading ? "Cargando..." : pagoLabel(accion?.estado_pago_administrativo)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/recepcion-documentacion"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              ← Volver a recepción documental
            </Link>

            <Link
              href={`/mesa-documental/${id}`}
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Mesa documental
            </Link>

            <Link
              href="/matriz-normativa-documental"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            >
              Matriz normativa
            </Link>

            <Link
              href="/dashboard"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Dashboard
            </Link>
          </div>

          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-800 shadow-sm">
            Perfil superior · control económico
          </span>
        </div>

        {error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 shadow-sm">
            No se pudo cargar el estado de pago: {error}
            <button
              type="button"
              onClick={loadAccion}
              className="ml-2 rounded-lg border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-800 hover:bg-red-100"
            >
              Reintentar
            </button>
          </section>
        ) : null}

        {pagoError ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 shadow-sm">
            No se pudo guardar el estado de pago: {pagoError}
            <button
              type="button"
              onClick={() => setPagoError(null)}
              className="ml-2 rounded-lg border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-800 hover:bg-red-100"
            >
              Cerrar aviso
            </button>
          </section>
        ) : null}

        <section className="grid gap-2 lg:grid-cols-6">
          <KpiCard
            label="Estado pago"
            value={loading ? "—" : pagoLabel(accion?.estado_pago_administrativo)}
            detail={loading ? "cargando" : pagoHelper(accion?.estado_pago_administrativo)}
            tone="violet"
          />

          <KpiCard
            label="Importe concedido"
            value={loading ? "—" : eur(accion?.importe_concedido)}
            detail="referencia económica"
            tone="green"
          />

          <KpiCard
            label="Operativo"
            value={loading ? "—" : estadoOperativoLabel(accion?.estado_operativo_administrativo)}
            detail="estado administrativo"
            tone="blue"
          />

          <KpiCard
            label="Documentación"
            value={loading ? "—" : clean(accion?.documentacion_estado_subexpediente)}
            detail={
              loading
                ? "cargando"
                : `${num(accion?.documentos_validados)} val. · ${num(
                    accion?.documentos_con_riesgo_activo
                  )} riesgo`
            }
            tone={Number(accion?.documentos_con_riesgo_activo ?? 0) > 0 ? "red" : "green"}
          />

          <KpiCard
            label="Incidencias"
            value={loading ? "—" : num(accion?.incidencias_abiertas)}
            detail={`${num(accion?.requerimientos_pendientes)} requerimientos`}
            tone={Number(accion?.incidencias_abiertas ?? 0) > 0 ? "red" : "slate"}
          />

          <KpiCard
            label="Riesgo económico"
            value={loading ? "—" : clean(accion?.riesgo_economico)}
            detail={`admin: ${clean(accion?.riesgo_administrativo)}`}
            tone={
              ["alto", "critico", "crítico"].includes(
                String(accion?.riesgo_economico ?? "").toLowerCase()
              )
                ? "red"
                : "slate"
            }
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Periodo de ejecución
              </p>
              <p className="mt-0.5 text-[10.5px] leading-4 text-slate-500">
                Fechas previstas y validadas para justificar la lectura operativa antes de cualquier decisión de pago.
              </p>
            </div>

            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${operativoBadgeClass(
                accion?.estado_operativo_administrativo
              )}`}
            >
              {estadoOperativoLabel(accion?.estado_operativo_administrativo)}
            </span>
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Inicio previsto
              </p>
              <p className="mt-1 text-[13px] font-semibold text-slate-950">
                {loading ? "—" : formatDate(accion?.oferta_fecha_inicio_prevista)}
              </p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Inicio validado
              </p>
              <p className="mt-1 text-[13px] font-semibold text-slate-950">
                {loading ? "—" : formatDate(accion?.oferta_fecha_inicio_validada)}
              </p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Fin prevista
              </p>
              <p className="mt-1 text-[13px] font-semibold text-slate-950">
                {loading ? "—" : formatDate(accion?.oferta_fecha_fin_prevista)}
              </p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Fin validada
              </p>
              <p className="mt-1 text-[13px] font-semibold text-slate-950">
                {loading ? "—" : formatDate(accion?.oferta_fecha_fin_validada)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-violet-950">
            Decisión recomendada
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-violet-900">
            {decisionRecomendada(accion)}
          </p>
        </section>

        {pagoConCondicionesPendientes ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 shadow-sm">
            <p className="text-[11px] font-semibold text-red-950">
              Pago registrado con expediente incompleto
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-red-900">
              El estado administrativo consta como pagado, pero existen condiciones documentales u operativas pendientes.
              Este caso debe tratarse como revisión económica/documental, no como cierre económico limpio.
            </p>
          </section>
        ) : null}

        <section
          className={
            puedeAutorizarPago
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm"
              : "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-sm"
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className={
                  puedeAutorizarPago
                    ? "text-[11px] font-semibold text-emerald-950"
                    : "text-[11px] font-semibold text-amber-950"
                }
              >
                Control documental previo al pago
              </p>
              <p
                className={
                  puedeAutorizarPago
                    ? "mt-0.5 text-[11px] leading-4 text-emerald-900"
                    : "mt-0.5 text-[11px] leading-4 text-amber-900"
                }
              >
                {puedeAutorizarPago
                  ? "Todas las fases documentales obligatorias constan completas y validadas. El pago puede autorizarse si no existe revisión económica adicional."
                  : pagoConCondicionesPendientes
                    ? "Existe un pago registrado, pero el expediente mantiene condiciones documentales u operativas pendientes. Debe revisarse antes de considerarlo cierre económico defendible."
                    : "El pago queda bloqueado hasta revisar o subsanar las fases/documentos pendientes en la mesa documental."}
              </p>
            </div>

            <Link
              href={`/mesa-documental/${id}`}
              className={
                puedeAutorizarPago
                  ? "rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                  : "rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
              }
            >
              {puedeAutorizarPago ? "Ver mesa documental" : "Ir a mesa documental"}
            </Link>
          </div>

          {!puedeAutorizarPago ? (
            <div className="mt-2 grid gap-1.5 md:grid-cols-2">
              {(pagoConCondicionesPendientes ? bloqueosNoInformativosPago : bloqueosPago).map((bloqueo) => (
                <div
                  key={bloqueo.codigo}
                  className={`rounded-lg border px-2.5 py-2 ${bloqueoClass(bloqueo.tipo)}`}
                >
                  <p className="text-[10.5px] font-semibold leading-4">
                    {bloqueo.titulo}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-4">{bloqueo.detalle}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 grid gap-1.5 md:grid-cols-5">
              <SmallBadge className="border-emerald-200 bg-white text-emerald-800">
                Inicio {num(accion?.inicio_validado)}/{num(accion?.inicio_total)}
              </SmallBadge>
              <SmallBadge className="border-emerald-200 bg-white text-emerald-800">
                Seguimiento {num(accion?.seguimiento_validado)}/{num(accion?.seguimiento_total)}
              </SmallBadge>
              <SmallBadge className="border-emerald-200 bg-white text-emerald-800">
                Finalización {num(accion?.finalizacion_validado)}/{num(accion?.finalizacion_total)}
              </SmallBadge>
              <SmallBadge className="border-emerald-200 bg-white text-emerald-800">
                Justificación {num(accion?.justificacion_validado)}/{num(accion?.justificacion_total)}
              </SmallBadge>
              <SmallBadge className="border-emerald-200 bg-white text-emerald-800">
                Cierre {num(accion?.cierre_validado)}/{num(accion?.cierre_total)}
              </SmallBadge>
            </div>
          )}
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-[14px] font-semibold leading-5 text-slate-950">
                  Subexpediente
                </h2>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Datos de contexto económico y documental para decidir el estado de pago.
                </p>
              </div>

              <div className="flex flex-wrap gap-1">
                <SmallBadge className={operativoBadgeClass(accion?.estado_operativo_administrativo)}>
                  {estadoOperativoLabel(accion?.estado_operativo_administrativo)}
                </SmallBadge>
                <SmallBadge className={pagoBadgeClass(accion?.estado_pago_administrativo)}>
                  {pagoLabel(accion?.estado_pago_administrativo)}
                </SmallBadge>
                <SmallBadge className={riesgoBadgeClass(accion?.riesgo_economico)}>
                  Riesgo econ.: {clean(accion?.riesgo_economico)}
                </SmallBadge>
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-[11px] text-slate-600 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">{clean(accion?.entidad_nombre)}</p>
                <p className="mt-0.5">{clean(accion?.entidad_cif)} · {clean(accion?.entidad_isla)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  {clean(accion?.codigo_accion)} · {clean(accion?.tipo_oferta)}
                </p>
                <p className="mt-0.5">{clean(accion?.codigo_especialidad)} · {clean(accion?.modalidad)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2">
                <p className="font-semibold text-slate-900">{clean(accion?.denominacion)}</p>
                <p className="mt-0.5">
                  Inicio validado: {formatDate(accion?.oferta_fecha_inicio_validada)} · Fin validada:{" "}
                  {formatDate(accion?.oferta_fecha_fin_validada)}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-blue-950">
                Regla operativa
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-blue-900">
                {accionSemantica(accion)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <h2 className="text-[14px] font-semibold leading-5 text-slate-950">
              Actualizar estado de pago
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Esta acción queda separada de la mesa documental porque corresponde a revisión económica o perfil superior.
            </p>

            <div className="mt-3 grid gap-2">
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Estado de pago administrativo
              </label>
              <select
                value={pagoDraft}
                onChange={(event) => setPagoDraft(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold outline-none focus:border-blue-400"
              >
                <option value="">Seleccione estado</option>
                {pagoOptions.map((option) => {
                  const pagadoBloqueado =
                    option.value === "pagado" &&
                    !puedeAutorizarPago &&
                    accion?.estado_pago_administrativo !== "pagado";

                  return (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={pagadoBloqueado}
                    >
                      {pagadoBloqueado
                        ? `${option.label} · bloqueado hasta completar condiciones`
                        : option.label}
                    </option>
                  );
                })}
              </select>

              {!puedeAutorizarPago && accion?.estado_pago_administrativo !== "pagado" ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10.5px] leading-4 text-amber-900">
                  La opción Pagado queda bloqueada hasta que la acción esté finalizada, la documentación global esté validada y todas las fases estén completas.
                </p>
              ) : null}

              {pagoConCondicionesPendientes ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[10.5px] leading-4 text-red-900">
                  Este pago ya consta como registrado, pero no debe interpretarse como cierre defendible mientras existan controles documentales pendientes.
                </p>
              ) : null}

              <textarea
                value={pagoObservacion}
                onChange={(event) => setPagoObservacion(event.target.value)}
                rows={4}
                placeholder="Observación económica/administrativa del cambio de pago..."
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] leading-4 outline-none focus:border-blue-400"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingPago || !hasPagoChanges}
                  onClick={() => guardarPago()}
                  className={
                    hasPagoChanges
                      ? "rounded-lg bg-[#183B63] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#102a47] disabled:opacity-60"
                      : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-400"
                  }
                >
                  {savingPago ? "Guardando..." : pagoSaved ? "Guardado" : "Guardar estado de pago"}
                </button>

                {puedeAutorizarPago ? (
                  <button
                    type="button"
                    disabled={savingPago}
                    onClick={() =>
                      guardarPago(
                        "pagado",
                        "Pago autorizado desde página Estado de pago tras documentación completa por fases, validada y sin riesgo activo."
                      )
                    }
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Autorizar pago
                  </button>
                ) : (
                  <Link
                    href={`/mesa-documental/${id}`}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Subsanar documentación
                  </Link>
                )}

                <button
                  type="button"
                  disabled={savingPago}
                  onClick={() =>
                    guardarPago(
                      "retenido_revision",
                      "Pago retenido por revisión económica/administrativa pendiente."
                    )
                  }
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                >
                  Retener revisión
                </button>

                <button
                  type="button"
                  disabled={savingPago}
                  onClick={() =>
                    guardarPago(
                      "retenido_riesgo",
                      "Pago retenido por riesgo administrativo/económico activo."
                    )
                  }
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
                >
                  Retener riesgo
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-800">
                Trazabilidad de responsabilidad
              </p>
              <p className="mt-0.5 text-[10.5px] leading-4 text-slate-500">
                La mesa documental trabaja controles técnicos. Esta página concentra la decisión de pago para evitar que un técnico documental modifique estados económicos sin una pantalla específica.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/mesa-documental/${id}`}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-blue-800 hover:bg-blue-100"
              >
                Volver a mesa documental
              </Link>

              {accion?.oferta_id ? (
                <Link
                  href={`/subexpedientes-accion/${accion.oferta_id}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver subexpediente
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </section>

      <span className="hidden">{VERSION_ESTADO_PAGO}</span>
    </main>
  );
}