"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const VERSION_MESA_DOCUMENTAL =
  "2026-05-20-v5-mesa-documental-rpc-trazabilidad";

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

type FaseKey =
  | "inicio"
  | "seguimiento"
  | "finalizacion"
  | "justificacion"
  | "cierre";

type EstadoTrabajo =
  | "todos"
  | "pendientes_validar"
  | "recibidos"
  | "validados"
  | "en_revision"
  | "subsanacion"
  | "no_recibidos"
  | "no_aplica"
  | "sin_fuente"
  | "riesgo_activo";

type FaseStats = {
  fase: FaseKey;
  total: number;
  validado: number;
  recibido: number;
  revision: number;
  noRecibido: number;
  noAplica: number;
  subsanacion: number;
  riesgo: number;
  pendientes: number;
};

const faseOrder: FaseKey[] = [
  "inicio",
  "seguimiento",
  "finalizacion",
  "justificacion",
  "cierre",
];

const faseOptions: SelectOption[] = [
  { value: "todos", label: "Todas las fases" },
  { value: "inicio", label: "Inicio" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "finalizacion", label: "Finalización" },
  { value: "justificacion", label: "Justificación" },
  { value: "cierre", label: "Cierre" },
];

const estadoOptions: SelectOption[] = [
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
  { value: "Unidad de seguimiento SCE", label: "Unidad de seguimiento SCE" },
  { value: "Unidad de justificación SCE", label: "Unidad de justificación SCE" },
  { value: "Unidad de fiscalización SCE", label: "Unidad de fiscalización SCE" },
];

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Number(value ?? 0));
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

function labelFromOptions(
  options: SelectOption[],
  value: string | null | undefined
) {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label ?? value;
}

