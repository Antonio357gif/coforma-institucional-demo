"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    normalizado.includes("ordinario") ||
    normalizado.includes("ejecucion")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
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
  tone?: "default" | "amber" | "red" | "green";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200"
      : tone === "amber"
      ? "border-amber-200"
      : tone === "green"
      ? "border-emerald-200"
      : "border-slate-200";

  return (
    <div className={`rounded-xl border ${toneClass} bg-white px-3 py-3 shadow-sm`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {labelText}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
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

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold">Decisión económica</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Ficha individual de decisión sobre justificación, riesgo y actuación administrativa.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {decision.codigo_accion ?? "—"} · {decision.codigo_especialidad ?? "—"} ·{" "}
            {decision.tipo_oferta ?? "—"}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              ← Volver
            </button>

            <Link
              href="/justificacion-economica"
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
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm ${badgeClass(
              decision.prioridad_decision
            )}`}
          >
            Prioridad: {label(decision.prioridad_decision)}
          </span>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.15fr_0.65fr_1.1fr]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad beneficiaria
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                {decision.entidad_nombre ?? "—"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{decision.cif ?? "—"}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Acción
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950">
                {decision.codigo_accion ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{decision.tipo_oferta ?? "—"}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Especialidad
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950">
                {decision.codigo_especialidad ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">{decision.denominacion ?? "—"}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi
            labelText="Importe concedido"
            value={euro(decision.importe_concedido)}
            detail="resolución concedida"
          />

          <Kpi
            labelText="Ejecutado"
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
            labelText="Pendiente justificar"
            value={euro(decision.importe_pendiente_justificar)}
            detail={pct(decision.importe_pendiente_justificar, decision.importe_concedido)}
            tone="amber"
          />

          <Kpi
            labelText="En riesgo"
            value={euro(decision.importe_en_riesgo)}
            detail={label(decision.riesgo_economico)}
            tone="red"
          />

          <Kpi
            labelText="No admitido"
            value={euro(decision.importe_no_admitido)}
            detail="importe no validado"
            tone="red"
          />
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.95fr_1.35fr]">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Estado justificación
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                  decision.estado_justificacion
                )}`}
              >
                {label(decision.estado_justificacion)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Estado operativo
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                  decision.estado_operativo_administrativo
                )}`}
              >
                {label(decision.estado_operativo_label ?? decision.estado_operativo_administrativo)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Nivel de riesgo
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                  decision.nivel_riesgo
                )}`}
              >
                {label(decision.nivel_riesgo)}
              </span>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Técnico asignado
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {decision.tecnico_nombre ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{decision.tecnico_unidad ?? "—"}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Datos de ejecución
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
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

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <section className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                Lectura para toma de decisiones
              </p>
              <p className="mt-1">
                Esta ficha concentra la justificación económica del subexpediente, el importe pendiente,
                el posible riesgo de reintegro, el estado de ejecución, la evidencia documental pendiente
                y la actuación administrativa sugerida.
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Decisión recomendada
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950">
                {label(decision.decision_recomendada)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {decision.motivo_decision ?? "Sin motivo específico registrado."}
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Actuación sugerida
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {decision.actuacion_sugerida ?? "Sin actuación sugerida registrada."}
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Evidencia administrativa
              </p>

              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                  <p className="text-[10px] text-slate-500">Incidencias abiertas</p>
                  <p className="text-sm font-semibold">{num(decision.incidencias_abiertas)}</p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                  <p className="text-[10px] text-slate-500">Requerimientos</p>
                  <p className="text-sm font-semibold">{num(decision.requerimientos_pendientes)}</p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                  <p className="text-[10px] text-slate-500">Alerta</p>
                  <p className="text-sm font-semibold">{label(decision.alerta)}</p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href={`/subexpedientes-accion/${decision.oferta_id}`}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver subexpediente
            </Link>

            <Link
              href="/justificacion-economica"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver justificación económica
            </Link>

            <Link
              href="/decisiones"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver a decisiones
            </Link>

            <Link
  href="/acciones"
  className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f]"
>
  Ir a acciones administrativas
</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
