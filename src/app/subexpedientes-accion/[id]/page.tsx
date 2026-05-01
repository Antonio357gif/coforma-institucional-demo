"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
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

function badgeClass(value: string) {
  const normalizado = value.toLowerCase();

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
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

export default function SubexpedienteAccionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ofertaId = Number(params.id);
  const tipologiaParam = searchParams.get("tipologia");

  const [accion, setAccion] = useState<AccionDetalle | null>(null);
  const [alertaTipificada, setAlertaTipificada] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccion() {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("v_fiscalizacion_trazabilidad_accion")
        .select("*")
        .eq("oferta_id", ofertaId).limit(1).maybeSingle();

      if (supabaseError) {
        setError(supabaseError.message);
        setLoading(false);
        return;
      }

      setAccion(data as AccionDetalle);

      if (tipologiaParam) {
        const { data: alertaData, error: alertaError } = await supabase
          .from("v_alertas_institucionales_tipificadas")
          .select("*")
          .eq("oferta_id", ofertaId)
          .eq("tipologia_codigo", tipologiaParam)
          .limit(1)
          .maybeSingle();

        if (!alertaError && alertaData) {
          setAlertaTipificada(alertaData);
        } else {
          setAlertaTipificada(null);
        }
      } else {
        setAlertaTipificada(null);
      }

      setLoading(false);
    }

    if (!Number.isNaN(ofertaId)) {
      loadAccion();
    } else {
      setError("Identificador de acción no válido.");
      setLoading(false);
    }
  }, [ofertaId, tipologiaParam]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-6 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-600">Cargando subexpediente de acción...</p>
        </section>
      </main>
    );
  }

  if (error || !accion) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-6 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-lg border border-red-200 bg-white p-3 shadow-sm">
          <Link href="/oferta-formativa" className="text-xs font-semibold text-blue-800">
            ← Volver a oferta formativa
          </Link>
          <p className="mt-4 text-sm font-semibold text-red-700">
            Error cargando subexpediente
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-xs text-red-800">
            {error ?? "No se pudo cargar la acción."}
          </pre>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-4 py-2 text-white shadow-sm">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Coforma Institucional
          </p>
          <h1 className="mt-0.5 text-lg font-semibold">Subexpediente de acción formativa</h1>
          <p className="mt-0.5 text-[11px] text-blue-100">
            {accion.codigo_accion} · {accion.codigo_especialidad} · {accion.tipo_oferta}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-2 px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/oferta-formativa" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            ← Volver a oferta formativa
          </Link>

          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(alertaTipificada?.nivel_aplicado ?? accion.prioridad_operativa)}`}>
            {alertaTipificada ? `Prioridad ${alertaTipificada.nivel_aplicado}` : accion.prioridad_operativa}
          </span>
        </div>        <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.45fr_0.9fr] lg:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad beneficiaria
              </p>
              <h2 className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950">
                {accion.entidad_nombre}
              </h2>
              <p className="text-[11px] text-slate-500">{accion.cif}</p>
            </div>

            <div className="lg:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Acción
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-950">{accion.codigo_accion}</p>
              <p className="text-[11px] text-slate-500">{accion.tipo_oferta}</p>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Especialidad
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-950">
                {accion.codigo_especialidad}
              </p>
              <p className="truncate text-[11px] text-slate-600">{accion.denominacion}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-2 lg:grid-cols-4">
          <DataCard label="Importe concedido" value={euro(accion.importe_concedido)} />
          <DataCard
            label="Importe en riesgo"
            value={euro(accion.importe_en_riesgo)}
            detail={pct(accion.porcentaje_importe_en_riesgo)}
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
        </section>        <section className="grid gap-2 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Estado ejecución</span>
                <span className="text-sm font-semibold">{accion.estado_ejecucion}</span>
              </div>

              <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase text-slate-500">
                  {alertaTipificada ? "Nivel de alerta" : "Nivel de riesgo"}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(alertaTipificada?.nivel_aplicado ?? accion.nivel_riesgo)}`}>
                  {alertaTipificada?.nivel_aplicado ?? accion.nivel_riesgo}
                </span>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Alerta</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-800">{alertaTipificada?.tipologia_nombre ?? accion.alerta}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid gap-2">
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Evidencia a revisar</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-800">{alertaTipificada?.evidencia_requerida ?? accion.evidencia_a_revisar}</p>
              </div>

              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-blue-900">Decisión recomendada</p>
                <p className="mt-0.5 text-xs leading-5 text-blue-950">{accion.decision_recomendada}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/justificacion-economica"
                  className="rounded-md bg-[#183B63] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#122f4f]"
                >
                  Ver justificación económica
                </Link>

                <Link
                  href={`/acciones/nueva?ofertaId=${ofertaId}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Emitir actuación
                </Link>

                <Link
                  href="/oferta-formativa"
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Volver a oferta formativa
                </Link>
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}





