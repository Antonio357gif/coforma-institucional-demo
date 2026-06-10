"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type AccionDetalle = {
  oferta_id: number;
  entidad_id: number;
  entidad_nombre: string;
  cif: string;
  codigo_accion: string;
  tipo_oferta: string;
  codigo_especialidad: string;
  denominacion: string;
  familia_profesional: string | null;
  modalidad: string | null;
  horas: number | null;
  importe_concedido: number;
  importe_ejecutado: number;
  importe_en_riesgo: number;
  porcentaje_importe_en_riesgo: number | null;
  alumnos_inicio: number;
  alumnos_activos: number;
  bajas: number;
  porcentaje_alumnos_activos: number | null;
  porcentaje_bajas: number | null;
  estado_ejecucion: string;
  nivel_riesgo: string;
  alerta: string;
  decision_recomendada: string;
  prioridad_operativa: string;
  evidencia_a_revisar: string;
  lectura_institucional: string;
  recomendacion_institucional: string;
  estado_trazabilidad_resolucion: string;
  estado_trazabilidad_ejecucion: string;
  regla_alerta_aplicada: string | null;
  fuente_resolucion: string | null;
  fuente_ejecucion: string | null;
};

function euro(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(value ?? 0);
}

function pct(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value)} %`;
}

function badgeClass(value: string | null | undefined) {
  const normalizado = String(value ?? "").toLowerCase();

  if (normalizado.includes("alta") || normalizado.includes("alto") || normalizado.includes("riesgo")) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (normalizado.includes("media") || normalizado.includes("medio") || normalizado.includes("preventivo")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalizado.includes("inicio") || normalizado.includes("pendiente")) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function estadoOperativoLabel(value: string | null | undefined) {
  const normalizado = String(value ?? "").trim().toLowerCase();

  if (normalizado === "en_ejecucion") return "En ejecución";
  if (normalizado === "finalizada") return "Finalizada";
  if (normalizado === "pendiente_ejecutar") return "Pendiente/no iniciada";
  if (normalizado === "no_iniciada") return "No iniciada";
  if (normalizado === "finalizada_pendiente_justificacion") {
    return "Finalizada · pendiente de cierre administrativo";
  }
  if (normalizado === "riesgo_reintegro") return "Revisión/riesgo";
  if (normalizado === "incidencia") return "Revisión técnica";

  return value ? String(value).replaceAll("_", " ") : "—";
}

function esEnEjecucion(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase() === "en_ejecucion";
}

function esFinalizada(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase() === "finalizada";
}

function saneText(value: string | null | undefined) {
  return String(value ?? "—")
    .replaceAll("avance económico", "seguimiento operativo/documental")
    .replaceAll("Avance económico", "Seguimiento operativo/documental")
    .replaceAll("ejecución económica", "estado operativo/documental")
    .replaceAll("Ejecución económica", "Estado operativo/documental")
    .replaceAll("seguimiento económico", "seguimiento operativo/documental")
    .replaceAll("Seguimiento económico", "Seguimiento operativo/documental")
    .replaceAll("justificación parcial", "revisión administrativa")
    .replaceAll("Justificación parcial", "Revisión administrativa")
    .replaceAll("pendiente de justificación", "pendiente de cierre administrativo")
    .replaceAll("Pendiente de justificación", "Pendiente de cierre administrativo");
}

function lecturaInstitucionalSaneada(accion: AccionDetalle) {
  if (Number(accion.importe_en_riesgo ?? 0) > 0) {
    return saneText(accion.lectura_institucional);
  }

  if (esEnEjecucion(accion.estado_ejecucion)) {
    return "Acción en ejecución: mantiene seguimiento operativo y documental, sin imputación económica automática.";
  }

  if (esFinalizada(accion.estado_ejecucion)) {
    return "Acción finalizada: lectura de cierre administrativo y trazabilidad del subexpediente.";
  }

  return saneText(accion.lectura_institucional);
}

function evidenciaSaneada(accion: AccionDetalle) {
  if (Number(accion.importe_en_riesgo ?? 0) > 0) {
    return saneText(accion.evidencia_a_revisar);
  }

  if (esEnEjecucion(accion.estado_ejecucion)) {
    return "Mantener seguimiento ordinario de asistencia, alumnado activo y documentación/estado operativo.";
  }

  return saneText(accion.evidencia_a_revisar);
}

function decisionSaneada(accion: AccionDetalle) {
  if (Number(accion.importe_en_riesgo ?? 0) > 0) {
    return saneText(accion.decision_recomendada);
  }

  if (esEnEjecucion(accion.estado_ejecucion)) {
    return "Seguimiento ordinario operativo y documental";
  }

  if (esFinalizada(accion.estado_ejecucion)) {
    return "Mantener trazabilidad de cierre";
  }

  return saneText(accion.decision_recomendada);
}

function recomendacionSaneada(accion: AccionDetalle) {
  if (Number(accion.importe_en_riesgo ?? 0) > 0) {
    return saneText(accion.recomendacion_institucional);
  }

  if (esEnEjecucion(accion.estado_ejecucion)) {
    return "Mantener seguimiento ordinario operativo y documental, sin imputación económica automática.";
  }

  if (esFinalizada(accion.estado_ejecucion)) {
    return "Mantener trazabilidad administrativa y revisar solo si existe incidencia sobrevenida.";
  }

  return saneText(accion.recomendacion_institucional);
}

function DataCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-h-[62px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
      <p className="truncate text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[15px] font-semibold leading-5 text-slate-950">
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">{detail}</p>
      ) : null}
    </div>
  );
}

export default function SubexpedienteAccionPage() {
  const params = useParams();
  const ofertaId = Number(params.id);

  const [accion, setAccion] = useState<AccionDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccion() {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("v_fiscalizacion_trazabilidad_accion")
        .select("*")
        .eq("oferta_id", ofertaId)
        .limit(1)
        .maybeSingle();

      if (supabaseError) {
        setError(supabaseError.message);
        setLoading(false);
        return;
      }

      setAccion(data as AccionDetalle);
      setLoading(false);
    }

    if (!Number.isNaN(ofertaId)) {
      loadAccion();
    } else {
      setError("Identificador de acción no válido.");
      setLoading(false);
    }
  }, [ofertaId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando subexpediente de acción...</p>
        </section>
      </main>
    );
  }

  if (error || !accion) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <Link href="/oferta-formativa" className="text-xs font-semibold text-blue-800">
            ← Volver a oferta formativa
          </Link>

          <p className="mt-4 text-sm font-semibold text-red-700">
            Error cargando subexpediente
          </p>

          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se pudo cargar la acción."}
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
            <h1 className="mt-1 text-xl font-semibold">Ficha de oferta/subexpediente formativo</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              {accion.codigo_accion} · {accion.codigo_especialidad} · {accion.tipo_oferta}
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            Oferta #{accion.oferta_id} · Entidad #{accion.entidad_id}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-2 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/oferta-formativa" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            ← Volver a oferta formativa
          </Link>

          <span className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold ${badgeClass(accion.prioridad_operativa)}`}>
            Prioridad: {accion.prioridad_operativa}
          </span>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.25fr_0.55fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad beneficiaria
              </p>
              <h2 className="mt-0.5 text-[17px] font-semibold leading-5 text-slate-950">
                {accion.entidad_nombre}
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">{accion.cif}</p>
            </div>

            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Acción
              </p>
              <p className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950">
                {accion.codigo_accion}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{accion.tipo_oferta}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Especialidad
              </p>
              <p className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950">
                {accion.codigo_especialidad}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-600">
                {accion.denominacion}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-2 lg:grid-cols-4">
          <DataCard label="Importe concedido" value={euro(accion.importe_concedido)} />
          <DataCard
            label="Control económico"
            value={euro(accion.importe_en_riesgo)}
            detail={Number(accion.importe_en_riesgo ?? 0) > 0 ? "revisión/riesgo activo" : "sin revisión económica activa"}
          />
          <DataCard
            label="Alumnado activo"
            value={num(accion.alumnos_activos)}
            detail={`${num(accion.alumnos_inicio)} inicio · ${pct(accion.porcentaje_alumnos_activos)}`}
          />
          <DataCard
            label="Bajas"
            value={num(accion.bajas)}
            detail={pct(accion.porcentaje_bajas)}
          />
        </section>

        <section className="grid gap-2 lg:grid-cols-[0.86fr_1.34fr]">
          <section className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Estado operativo
              </span>
              <span className="text-[12px] font-semibold">{estadoOperativoLabel(accion.estado_ejecucion)}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Nivel de riesgo
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(accion.nivel_riesgo)}`}>
                {accion.nivel_riesgo}
              </span>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Alerta
              </p>
              <p className="mt-0.5 text-[12px] leading-5 text-slate-800">{accion.alerta}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Trazabilidad
              </p>
              <div className="mt-1 grid gap-1 text-[11px]">
                <p>
                  Resolución: <strong>{accion.estado_trazabilidad_resolucion}</strong>
                </p>
                <p>
                  Seguimiento: <strong>{saneText(accion.estado_trazabilidad_ejecucion)}</strong>
                </p>
                <p>
                  Horas: <strong>{num(accion.horas)}</strong>
                </p>
                <p>
                  Modalidad: <strong>{accion.modalidad ?? "—"}</strong>
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <section className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] leading-5 text-blue-950">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-blue-700">
                Lectura institucional
              </p>
              <p className="mt-1">{lecturaInstitucionalSaneada(accion)}</p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Evidencia a revisar
              </p>
              <p className="mt-1 text-[13px] leading-5 text-slate-700">
                {evidenciaSaneada(accion)}
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Decisión recomendada
              </p>
              <p className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950">
                {decisionSaneada(accion)}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-slate-700">
                {recomendacionSaneada(accion)}
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Fuente y regla aplicada
              </p>
              <div className="mt-1 grid gap-1 text-[11px] text-slate-700 md:grid-cols-3">
                <p>
                  Regla: <strong>{accion.regla_alerta_aplicada ?? "—"}</strong>
                </p>
                <p>
                  Resolución: <strong>{accion.fuente_resolucion ?? "—"}</strong>
                </p>
                <p>
                  Ejecución: <strong>{accion.fuente_ejecucion ?? "—"}</strong>
                </p>
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-2">
              <Link
                href={`/justificacion-economica?ofertaId=${accion.oferta_id}`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver estado económico/control
              </Link>

              <Link
                href={`/acciones/nueva?ofertaId=${accion.oferta_id}`}
                className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f]"
              >
                Emitir actuación
              </Link>

              <Link
                href="/oferta-formativa"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Volver a oferta formativa
              </Link>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}