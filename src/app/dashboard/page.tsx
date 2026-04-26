"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Resumen = {
  convocatoria_codigo: string;
  convocatoria_nombre: string;
  entidades_beneficiarias: number;
  acciones_concedidas: number;
  acciones_af: number;
  acciones_cp: number;
  importe_total_concedido: number;
  importe_total_en_riesgo: number;
  alumnos_previstos: number;
  alumnos_inicio: number;
  alumnos_activos: number;
  bajas: number;
  aptos: number;
  no_aptos: number;
  alertas_altas: number;
  alertas_medias: number;
  acciones_sin_alerta_critica: number;
  acciones_sin_datos_ejecucion: number;
  nota_trazabilidad: string;
};

type OfertaResumen = {
  acciones_total: number;
  acciones_af: number;
  acciones_cp: number;
  pendientes_ejecutar: number;
  en_ejecucion: number;
  en_ejecucion_con_incidencia: number;
  finalizadas_total: number;
  finalizadas_pendiente_justificacion: number;
  riesgo_reintegro: number;
  importe_concedido_total: number;
  importe_en_riesgo_total: number;
  importe_pendiente_ejecutar: number;
  incidencias_abiertas: number;
  requerimientos_pendientes: number;
  entidades_con_oferta: number;
  entidades_con_incidencias_o_riesgo: number;
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

function KpiCard({
  label,
  value,
  detail,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "blue" | "amber" | "red" | "green";
  href?: string;
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-white text-red-800 hover:border-red-400"
      : tone === "amber"
      ? "border-amber-200 bg-white text-amber-800 hover:border-amber-400"
      : tone === "green"
      ? "border-emerald-200 bg-white text-emerald-800 hover:border-emerald-400"
      : tone === "blue"
      ? "border-blue-200 bg-white text-blue-800 hover:border-blue-400"
      : "border-slate-200 bg-white text-slate-950 hover:border-blue-300";

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {href ? (
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
            abrir
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`block rounded-2xl border p-4 shadow-sm transition ${toneClass}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      {content}
    </div>
  );
}

function ModuleCard({
  title,
  description,
  status,
  href,
}: {
  title: string;
  description: string;
  status: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
      </div>
      <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-800">
        {status}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm opacity-90">
      {content}
    </div>
  );
}

export default function DashboardPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [ofertaResumen, setOfertaResumen] = useState<OfertaResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);

      const [resumenRes, ofertaRes] = await Promise.all([
        supabase.from("v_fiscalizacion_resumen").select("*").single(),
        supabase.from("v_oferta_formativa_resumen_institucional").select("*").single(),
      ]);

      const firstError = resumenRes.error || ofertaRes.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setResumen(resumenRes.data as Resumen);
      setOfertaResumen(ofertaRes.data as OfertaResumen);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-6 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Cargando dashboard institucional...</p>
        </section>
      </main>
    );
  }

  if (error || !resumen || !ofertaResumen) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-6 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error cargando dashboard institucional
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se pudo cargar la información institucional."}
          </pre>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-6 py-6 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Dashboard ejecutivo institucional</h1>
            <p className="mt-1 text-sm text-blue-100">
              {resumen.convocatoria_codigo} · {resumen.convocatoria_nombre}
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm">
            <p className="font-semibold">Resolución oficial trazada</p>
            <p className="text-xs text-blue-100">
              Concesión oficial cargada · Ejecución marcada como simulación controlada
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-5 px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/login" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            ← Volver al acceso
          </Link>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            Entorno demo institucional · KPIs clicables
          </span>
        </div>

        <section className="grid gap-3 lg:grid-cols-4">
          <KpiCard
            label="Entidades"
            value={num(resumen.entidades_beneficiarias)}
            detail="expedientes principales"
            tone="blue"
            href="/entidades"
          />
          <KpiCard
            label="Acciones concedidas"
            value={num(resumen.acciones_concedidas)}
            detail={`${num(resumen.acciones_af)} AF · ${num(resumen.acciones_cp)} CP`}
            tone="default"
            href="/oferta-formativa"
          />
          <KpiCard
            label="Importe concedido"
            value={euro(resumen.importe_total_concedido)}
            detail="cuadrado al céntimo"
            tone="green"
            href="/oferta-formativa"
          />
          <KpiCard
            label="Importe en riesgo"
            value={euro(resumen.importe_total_en_riesgo)}
            detail={`${num(resumen.alertas_altas)} alertas altas`}
            tone="red"
            href="/alertas"
          />
        </section>

        <section className="grid gap-3 lg:grid-cols-5">
          <KpiCard
            label="Pendientes de ejecutar"
            value={num(ofertaResumen.pendientes_ejecutar)}
            detail={euro(ofertaResumen.importe_pendiente_ejecutar)}
            tone="blue"
            href="/oferta-formativa?estado=pendiente_ejecutar"
          />
          <KpiCard
            label="En ejecución"
            value={num(ofertaResumen.en_ejecucion)}
            detail="sin incidencia crítica"
            tone="green"
            href="/oferta-formativa?estado=en_ejecucion"
          />
          <KpiCard
            label="Con incidencia"
            value={num(ofertaResumen.en_ejecucion_con_incidencia)}
            detail={`${num(ofertaResumen.incidencias_abiertas)} incidencias abiertas`}
            tone="amber"
            href="/oferta-formativa?estado=en_ejecucion_con_incidencia"
          />
          <KpiCard
            label="Pendientes justificar"
            value={num(ofertaResumen.finalizadas_pendiente_justificacion)}
            detail="acciones finalizadas"
            tone="default"
            href="/oferta-formativa?estado=finalizada_pendiente_justificacion"
          />
          <KpiCard
            label="Riesgo reintegro"
            value={num(ofertaResumen.riesgo_reintegro)}
            detail={`${num(ofertaResumen.requerimientos_pendientes)} requerimientos pendientes`}
            tone="red"
            href="/alertas"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Lectura ejecutiva</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              La demo parte de una resolución oficial cargada y validada. Cada entidad beneficiaria
              se interpreta como expediente principal y cada AF/CP concedida como subexpediente
              fiscalizable. El dashboard detecta volumen, estados operativos, incidencias,
              requerimientos y riesgo para orientar la revisión administrativa.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Alumnos inicio</p>
                <p className="mt-1 text-lg font-semibold">{num(resumen.alumnos_inicio)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Alumnos activos</p>
                <p className="mt-1 text-lg font-semibold">{num(resumen.alumnos_activos)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Bajas</p>
                <p className="mt-1 text-lg font-semibold">{num(resumen.bajas)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Módulos de fiscalización</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Se activan uno a uno para evitar enlaces vacíos y mantener navegación defendible.
            </p>

            <div className="mt-4 space-y-3">
              <ModuleCard
                title="Oferta formativa concedida"
                description="Mesa operativa de todas las AF/CP concedidas, con estado, importe, entidad, incidencias y riesgo."
                status="activo"
                href="/oferta-formativa"
              />
              <ModuleCard
                title="Entidades beneficiarias"
                description="Expedientes principales por entidad, con resumen de acciones, riesgos, incidencias y requerimientos."
                status="activo"
                href="/entidades"
              />
              <ModuleCard
                title="Alertas e incidencias"
                description="Bandeja transversal para priorizar riesgos, incidencias abiertas y posibles reintegros."
                status="activo"
                href="/alertas"
              />
              <ModuleCard
                title="Justificación económica"
                description="Control del dinero concedido, ejecutado, justificado, pendiente y en riesgo para toma de decisiones."
                status="activo"
                href="/justificacion-economica"
              />
              <ModuleCard
                title="Datos operativos"
                description="Actuaciones emitidas, comunicaciones/canal, trazabilidad técnica y auditoría de intervención."
                status="activo"
                href="/actuaciones-emitidas"
              />
            </div>
          </div>
        </section>

        <footer className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-800">Trazabilidad</p>
          <p className="mt-1">{resumen.nota_trazabilidad}</p>
        </footer>
      </section>
    </main>
  );
}









