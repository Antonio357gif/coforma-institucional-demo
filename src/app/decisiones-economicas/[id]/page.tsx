"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type DecisionEconomicaRow = {
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

function normalizar(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function label(value: string | null | undefined) {
  return String(value ?? "—").replaceAll("_", " ");
}

function labelInstitucional(value: string | null | undefined) {
  const texto = label(value);

  return texto
    .replaceAll("estimada para demo", "registrada")
    .replaceAll("estimado para demo", "registrado")
    .replaceAll("para demo", "")
    .replaceAll("  ", " ")
    .trim();
}

function estadoJustificacionLabel(value: string | null | undefined) {
  const estado = normalizar(value);

  if (estado === "no_devengado") return "No devengado";
  if (estado === "justificacion_parcial_en_curso") return "Justificación parcial en curso";
  if (estado === "justificacion_total") return "Justificación total";
  if (estado === "en_revision") return "En revisión";
  if (estado === "pendiente_justificar") return "Pendiente de justificar";
  if (!estado) return "Sin estado";

  return label(value);
}

function estadoOperativoLabel(value: string | null | undefined) {
  const estado = normalizar(value);

  if (estado === "en_ejecucion") return "En ejecución";
  if (estado === "finalizada") return "Finalizada";
  if (estado === "pendiente_ejecutar") return "Pendiente de ejecutar";
  if (estado === "finalizada_pendiente_justificacion") return "Finalizada";
  if (estado === "en_ejecucion_con_incidencia") return "Revisión/Riesgo";
  if (estado === "riesgo_reintegro") return "Revisión/Riesgo";
  if (!estado) return "Sin estado";

  return label(value);
}

function decisionLabel(value: string | null | undefined) {
  const decision = normalizar(value);

  if (decision === "sin_decision_economica") return "Sin decisión económica";
  if (decision === "seguimiento_ejecucion_y_justificacion") return "Seguimiento de ejecución y justificación";
  if (decision === "revisar_posible_reintegro") return "Revisión económica";
  if (decision === "seguimiento_ordinario") return "Seguimiento ordinario";
  if (!decision) return "Sin decisión registrada";

  return label(value);
}

function controlRevisionLabel(decision: DecisionEconomicaRow) {
  const importeRiesgo = Number(decision.importe_en_riesgo ?? 0);
  const incidencias = Number(decision.incidencias_abiertas ?? 0);
  const requerimientos = Number(decision.requerimientos_pendientes ?? 0);
  const alerta = normalizar(decision.alerta);
  const nivel = normalizar(decision.nivel_riesgo);

  const sinAlertaCritica =
    alerta.includes("sin alerta crítica") || alerta.includes("sin alerta critica");

  if (importeRiesgo > 0) return "Revisión/Riesgo";
  if (incidencias > 0) return "Revisión operativa";
  if (requerimientos > 0) return "Requerimiento pendiente";
  if (nivel.includes("alto")) return "Revisión prioritaria";
  if (alerta.includes("crítica") && !sinAlertaCritica) return "Revisión prioritaria";
  if (alerta.includes("critica") && !sinAlertaCritica) return "Revisión prioritaria";

  return "Control ordinario";
}

function lecturaControl(decision: DecisionEconomicaRow) {
  const importeRiesgo = Number(decision.importe_en_riesgo ?? 0);
  const incidencias = Number(decision.incidencias_abiertas ?? 0);
  const requerimientos = Number(decision.requerimientos_pendientes ?? 0);

  if (importeRiesgo > 0) {
    return "El subexpediente presenta importe en revisión/riesgo y requiere análisis económico específico.";
  }

  if (incidencias > 0 || requerimientos > 0) {
    return "El subexpediente tiene controles administrativos pendientes de seguimiento.";
  }

  return "Sin riesgo económico activo. Mantener seguimiento ordinario según estado operativo y avance registrado.";
}

function motivoDecision(decision: DecisionEconomicaRow) {
  if (decision.motivo_decision) return labelInstitucional(decision.motivo_decision);

  const estadoOperativo = normalizar(decision.estado_operativo_administrativo);
  const importeRiesgo = Number(decision.importe_en_riesgo ?? 0);

  if (estadoOperativo === "pendiente_ejecutar") {
    return "Acción pendiente de ejecutar: importe no devengado y sin avance económico reconocido.";
  }

  if (importeRiesgo > 0) {
    return "Subexpediente con importe económico en revisión.";
  }

  return "Seguimiento económico ordinario según la información disponible en backend.";
}

function actuacionSugerida(decision: DecisionEconomicaRow) {
  if (decision.actuacion_sugerida) return labelInstitucional(decision.actuacion_sugerida);

  const importeRiesgo = Number(decision.importe_en_riesgo ?? 0);
  const requerimientos = Number(decision.requerimientos_pendientes ?? 0);

  if (importeRiesgo > 0) return "Revisar documentación económica y preparar actuación administrativa si procede.";
  if (requerimientos > 0) return "Revisar requerimientos pendientes y documentar seguimiento.";
  return "Mantener seguimiento ordinario de ejecución.";
}

function badgeClass(value: string | null | undefined) {
  const normalizado = normalizar(value);

  if (
    normalizado.includes("alta") ||
    normalizado.includes("alto") ||
    normalizado.includes("riesgo") ||
    normalizado.includes("reintegro") ||
    normalizado.includes("revision") ||
    normalizado.includes("revisión")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    normalizado.includes("media") ||
    normalizado.includes("medio") ||
    normalizado.includes("pendiente") ||
    normalizado.includes("parcial")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    normalizado.includes("total") ||
    normalizado.includes("validada") ||
    normalizado.includes("ordinario") ||
    normalizado.includes("ejecucion") ||
    normalizado.includes("ejecución")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function controlBadgeClass(decision: DecisionEconomicaRow) {
  const control = controlRevisionLabel(decision);

  if (control === "Control ordinario") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (control.includes("Requerimiento")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

function kpiToneClass(tone: "default" | "amber" | "red" | "green" | "blue") {
  if (tone === "red") return "border-red-200";
  if (tone === "amber") return "border-amber-200";
  if (tone === "green") return "border-emerald-200";
  if (tone === "blue") return "border-blue-200";
  return "border-slate-200";
}

function Kpi({
  labelText,
  value,
  detail,
  tone = "default",
}: {
  labelText: string;
  value: string;
  detail: string;
  tone?: "default" | "amber" | "red" | "green" | "blue";
}) {
  return (
    <div className={`rounded-lg border ${kpiToneClass(tone)} bg-white px-3 py-1.5 shadow-sm`}>
      <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {labelText}
      </p>
      <p className="mt-0.5 truncate text-[14px] font-semibold leading-4 text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">
        {detail}
      </p>
    </div>
  );
}

export default function DecisionEconomicaDetallePage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params?.id ?? "");

  const [decision, setDecision] = useState<DecisionEconomicaRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function loadDecision() {
      setLoading(true);
      setError(null);

      const numericId = Number(id);

      if (!numericId || Number.isNaN(numericId)) {
        setError("Identificador de decisión no válido.");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("v_justificacion_economica")
        .select("*")
        .eq("id", numericId)
        .single();

      if (!activo) return;

      if (queryError) {
        setError(queryError.message);
        setDecision(null);
        setLoading(false);
        return;
      }

      setDecision(data as DecisionEconomicaRow);
      setLoading(false);
    }

    loadDecision();

    return () => {
      activo = false;
    };
  }, [id]);

  const justificacionHref = useMemo(() => {
    if (!decision?.oferta_id) return "/justificacion-economica";
    return `/justificacion-economica?ofertaId=${decision.oferta_id}`;
  }, [decision?.oferta_id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando decisión económica...</p>
        </section>
      </main>
    );
  }

  if (error || !decision) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            No se pudo cargar la decisión económica
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se encontró la decisión solicitada."}
          </pre>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver
            </button>

            <Link
              href="/justificacion-economica"
              className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white hover:bg-[#122f4f]"
            >
              Ir a justificación económica
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const importeRiesgo = Number(decision.importe_en_riesgo ?? 0);
  const noAdmitido = Number(decision.importe_no_admitido ?? 0);
  const control = controlRevisionLabel(decision);

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold">Ficha económica del subexpediente</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Lectura económica saneada: concesión, avance, no devengado, revisión y actuación administrativa.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {decision.codigo_accion ?? "—"} · {decision.codigo_especialidad ?? "—"} ·{" "}
            {decision.tipo_oferta ?? "—"}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-1.5 px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              ← Volver
            </button>

            <Link
              href={justificacionHref}
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Justificación económica
            </Link>

            <Link
              href="/decisiones"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Mesa de decisiones
            </Link>

            <Link
              href="/acciones"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Acciones administrativas
            </Link>
          </div>

          <span
            className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold shadow-sm ${controlBadgeClass(
              decision
            )}`}
          >
            {control}
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi
            labelText="Concedido"
            value={euro(decision.importe_concedido)}
            detail="resolución concedida"
            tone="blue"
          />

          <Kpi
            labelText="Avance registrado"
            value={euro(decision.importe_ejecutado)}
            detail={pct(decision.importe_ejecutado, decision.importe_concedido)}
            tone="green"
          />

          <Kpi
            labelText="Justificado"
            value={euro(decision.importe_justificado)}
            detail={pct(decision.importe_justificado, decision.importe_concedido)}
            tone="green"
          />

          <Kpi
            labelText="Pendiente / no devengado"
            value={euro(decision.importe_pendiente_justificar)}
            detail={pct(decision.importe_pendiente_justificar, decision.importe_concedido)}
            tone="amber"
          />

          <Kpi
            labelText="Revisión/Riesgo"
            value={euro(decision.importe_en_riesgo)}
            detail={importeRiesgo > 0 ? "requiere revisión económica" : "sin riesgo económico activo"}
            tone={importeRiesgo > 0 ? "red" : "green"}
          />

          <Kpi
            labelText="No admitido"
            value={euro(decision.importe_no_admitido)}
            detail={noAdmitido > 0 ? "importe no validado" : "sin importe no admitido"}
            tone={noAdmitido > 0 ? "red" : "green"}
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.05fr_0.55fr_1.05fr] lg:items-center">
            <div>
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad beneficiaria
              </p>
              <h2 className="mt-0.5 truncate text-[15px] font-semibold leading-5 text-slate-950">
                {decision.entidad_nombre ?? "—"}
              </h2>
              <p className="text-[10.5px] text-slate-500">{decision.cif ?? "—"}</p>
            </div>

            <div>
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Acción
              </p>
              <p className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950">
                {decision.codigo_accion ?? "—"}
              </p>
              <p className="text-[10.5px] text-slate-500">{decision.tipo_oferta ?? "—"}</p>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Especialidad
              </p>
              <p className="mt-0.5 text-[14px] font-semibold leading-4 text-slate-950">
                {decision.codigo_especialidad ?? "—"}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[10.5px] leading-4 text-slate-600">
                {decision.denominacion ?? "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-2 lg:grid-cols-[0.68fr_1.32fr]">
          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Pago administrativo
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                  decision.estado_justificacion
                )}`}
              >
                {estadoJustificacionLabel(decision.estado_justificacion)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Estado operativo
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                  decision.estado_operativo_administrativo
                )}`}
              >
                {estadoOperativoLabel(
                  decision.estado_operativo_label ?? decision.estado_operativo_administrativo
                )}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Control de revisión
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${controlBadgeClass(
                  decision
                )}`}
              >
                {control}
              </span>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Técnico asignado
              </p>
              <p className="mt-0.5 text-[12.5px] font-semibold leading-4 text-slate-950">
                {decision.tecnico_nombre ?? "—"}
              </p>
              <p className="text-[10.5px] text-slate-500">{decision.tecnico_unidad ?? "—"}</p>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Datos de ejecución
              </p>

              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10.5px] leading-4">
                <p>
                  Inicio: <strong>{num(decision.alumnos_inicio)}</strong>
                </p>
                <p>
                  Activos: <strong>{num(decision.alumnos_activos)}</strong>
                </p>
                <p>
                  Bajas: <strong>{num(decision.bajas)}</strong>
                </p>
                <p>
                  Aptos: <strong>{num(decision.aptos)}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <section className="rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] leading-4 text-blue-950">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-blue-700">
                Lectura para toma de decisiones
              </p>
              <p className="mt-0.5">{lecturaControl(decision)}</p>
            </section>

            <section className="rounded-md border border-slate-200 bg-white px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Decisión recomendada
              </p>
              <p className="mt-0.5 text-[13px] font-semibold leading-4 text-slate-950">
                {decisionLabel(decision.decision_recomendada)}
              </p>
              <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-slate-700">
                {motivoDecision(decision)}
              </p>
            </section>

            <section className="rounded-md border border-slate-200 bg-white px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Actuación sugerida
              </p>
              <p className="mt-0.5 line-clamp-3 text-[11px] leading-4 text-slate-700">
                {actuacionSugerida(decision)}
              </p>
            </section>

            <section className="rounded-md border border-slate-200 bg-white px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Evidencia administrativa
              </p>

              <div className="mt-1 grid gap-2 md:grid-cols-3">
                <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[9.5px] text-slate-500">Incidencias abiertas</p>
                  <p className="text-[12px] font-semibold leading-4">
                    {num(decision.incidencias_abiertas)}
                  </p>
                </div>

                <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[9.5px] text-slate-500">Requerimientos</p>
                  <p className="text-[12px] font-semibold leading-4">
                    {num(decision.requerimientos_pendientes)}
                  </p>
                </div>

                <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[9.5px] text-slate-500">Alerta</p>
                  <p className="truncate text-[12px] font-semibold leading-4">
                    {lecturaControl(decision)}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href={`/subexpedientes-accion/${decision.oferta_id}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver subexpediente
            </Link>

            <Link
              href={justificacionHref}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver justificación económica
            </Link>

            <Link
              href="/decisiones"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver a decisiones
            </Link>

            <Link
              href={`/acciones/nueva?ofertaId=${decision.oferta_id}`}
              className="rounded-md bg-[#183B63] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#122f4f]"
            >
              Preparar actuación administrativa
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}