function clean(value: string | null | undefined, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function shortText(value: string | null | undefined, length = 110) {
  const text = clean(value, "");
  if (!text) return "—";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function estadoBadgeClass(value: string | null | undefined) {
  const estado = (value ?? "").toLowerCase();

  if (estado === "validado") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (estado === "recibido") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (estado === "en_revision") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (estado === "subsanable") {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }

  if (estado === "vencido" || estado === "rechazado") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (estado === "no_aplica") {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function faseBadgeClass(value: string | null | undefined) {
  const fase = (value ?? "").toLowerCase();

  if (fase === "inicio") return "border-blue-200 bg-blue-50 text-blue-800";
  if (fase === "seguimiento") return "border-cyan-200 bg-cyan-50 text-cyan-800";
  if (fase === "finalizacion") {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  if (fase === "justificacion") {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }
  if (fase === "cierre") return "border-slate-300 bg-slate-100 text-slate-800";

  return "border-slate-200 bg-white text-slate-700";
}

function faseBoxClass(stats: FaseStats) {
  if (stats.riesgo > 0) return "border-red-200 bg-red-50";
  if (stats.pendientes > 0) return "border-blue-200 bg-blue-50";
  if (stats.total > 0 && stats.noAplica === stats.total) {
    return "border-slate-200 bg-slate-50";
  }
  if (stats.total > 0 && stats.validado === stats.total) {
    return "border-emerald-200 bg-emerald-50";
  }

  return "border-slate-200 bg-white";
}

function faseResumenOperativo(stats: FaseStats) {
  const faseLabel = labelFromOptions(faseOptions, stats.fase);

  if (stats.total === 0) {
    return `${faseLabel}: 0 controles`;
  }

  if (stats.noAplica === stats.total) {
    return `${faseLabel}: ${num(stats.total)} controles · No aplica`;
  }

  const partes: string[] = [`${faseLabel}: ${num(stats.total)} controles`];

  if (stats.validado > 0) partes.push(`${num(stats.validado)} validados`);
  if (stats.recibido > 0) partes.push(`${num(stats.recibido)} recibidos`);
  if (stats.revision > 0) partes.push(`${num(stats.revision)} en revisión`);
  if (stats.subsanacion > 0) partes.push(`${num(stats.subsanacion)} subsanación`);
  if (stats.noRecibido > 0) partes.push(`${num(stats.noRecibido)} no recibidos`);
  if (stats.riesgo > 0) partes.push(`${num(stats.riesgo)} riesgo`);

  return partes.join(" · ");
}

function criticidadBadgeClass(value: string | null | undefined) {
  const criticidad = (value ?? "").toLowerCase();

  if (criticidad === "critico") return "border-red-300 bg-red-50 text-red-800";
  if (criticidad === "alto") return "border-rose-200 bg-rose-50 text-rose-800";
  if (criticidad === "medio") return "border-amber-200 bg-amber-50 text-amber-800";
  if (criticidad === "bajo") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function riesgoActivoBadgeClass(value: string | null | undefined) {
  const riesgo = (value ?? "").toLowerCase();

  if (riesgo === "critico") return "border-red-300 bg-red-50 text-red-800";
  if (riesgo === "alto") return "border-rose-200 bg-rose-50 text-rose-800";

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
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

function KpiBox({
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
    tone === "red"
      ? "border-red-200"
      : tone === "amber"
        ? "border-amber-200"
        : tone === "green"
          ? "border-emerald-200"
          : tone === "blue"
            ? "border-blue-200"
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

function makeDraft(row: RecepcionRow): DraftRow {
  return {
    estado_documental: row.estado_documental,
    observaciones: row.observaciones ?? "",
    tecnico_revisor: row.tecnico_revisor ?? "",
    comunicado_ente_fiscalizador: row.comunicado_ente_fiscalizador ?? false,
  };
}

function defaultTecnicoForRow(row: RecepcionRow | null) {
  if (!row) return "Unidad de seguimiento SCE";

  if (row.fase === "justificacion" || row.fase === "cierre") {
    return "Unidad de justificación SCE";
  }

  if (row.fase === "seguimiento") {
    return "Unidad de seguimiento SCE";
  }

  return "Unidad de fiscalización SCE";
}

function rowTieneRiesgoActivo(row: RecepcionRow) {
  return row.riesgo_activo_documental !== "sin_riesgo_activo";
}

function rowTieneFuente(row: RecepcionRow) {
  return Boolean(row.fuente_url || row.fuente_nombre || row.documento_normativo_id);
}

function getInitialId(paramsId: string | string[] | undefined) {
  if (Array.isArray(paramsId)) return paramsId[0] ?? "";
  return paramsId ?? "";
}

function shouldShowByTrabajo(row: RecepcionRow, estadoTrabajo: EstadoTrabajo) {
  if (estadoTrabajo === "pendientes_validar") {
    return row.estado_documental === "recibido" || row.estado_documental === "en_revision";
  }

  if (estadoTrabajo === "recibidos") return row.estado_documental === "recibido";
  if (estadoTrabajo === "validados") return row.estado_documental === "validado";
  if (estadoTrabajo === "en_revision") return row.estado_documental === "en_revision";

  if (estadoTrabajo === "subsanacion") {
    return row.estado_documental === "subsanable" || row.requiere_subsanacion;
  }

  if (estadoTrabajo === "no_recibidos") return row.estado_documental === "no_recibido";
  if (estadoTrabajo === "no_aplica") return row.estado_documental === "no_aplica";
  if (estadoTrabajo === "sin_fuente") return !rowTieneFuente(row);
  if (estadoTrabajo === "riesgo_activo") return rowTieneRiesgoActivo(row);

  return true;
}

function getBestRowForPhase(rows: RecepcionRow[], estadoTrabajo: EstadoTrabajo) {
  const filteredByTrabajo = rows.filter((row) => shouldShowByTrabajo(row, estadoTrabajo));
  const source = filteredByTrabajo.length > 0 ? filteredByTrabajo : rows;

  return (
    source.find((row) => row.estado_documental === "recibido") ??
    source.find((row) => row.estado_documental === "en_revision") ??
    source.find((row) => row.estado_documental === "subsanable") ??
    source.find((row) => row.estado_documental === "no_recibido") ??
    source.find((row) => row.estado_documental === "validado") ??
    source.find((row) => row.estado_documental === "no_aplica") ??
    source[0] ??
    null
  );
}

function appendObservation(base: string | null | undefined, note: string) {
  const current = clean(base, "");
  const stampedNote = `${note} Fecha: ${new Date().toLocaleString("es-ES")}.`;

  if (!current) return stampedNote;

  return `${current}\n${stampedNote}`;
}

function getTipoMovimiento(row: RecepcionRow, draft: DraftRow) {
  if (row.estado_documental !== draft.estado_documental) {
    if (draft.estado_documental === "recibido") return "registrar_recepcion";
    if (draft.estado_documental === "validado") return "validar_documento";
    if (draft.estado_documental === "subsanable") return "marcar_subsanacion";
    if (draft.estado_documental === "no_aplica") return "marcar_no_aplica";
    if (draft.estado_documental === "en_revision") return "reabrir_revision";
    if (draft.estado_documental === "rechazado") return "rechazar_documento";
    if (draft.estado_documental === "vencido") return "marcar_vencido";
  }

  return "actualizacion_documental";
}

function getMotivoCambio(row: RecepcionRow, draft: DraftRow) {
  const estadoAnterior = labelFromOptions(estadoOptions, row.estado_documental);
  const estadoNuevo = labelFromOptions(estadoOptions, draft.estado_documental);

  if (row.estado_documental !== draft.estado_documental) {
    return `Cambio documental desde mesa: ${estadoAnterior} → ${estadoNuevo}.`;
  }

  if ((row.tecnico_revisor ?? "") !== draft.tecnico_revisor) {
    return "Actualización de técnico revisor desde mesa documental.";
  }

  if ((row.observaciones ?? "") !== draft.observaciones) {
    return "Actualización de observaciones desde mesa documental.";
  }

  if (Boolean(row.comunicado_ente_fiscalizador) !== draft.comunicado_ente_fiscalizador) {
    return "Actualización de comunicación al ente fiscalizador desde mesa documental.";
  }

  return "Actualización documental desde mesa documental.";
}

export default function MesaDocumentalPage() {
  const params = useParams();
  const id = getInitialId(params?.id as string | string[] | undefined);
  const subexpedienteId = Number(id);

  const [detalleRows, setDetalleRows] = useState<RecepcionRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [faseActiva, setFaseActiva] = useState<string>("todos");
  const [estadoTrabajo, setEstadoTrabajo] = useState<EstadoTrabajo>("todos");
  const [selectedByFase, setSelectedByFase] = useState<Record<string, number>>({});

  const [loadingDetalle, setLoadingDetalle] = useState(true);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  useEffect(() => {
    const paramsFromUrl = new URLSearchParams(window.location.search);
    const fase = paramsFromUrl.get("fase");
    const control = paramsFromUrl.get("control");

    if (fase && faseOptions.some((option) => option.value === fase)) {
      setFaseActiva(fase);
    }

    if (fase && control) {
      const controlId = Number(control);
      if (!Number.isNaN(controlId)) {
        setSelectedByFase((prev) => ({
          ...prev,
          [fase]: controlId,
        }));
      }
    }
  }, []);

  async function loadDetalle(preserveSelected = true) {
    if (!subexpedienteId || Number.isNaN(subexpedienteId)) {
      setDetalleRows([]);
      setDrafts({});
      setDetalleError("No se recibió un identificador válido de subexpediente.");
      setLoadingDetalle(false);
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

      if (!preserveSelected) {
        setSelectedByFase({});
      } else {
        setSelectedByFase((prev) => {
          const next = { ...prev };

          faseOrder.forEach((fase) => {
            const rowsInPhase = loadedRows.filter((row) => row.fase === fase);

            if (rowsInPhase.length === 0) {
              delete next[fase];
              return;
            }

            const currentId = next[fase];
            const stillExists = rowsInPhase.some((row) => row.recepcion_id === currentId);

            if (!currentId || !stillExists) {
              const bestRow = getBestRowForPhase(rowsInPhase, estadoTrabajo);
              if (bestRow) next[fase] = bestRow.recepcion_id;
            }
          });

          return next;
        });
      }

      setLoadingDetalle(false);
    } catch (err: any) {
      setDetalleError(err?.message ?? "No se pudo cargar la mesa documental.");
      setDetalleRows([]);
      setDrafts({});
      setLoadingDetalle(false);
    }
  }

  useEffect(() => {
    loadDetalle(true);
  }, [subexpedienteId]);

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

  function prepararAccionRapida(row: RecepcionRow, estado: string) {
    const tecnico =
      estado === "no_aplica"
        ? ""
        : drafts[row.recepcion_id]?.tecnico_revisor ||
          row.tecnico_revisor ||
          defaultTecnicoForRow(row);

    const observacionBase =
      drafts[row.recepcion_id]?.observaciones ?? row.observaciones ?? "";

    const textoAccion =
      estado === "recibido"
        ? "Recepción documental registrada desde mesa documental independiente."
        : estado === "validado"
          ? "Control documental validado desde mesa documental independiente."
          : estado === "subsanable"
            ? "Control documental marcado para subsanación desde mesa documental independiente."
            : estado === "no_aplica"
              ? "Control documental marcado como no aplica desde mesa documental independiente."
              : "Cambio de control documental registrado desde mesa documental independiente.";

    updateDraft(row.recepcion_id, {
      estado_documental: estado,
      tecnico_revisor: tecnico,
      comunicado_ente_fiscalizador: estado === "no_aplica" ? false : true,
      observaciones: appendObservation(observacionBase, textoAccion),
    });
  }

  function prepararCorreccion(row: RecepcionRow, tipo: "modificar" | "reabrir" | "revertir") {
    const draft = drafts[row.recepcion_id] ?? makeDraft(row);
    const tecnico =
      draft.tecnico_revisor ||
      row.tecnico_revisor ||
      defaultTecnicoForRow(row);

    if (tipo === "modificar") {
      updateDraft(row.recepcion_id, {
        estado_documental: draft.estado_documental || row.estado_documental,
        tecnico_revisor: tecnico,
        comunicado_ente_fiscalizador: true,
        observaciones: appendObservation(
          draft.observaciones,
          "Modificación de revisión: se actualiza la información del control documental manteniendo trazabilidad en observaciones."
        ),
      });
      return;
    }

    if (tipo === "reabrir") {
      updateDraft(row.recepcion_id, {
        estado_documental: "en_revision",
        tecnico_revisor: tecnico,
        comunicado_ente_fiscalizador: true,
        observaciones: appendObservation(
          draft.observaciones,
          `Reapertura de revisión: el control pasa de ${labelFromOptions(
            estadoOptions,
            row.estado_documental
          )} a En revisión para comprobación técnica.`
        ),
      });
      return;
    }

    updateDraft(row.recepcion_id, {
      estado_documental: "recibido",
      tecnico_revisor: tecnico,
      comunicado_ente_fiscalizador: true,
      observaciones: appendObservation(
        draft.observaciones,
        `Reversión operativa: el control pasa de ${labelFromOptions(
          estadoOptions,
          row.estado_documental
        )} a Recibido para nueva revisión.`
      ),
    });
  }

  async function guardarFila(row: RecepcionRow) {
    const draft = drafts[row.recepcion_id];

    if (!draft) return;

    setSavingId(row.recepcion_id);
    setSavedId(null);
    setSaveError(null);

    const nowIso = new Date().toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const estadoConRecepcion = [
      "recibido",
      "en_revision",
      "validado",
      "subsanable",
      "rechazado",
      "vencido",
    ].includes(draft.estado_documental);

    const estadoConRevision = [
      "en_revision",
      "validado",
      "subsanable",
      "rechazado",
      "vencido",
    ].includes(draft.estado_documental);

    const tecnicoFinal =
      draft.estado_documental === "no_aplica"
        ? null
        : draft.tecnico_revisor.trim() !== ""
          ? draft.tecnico_revisor.trim()
          : estadoConRecepcion
            ? defaultTecnicoForRow(row)
            : null;

    const observacionesFinal =
      draft.observaciones.trim() === "" ? null : draft.observaciones.trim();

    let comunicadoNuevo =
      draft.estado_documental === "no_aplica"
        ? false
        : draft.comunicado_ente_fiscalizador;

    let requiereSubsanacionNuevo = row.requiere_subsanacion;
    let fechaRecepcionNueva = row.fecha_recepcion;
    let fechaRevisionNueva = row.fecha_revision;
    let fechaRequerimientoNueva = row.fecha_requerimiento;
    let fechaSubsanacionNueva = row.fecha_subsanacion;

    if (estadoConRecepcion && !row.fecha_recepcion) {
      fechaRecepcionNueva = nowIso;
    }

    if (estadoConRevision) {
      fechaRevisionNueva = nowIso;
    }

    if (draft.estado_documental === "recibido") {
      requiereSubsanacionNuevo = false;
    }

    if (
      draft.estado_documental === "subsanable" ||
      draft.estado_documental === "rechazado"
    ) {
      requiereSubsanacionNuevo = true;

      if (!row.fecha_requerimiento) {
        fechaRequerimientoNueva = today;
      }
    }

    if (draft.estado_documental === "validado") {
      requiereSubsanacionNuevo = false;

      if (row.estado_documental === "subsanable" || row.requiere_subsanacion) {
        if (!row.fecha_subsanacion) {
          fechaSubsanacionNueva = today;
        }
      }

      if (!row.fecha_recepcion) {
        fechaRecepcionNueva = nowIso;
      }

      if (!row.fecha_revision) {
        fechaRevisionNueva = nowIso;
      }
    }

    if (draft.estado_documental === "no_aplica") {
      fechaRecepcionNueva = null;
      fechaRevisionNueva = null;
      fechaRequerimientoNueva = null;
      fechaSubsanacionNueva = null;
      comunicadoNuevo = false;
      requiereSubsanacionNuevo = false;
    }

    const { error } = await supabase.rpc("registrar_movimiento_documental_v1", {
      p_recepcion_documentacion_id: row.recepcion_id,
      p_estado_nuevo: draft.estado_documental,
      p_tecnico_nuevo: tecnicoFinal,
      p_observaciones_nuevas: observacionesFinal,
      p_requiere_subsanacion_nuevo: requiereSubsanacionNuevo,
      p_comunicado_ente_fiscalizador_nuevo: comunicadoNuevo,
      p_fecha_recepcion_nueva: fechaRecepcionNueva,
      p_fecha_revision_nueva: fechaRevisionNueva,
      p_fecha_requerimiento_nueva: fechaRequerimientoNueva,
      p_fecha_subsanacion_nueva: fechaSubsanacionNueva,
      p_tipo_movimiento: getTipoMovimiento(row, draft),
      p_motivo_cambio: getMotivoCambio(row, draft),
      p_origen: "mesa_documental",
    });

    if (error) {
      setSaveError(error.message);
      setSavingId(null);
      return;
    }

    setSelectedByFase((prev) => ({
      ...prev,
      [row.fase]: row.recepcion_id,
    }));

    setSavingId(null);
    setSavedId(row.recepcion_id);

    await loadDetalle(true);

    window.setTimeout(() => {
      setSavedId((current) => (current === row.recepcion_id ? null : current));
    }, 1800);
  }

  const rowsByFase = useMemo(() => {
    const grouped: Record<string, RecepcionRow[]> = {};

    faseOrder.forEach((fase) => {
      grouped[fase] = detalleRows.filter((row) => row.fase === fase);
    });

    return grouped;
  }, [detalleRows]);

  const resumenTrabajo = useMemo(() => {
    const total = detalleRows.length;
    const validados = detalleRows.filter(
      (row) => row.estado_documental === "validado"
    ).length;
    const recibidos = detalleRows.filter(
      (row) => row.estado_documental === "recibido"
    ).length;
    const enRevision = detalleRows.filter(
      (row) => row.estado_documental === "en_revision"
    ).length;
    const noRecibidos = detalleRows.filter(
      (row) => row.estado_documental === "no_recibido"
    ).length;
    const subsanacion = detalleRows.filter(
      (row) => row.estado_documental === "subsanable" || row.requiere_subsanacion
    ).length;
    const riesgoActivo = detalleRows.filter(rowTieneRiesgoActivo).length;
    const sinFuente = detalleRows.filter((row) => !rowTieneFuente(row)).length;

    return {
      total,
      validados,
      recibidos,
      enRevision,
      noRecibidos,
      subsanacion,
      riesgoActivo,
      sinFuente,
      pendientesValidar: recibidos + enRevision,
    };
  }, [detalleRows]);

  const faseStats = useMemo<FaseStats[]>(() => {
    return faseOrder.map((fase) => {
      const rows = detalleRows.filter((row) => row.fase === fase);
      const validado = rows.filter((row) => row.estado_documental === "validado").length;
      const recibido = rows.filter((row) => row.estado_documental === "recibido").length;
      const revision = rows.filter((row) => row.estado_documental === "en_revision").length;
      const noRecibido = rows.filter(
        (row) => row.estado_documental === "no_recibido"
      ).length;
      const noAplica = rows.filter((row) => row.estado_documental === "no_aplica").length;
      const subsanacion = rows.filter(
        (row) => row.estado_documental === "subsanable" || row.requiere_subsanacion
      ).length;
      const riesgo = rows.filter(rowTieneRiesgoActivo).length;

      return {
        fase,
        total: rows.length,
        validado,
        recibido,
        revision,
        noRecibido,
        noAplica,
        subsanacion,
        riesgo,
        pendientes: recibido + revision + subsanacion + noRecibido,
      };
    });
  }, [detalleRows]);

  const tareaRecomendada = useMemo(() => {
    const faseConRiesgo = faseStats.find((fase) => fase.riesgo > 0);
    if (faseConRiesgo) {
      return `${labelFromOptions(faseOptions, faseConRiesgo.fase)}: revisar ${num(
        faseConRiesgo.riesgo
      )} controles con riesgo activo.`;
    }

    const faseConSubsanacion = faseStats.find((fase) => fase.subsanacion > 0);
    if (faseConSubsanacion) {
      return `${labelFromOptions(faseOptions, faseConSubsanacion.fase)}: resolver ${num(
        faseConSubsanacion.subsanacion
      )} controles pendientes de subsanación.`;
    }

    const faseConRecibidos = faseStats.find(
      (fase) => fase.recibido + fase.revision > 0
    );
    if (faseConRecibidos) {
      return `${labelFromOptions(faseOptions, faseConRecibidos.fase)}: validar o subsanar ${num(
        faseConRecibidos.recibido + faseConRecibidos.revision
      )} controles recibidos o en revisión.`;
    }

    const faseConNoRecibidos = faseStats.find((fase) => fase.noRecibido > 0);
    if (faseConNoRecibidos) {
      return `${labelFromOptions(faseOptions, faseConNoRecibidos.fase)}: solicitar o registrar recepción de ${num(
        faseConNoRecibidos.noRecibido
      )} controles no recibidos.`;
    }

    if (resumenTrabajo.sinFuente > 0) {
      return `Revisar ${num(resumenTrabajo.sinFuente)} controles sin fuente normativa visible.`;
    }

    return "Mesa documental sin actuaciones técnicas pendientes según la lectura actual.";
  }, [faseStats, resumenTrabajo.sinFuente]);

  const visibleFases = useMemo(() => {
    if (faseActiva === "todos") return faseOrder;
    return faseOrder.filter((fase) => fase === faseActiva);
  }, [faseActiva]);

  function selectDocumentForPhase(fase: string, recepcionId: number) {
    setSelectedByFase((prev) => ({
      ...prev,
      [fase]: recepcionId,
    }));
  }

  function getSelectedRowForPhase(fase: FaseKey) {
    const rows = rowsByFase[fase] ?? [];
    if (rows.length === 0) return null;

    const selectedId = selectedByFase[fase];
    const selected = rows.find((row) => row.recepcion_id === selectedId);

    if (selected) return selected;

    return getBestRowForPhase(rows, estadoTrabajo);
  }

  function renderDocumentCard(row: RecepcionRow) {
    const draft = drafts[row.recepcion_id] ?? makeDraft(row);
    const hasChanges = rowHasChanges(row);
    const estadoActualLabel = labelFromOptions(estadoOptions, row.estado_documental);

    const criticidadLabel = labelFromOptions(
      [
        { value: "bajo", label: "Baja" },
        { value: "medio", label: "Media" },
        { value: "alto", label: "Alta" },
        { value: "critico", label: "Crítica" },
      ],
      row.criticidad_documental ?? row.riesgo_actual
    );

    const riesgoActivoValue = row.riesgo_activo_documental ?? "sin_riesgo_activo";
    const riesgoActivoLabel = row.riesgo_activo_label ?? "Sin riesgo activo";

    return (
      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_0.72fr_1fr_auto]">
          <div>
            <p
              className="text-[12px] font-semibold leading-5 text-slate-950"
              title={clean(row.nombre_documento)}
            >
              {clean(row.nombre_documento)}
            </p>

            <p className="mt-0.5 text-[10.5px] leading-4 text-slate-500">
              {row.codigo_documento_sce || row.codigo_documento_ministerio
                ? `${clean(row.codigo_documento_sce, "")}${
                    row.codigo_documento_sce && row.codigo_documento_ministerio
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

            <p className="mt-1 text-[10.5px] leading-4 text-slate-500">
              Plazo:{" "}
              <span className="font-semibold text-slate-700">
                {clean(row.plazo_relativo)}
              </span>
            </p>

            <p className="text-[10.5px] leading-4 text-slate-500">
              Actuación sugerida: {shortText(row.actuacion_sugerida, 120)}
            </p>

            <p className="mt-1 text-[10.5px] leading-4 text-slate-500">
              Fuente:{" "}
              <span
                className={
                  rowTieneFuente(row)
                    ? "font-semibold text-emerald-700"
                    : "font-semibold text-red-700"
                }
              >
                {rowTieneFuente(row) ? clean(row.fuente_nombre, "FPED trazado") : "Sin fuente visible"}
              </span>
            </p>

            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] leading-4 text-emerald-900">
              Trazabilidad activa: al guardar, la mesa registra movimiento histórico mediante RPC y actualiza la situación vigente del control documental.
            </div>
          </div>

          <div>
            <div className="flex flex-wrap gap-1">
              <SmallBadge className={estadoBadgeClass(row.estado_documental)}>
                {estadoActualLabel}
              </SmallBadge>
              <SmallBadge
                className={criticidadBadgeClass(
                  row.criticidad_documental ?? row.riesgo_actual
                )}
              >
                {criticidadLabel}
              </SmallBadge>
              <SmallBadge className={riesgoActivoBadgeClass(riesgoActivoValue)}>
                {riesgoActivoLabel}
              </SmallBadge>
            </div>

            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10.5px] leading-4 text-slate-500">
              <p>Límite: {formatDate(row.fecha_limite)}</p>
              <p>Recepción: {formatDate(row.fecha_recepcion)}</p>
              <p>Revisión: {formatDate(row.fecha_revision)}</p>
              <p>Técnico: {clean(row.tecnico_revisor)}</p>
              <p>Comunicado: {row.comunicado_ente_fiscalizador ? "Sí" : "No"}</p>
              <p>Subsanación: {row.requiere_subsanacion ? "Sí" : "No"}</p>
            </div>
          </div>

          <div>
            <div className="grid gap-1.5">
              <select
                value={draft.estado_documental}
                onChange={(event) =>
                  updateDraft(row.recepcion_id, {
                    estado_documental: event.target.value,
                  })
                }
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold outline-none focus:border-blue-400"
              >
                {estadoOptions.map((option) => (
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
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] outline-none focus:border-blue-400"
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
                rows={3}
                placeholder={shortText(row.actuacion_sugerida, 70)}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] leading-4 outline-none focus:border-blue-400"
              />

              <label className="flex items-center gap-1 text-[10px] text-slate-500">
                <input
                  type="checkbox"
                  checked={draft.comunicado_ente_fiscalizador}
                  onChange={(event) =>
                    updateDraft(row.recepcion_id, {
                      comunicado_ente_fiscalizador: event.target.checked,
                    })
                  }
                />
                Comunicado al ente fiscalizador
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 lg:w-[148px]">
            <button
              type="button"
              disabled={!hasChanges || savingId === row.recepcion_id}
              onClick={() => guardarFila(row)}
              className={
                hasChanges
                  ? "rounded-lg bg-[#183B63] px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-[#102a47] disabled:opacity-60"
                  : "rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-400"
              }
            >
              {savingId === row.recepcion_id
                ? "Guardando..."
                : savedId === row.recepcion_id
                  ? "Guardado"
                  : hasChanges
                    ? "Guardar"
                    : "Sin cambios"}
            </button>

            <button
              type="button"
              onClick={() => prepararAccionRapida(row, "recibido")}
              className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] font-semibold text-blue-800 hover:bg-blue-100"
            >
              Registrar recepción
            </button>

            <button
              type="button"
              onClick={() => prepararAccionRapida(row, "validado")}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Validar
            </button>

            <button
              type="button"
              onClick={() => prepararAccionRapida(row, "subsanable")}
              className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-[10px] font-semibold text-orange-800 hover:bg-orange-100"
            >
              Subsanar
            </button>

            <button
              type="button"
              onClick={() => prepararAccionRapida(row, "no_aplica")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
            >
              No aplica
            </button>

            <div className="my-1 border-t border-slate-200" />

            <button
              type="button"
              onClick={() => prepararCorreccion(row, "modificar")}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[10px] font-semibold text-indigo-800 hover:bg-indigo-100"
            >
              Modificar revisión
            </button>

            <button
              type="button"
              onClick={() => prepararCorreccion(row, "reabrir")}
              className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
            >
              Reabrir revisión
            </button>

            <button
              type="button"
              onClick={() => prepararCorreccion(row, "revertir")}
              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-semibold text-red-800 hover:bg-red-100"
            >
              Revertir a recibido
            </button>

            {row.fuente_url ? (
              <a
                href={row.fuente_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fuente PDF
              </a>
            ) : null}

            <Link
              href={`/matriz-normativa-documental?fase=${row.fase}&control=${row.documento_normativo_id}`}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-center text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Matriz
            </Link>
          </div>
        </div>
      </div>
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
            <h1 className="mt-1 text-xl font-semibold">Mesa documental</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Mesa técnica por fases: seleccionar control documental, revisar, validar, subsanar, corregir o marcar no aplica.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
              Subexpediente {id || "—"}
            </div>
            <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-100">
              {loadingDetalle
                ? "Cargando controles..."
                : `${num(resumenTrabajo.total)} controles documentales`}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-2 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/recepcion-documentacion"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              ← Volver a recepción documental
            </Link>

            <Link
              href={`/estado-pago/${id}`}
              className="text-xs font-semibold text-violet-800 hover:text-violet-950"
            >
              Estado de pago
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

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 shadow-sm">
            Mesa independiente · trazabilidad histórica activa
          </span>
        </div>

        {detalleError ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 shadow-sm">
            No se pudo cargar la mesa documental: {detalleError}
            <button
              type="button"
              onClick={() => loadDetalle(true)}
              className="ml-2 rounded-lg border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-800 hover:bg-red-100"
            >
              Reintentar
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

        <section className="grid gap-2 lg:grid-cols-8">
          <KpiBox
            label="Controles"
            value={loadingDetalle ? "—" : num(resumenTrabajo.total)}
            detail="matriz documental"
          />
          <KpiBox
            label="Pend. validar"
            value={loadingDetalle ? "—" : num(resumenTrabajo.pendientesValidar)}
            detail="recibidos/revisión"
            tone="blue"
          />
          <KpiBox
            label="Recibidos"
            value={loadingDetalle ? "—" : num(resumenTrabajo.recibidos)}
            detail="sin validar"
            tone="blue"
          />
          <KpiBox
            label="En revisión"
            value={loadingDetalle ? "—" : num(resumenTrabajo.enRevision)}
            detail="técnico"
            tone="amber"
          />
          <KpiBox
            label="Validados"
            value={loadingDetalle ? "—" : num(resumenTrabajo.validados)}
            detail="conformes"
            tone="green"
          />
          <KpiBox
            label="Subsanación"
            value={loadingDetalle ? "—" : num(resumenTrabajo.subsanacion)}
            detail="pendiente"
            tone="violet"
          />
          <KpiBox
            label="No recibidos"
            value={loadingDetalle ? "—" : num(resumenTrabajo.noRecibidos)}
            detail="sin aportar"
            tone="red"
          />
          <KpiBox
            label="Sin fuente"
            value={loadingDetalle ? "—" : num(resumenTrabajo.sinFuente)}
            detail="normativa"
            tone="slate"
          />
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-blue-950">
            Trabajo pendiente de la mesa
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-blue-900">
            {tareaRecomendada}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFaseActiva("todos")}
              className={
                faseActiva === "todos"
                  ? "rounded-lg bg-[#183B63] px-2.5 py-1 text-[10px] font-semibold text-white"
                  : "rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              }
            >
              Todas · {num(resumenTrabajo.total)} docs
            </button>

            {faseStats.map((item) => (
              <button
                key={item.fase}
                type="button"
                onClick={() => setFaseActiva(item.fase)}
                className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold hover:brightness-95 ${
                  faseActiva === item.fase
                    ? "border-[#183B63] bg-[#183B63] text-white"
                    : faseBoxClass(item)
                }`}
                title={faseResumenOperativo(item)}
              >
                {faseResumenOperativo(item)}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[
              ["todos", "Todos"],
              ["pendientes_validar", "Pendientes de validar"],
              ["recibidos", "Recibidos"],
              ["en_revision", "En revisión"],
              ["validados", "Validados"],
              ["subsanacion", "Subsanación"],
              ["no_recibidos", "No recibidos"],
              ["no_aplica", "No aplica"],
              ["riesgo_activo", "Riesgo activo"],
              ["sin_fuente", "Sin fuente"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setEstadoTrabajo(value as EstadoTrabajo)}
                className={
                  estadoTrabajo === value
                    ? "rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white"
                    : "rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-[14px] font-semibold leading-5">
                Trabajo documental por fases
              </h2>
              <p className="text-[10.5px] leading-4 text-slate-500">
                Seleccione una fase y un control documental. La mesa conserva el control activo tras guardar.
              </p>
            </div>

            <Link
              href={`/estado-pago/${id}`}
              className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-semibold text-violet-800 hover:bg-violet-100"
            >
              Revisar estado de pago
            </Link>
          </div>

          {loadingDetalle ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
              Cargando controles documentales...
            </div>
          ) : null}

          {!loadingDetalle && detalleRows.length === 0 ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
              No hay controles documentales asociados a este subexpediente.
            </div>
          ) : null}

          {!loadingDetalle && detalleRows.length > 0 ? (
            <div className="mt-3 space-y-3">
              {visibleFases.map((fase) => {
                const rows = rowsByFase[fase] ?? [];
                const stats = faseStats.find((item) => item.fase === fase);
                const selectedRow = getSelectedRowForPhase(fase);
                const filteredRows = rows.filter((row) =>
                  shouldShowByTrabajo(row, estadoTrabajo)
                );
                const selectorRows = filteredRows.length > 0 ? filteredRows : rows;

                return (
                  <section
                    key={fase}
                    className={`rounded-xl border px-3 py-2 shadow-sm ${
                      stats ? faseBoxClass(stats) : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <SmallBadge className={faseBadgeClass(fase)}>
                            {labelFromOptions(faseOptions, fase)}
                          </SmallBadge>
                          <p className="text-[11px] font-semibold text-slate-800">
                            {stats ? faseResumenOperativo(stats) : "Sin lectura de fase"}
                          </p>
                        </div>
                        <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                          {selectorRows.length > 0
                            ? `${num(selectorRows.length)} controles disponibles con el filtro actual.`
                            : "No hay controles disponibles para esta fase con el filtro actual."}
                        </p>
                      </div>

                      <div className="w-full min-w-[260px] lg:w-[440px]">
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Control documental de la fase
                        </label>
                        <select
                          value={selectedRow?.recepcion_id ?? ""}
                          onChange={(event) =>
                            selectDocumentForPhase(fase, Number(event.target.value))
                          }
                          className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold outline-none focus:border-blue-400"
                        >
                          {selectorRows.length === 0 ? (
                            <option value="">Sin controles</option>
                          ) : null}

                          {selectorRows.map((row) => (
                            <option key={row.recepcion_id} value={row.recepcion_id}>
                              {labelFromOptions(estadoOptions, row.estado_documental)} ·{" "}
                              {row.nombre_documento}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedRow ? (
                      renderDocumentCard(selectedRow)
                    ) : (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4 text-center text-[11px] text-slate-500">
                        No hay control documental seleccionado para esta fase.
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-800">
            Regla operativa
          </p>
          <p className="text-[10.5px] leading-4 text-slate-500">
            Esta mesa trabaja documentación: recibir, revisar, validar, subsanar, corregir o marcar no aplica.
            La revisión de pago se realiza en una página separada para perfiles superiores. Cada guardado se
            registra ahora mediante RPC en la tabla histórica de movimientos documentales, conservando estado
            anterior, estado nuevo, técnico, motivo, usuario, fecha y origen de cada corrección.
          </p>
        </section>
      </section>

      <span className="hidden">{VERSION_MESA_DOCUMENTAL}</span>
    </main>
  );
}



