"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabaseClient";

type Resumen = {
  convocatoria_codigo: string;
  convocatoria_nombre: string;
  entidades_beneficiarias: number;
  acciones_concedidas: number;
  acciones_af: number;
  acciones_cp: number;
  importe_total_concedido: number;
  importe_total_ejecutado: number;
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
  importe_ejecutado_total: number;
  importe_en_riesgo_total: number;
  importe_finalizado_potencial_cobro: number;
  importe_pendiente_justificacion: number;
  importe_sujeto_revision: number;
  importe_pendiente_ejecutar: number;
  alumnos_previstos: number;
  alumnos_inicio: number;
  alumnos_activos: number;
  bajas: number;
  aptos: number;
  no_aptos: number;
  incidencias_abiertas: number;
  requerimientos_pendientes: number;
  entidades_con_oferta: number;
  entidades_con_incidencias_o_riesgo: number;
  nota_trazabilidad: string;
};

type Tone = "blue" | "green" | "red" | "amber" | "slate" | "violet" | "teal";

type Modulo = {
  label: string;
  short: string;
  href: string;
  active?: boolean;
};

function euro(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function euroShort(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);
  const absValue = Math.abs(safeValue);

  if (absValue >= 1_000_000) {
    return `${(safeValue / 1_000_000).toLocaleString("es-ES", {
      maximumFractionDigits: 1,
    })} M€`;
  }

  if (absValue >= 1_000) {
    return `${Math.round(safeValue / 1_000).toLocaleString("es-ES")} mil €`;
  }

  return euro(safeValue);
}

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(value ?? 0);
}

function pct(part: number | null | undefined, total: number | null | undefined) {
  const safePart = Number(part ?? 0);
  const safeTotal = Number(total ?? 0);
  if (!safeTotal || safeTotal <= 0) return 0;
  return Math.round((safePart / safeTotal) * 100);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function toneClasses(tone: Tone) {
  if (tone === "green") {
    return {
      text: "text-emerald-800",
      border: "border-emerald-200",
      line: "bg-emerald-600",
      soft: "bg-emerald-50 text-emerald-800",
      chip: "border-emerald-100 bg-emerald-50 text-emerald-800",
      icon: "bg-emerald-100 text-emerald-800",
      bottom: "after:bg-emerald-600",
    };
  }

  if (tone === "red") {
    return {
      text: "text-red-800",
      border: "border-red-200",
      line: "bg-red-600",
      soft: "bg-red-50 text-red-800",
      chip: "border-red-100 bg-red-50 text-red-800",
      icon: "bg-red-100 text-red-800",
      bottom: "after:bg-red-600",
    };
  }

  if (tone === "amber") {
    return {
      text: "text-amber-800",
      border: "border-amber-200",
      line: "bg-amber-500",
      soft: "bg-amber-50 text-amber-800",
      chip: "border-amber-100 bg-amber-50 text-amber-800",
      icon: "bg-amber-100 text-amber-800",
      bottom: "after:bg-amber-500",
    };
  }

  if (tone === "violet") {
    return {
      text: "text-violet-800",
      border: "border-violet-200",
      line: "bg-violet-600",
      soft: "bg-violet-50 text-violet-800",
      chip: "border-violet-100 bg-violet-50 text-violet-800",
      icon: "bg-violet-100 text-violet-800",
      bottom: "after:bg-violet-600",
    };
  }

  if (tone === "teal") {
    return {
      text: "text-teal-800",
      border: "border-teal-200",
      line: "bg-teal-600",
      soft: "bg-teal-50 text-teal-800",
      chip: "border-teal-100 bg-teal-50 text-teal-800",
      icon: "bg-teal-100 text-teal-800",
      bottom: "after:bg-teal-600",
    };
  }

  if (tone === "slate") {
    return {
      text: "text-slate-900",
      border: "border-slate-200",
      line: "bg-slate-700",
      soft: "bg-slate-50 text-slate-700",
      chip: "border-slate-200 bg-slate-50 text-slate-700",
      icon: "bg-slate-100 text-slate-700",
      bottom: "after:bg-slate-700",
    };
  }

  return {
    text: "text-blue-800",
    border: "border-blue-200",
    line: "bg-blue-600",
    soft: "bg-blue-50 text-blue-800",
    chip: "border-blue-100 bg-blue-50 text-blue-800",
    icon: "bg-blue-100 text-blue-800",
    bottom: "after:bg-blue-600",
  };
}

function RailItem({ modulo }: { modulo: Modulo }) {
  return (
    <Link
      href={modulo.href}
      title={modulo.label}
      aria-label={modulo.label}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-bold transition ${
        modulo.active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-blue-100 hover:bg-white/10 hover:text-white"
      }`}
    >
      {modulo.short}
      <span className="pointer-events-none absolute left-[46px] top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover:block">
        {modulo.label}
      </span>
    </Link>
  );
}

function KpiIcon({ tone, children }: { tone: Tone; children: ReactNode }) {
  const palette = toneClasses(tone);

  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${palette.icon}`}>
      <span className="text-[15px] font-black leading-none">{children}</span>
    </span>
  );
}

function KpiCell({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  const palette = toneClasses(tone);

  return (
    <div className="min-w-0 border-r border-slate-200 px-1.5 py-1.5 text-center last:border-r-0">
      <p className="truncate text-[8px] font-black uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 truncate text-[11px] font-black leading-none ${palette.text}`}>
        {value}
      </p>
    </div>
  );
}

function KpiCard({
  title,
  mainValue,
  subtitle,
  href,
  tone,
  icon,
  percentValue,
  cells,
}: {
  title: string;
  mainValue: string;
  subtitle: string;
  href: string;
  tone: Tone;
  icon: ReactNode;
  percentValue?: number;
  cells: Array<{ label: string; value: string; tone?: Tone }>;
}) {
  const palette = toneClasses(tone);
  const progress = typeof percentValue === "number" ? clamp(percentValue) : null;

  return (
    <Link
      href={href}
      className={`relative flex h-[196px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border ${palette.border} bg-white p-3 shadow-sm transition after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full hover:-translate-y-0.5 hover:shadow-md ${palette.bottom}`}
    >
      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <KpiIcon tone={tone}>{icon}</KpiIcon>

          <p className={`min-w-0 text-[11px] font-black uppercase leading-4 tracking-[0.07em] ${palette.text}`}>
            {title}
          </p>
        </div>

        <p className={`mt-2 truncate text-[22px] font-black leading-none ${palette.text}`}>
          {mainValue}
        </p>
        <p className="mt-1 truncate text-[11px] text-slate-600">{subtitle}</p>

        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${palette.line}`}
              style={{ width: `${progress ?? 100}%` }}
            />
          </div>
          {progress !== null ? (
            <span className="text-[10px] font-black text-slate-500">{progress}%</span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="grid grid-cols-2 border-b border-slate-200">
          {cells.slice(0, 2).map((cell) => (
            <KpiCell key={cell.label} {...cell} />
          ))}
        </div>
        <div className="grid grid-cols-2">
          {cells.slice(2, 4).map((cell) => (
            <KpiCell key={cell.label} {...cell} />
          ))}
        </div>
      </div>
    </Link>
  );
}

function PriorityRow({
  href,
  tone,
  label,
  value,
}: {
  href: string;
  tone: Tone;
  label: string;
  value: string;
}) {
  const palette = toneClasses(tone);

  return (
    <Link
      href={href}
      className="grid grid-cols-[28px_1fr_50px] items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2 text-xs transition hover:bg-blue-50"
    >
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${palette.icon}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${palette.line}`} />
      </span>
      <span className="truncate font-semibold text-slate-800">{label}</span>
      <span className={`rounded-lg px-2 py-1 text-center text-[11px] font-bold ${palette.soft}`}>
        {value}
      </span>
    </Link>
  );
}

function BarRow({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: Tone;
}) {
  const palette = toneClasses(tone);
  const width = max > 0 ? clamp((value / max) * 100) : 0;

  return (
    <div className="grid grid-cols-[105px_1fr_38px] items-center gap-2 text-[11px]">
      <span className="truncate text-slate-600">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${palette.line}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-right font-bold text-slate-700">{num(value)}</span>
    </div>
  );
}

function FocusPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <h3 className="mb-2 text-xs font-bold text-slate-950">{title}</h3>
      {children}
    </div>
  );
}

function FocusRows({
  rows,
}: {
  rows: Array<{
    label: string;
    value: number;
    base: number;
    tone: Tone;
    valueText?: string;
    href?: string;
    title?: string;
  }>;
}) {
  return (
    <div className="space-y-1.5">
      {rows.map((item) => {
        const palette = toneClasses(item.tone);
        const percentage = pct(item.value, item.base);
        const width = clamp(percentage);
        const rowContent = (
          <>
            <span className="truncate text-slate-600 group-hover:text-slate-900">{item.label}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${palette.line}`} style={{ width: `${width}%` }} />
            </div>
            <span className="text-right font-bold text-slate-800">{item.valueText ?? num(item.value)}</span>
            <span className="text-right font-bold text-slate-500">{percentage}%</span>
          </>
        );

        if (item.href) {
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.title ?? item.label}
              className="group grid grid-cols-[96px_1fr_116px_38px] items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] transition hover:bg-blue-50"
            >
              {rowContent}
            </Link>
          );
        }

        return (
          <div key={item.label} className="grid grid-cols-[96px_1fr_116px_38px] items-center gap-2 px-1.5 py-1 text-[11px]">
            {rowContent}
          </div>
        );
      })}
    </div>
  );
}

function VerticalBars({
  items,
  base,
}: {
  items: Array<{
    label: string;
    value: number;
    tone: Tone;
    href: string;
    title?: string;
  }>;
  base: number;
}) {
  const safeBase = base > 0 ? base : 1;
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map((item) => {
        const palette = toneClasses(item.tone);
        const percentage = pct(item.value, safeBase);
        const height = Math.max(8, clamp((item.value / maxValue) * 100));

        return (
          <Link
            key={item.label}
            href={item.href}
            title={item.title ?? item.label}
            className="group flex min-w-0 flex-col rounded-xl border border-slate-100 bg-slate-50 px-2 py-2 text-center transition hover:border-blue-200 hover:bg-blue-50"
          >
            <div className="flex h-[86px] items-end justify-center rounded-lg bg-white px-1 py-1.5">
              <div
                className={`w-full max-w-[30px] rounded-t-md ${palette.line} transition group-hover:opacity-90`}
                style={{ height: `${height}%` }}
              />
            </div>
            <p className="mt-1.5 truncate text-[10px] font-semibold text-slate-700">{item.label}</p>
            <p className="mt-0.5 text-[12px] font-black leading-none text-slate-950">{num(item.value)}</p>
            <p className={`mt-0.5 text-[10px] font-black ${palette.text}`}>{percentage}%</p>
          </Link>
        );
      })}
    </div>
  );
}

function NoteCard({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <div className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          i
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-950">{title}</h2>
          <p className="truncate text-xs text-slate-600">{text}</p>
        </div>
      </div>

      <Link
        href={href}
        className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-100"
      >
        Abrir
      </Link>
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

  const modulos: Modulo[] = useMemo(
    () => [
      { label: "Dashboard", short: "DG", href: "/dashboard", active: true },
      { label: "Mesa de fiscalización", short: "MF", href: "/mesa-fiscalizacion" },
      { label: "Usuarios demo", short: "UD", href: "/usuarios-demo" },
      { label: "Oferta formativa", short: "OF", href: "/oferta-formativa" },
      { label: "Entidades", short: "EN", href: "/entidades" },
      { label: "Alertas", short: "AL", href: "/alertas" },
      { label: "Justificación económica", short: "JE", href: "/justificacion-economica" },
      { label: "Datos operativos", short: "DO", href: "/actuaciones-emitidas" },
    ],
    []
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando dashboard institucional...</p>
        </section>
      </main>
    );
  }

  if (error || !resumen || !ofertaResumen) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error cargando dashboard institucional</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se pudo cargar la información institucional."}
          </pre>
        </section>
      </main>
    );
  }

  const totalAcciones = ofertaResumen.acciones_total || resumen.acciones_concedidas || 1;
  const ejecucionEconomicaPct = pct(
    ofertaResumen.importe_ejecutado_total,
    ofertaResumen.importe_concedido_total
  );
  const riesgoImportePct = pct(
    ofertaResumen.importe_en_riesgo_total,
    ofertaResumen.importe_concedido_total
  );
  const activosPct = pct(ofertaResumen.alumnos_activos, ofertaResumen.alumnos_inicio);

  const maxCargaAdministrativa = Math.max(
    ofertaResumen.requerimientos_pendientes,
    ofertaResumen.incidencias_abiertas,
    resumen.alertas_altas,
    resumen.alertas_medias,
    1
  );

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-[72px] shrink-0 bg-[#092f55] text-white lg:flex lg:flex-col lg:items-center">
          <div className="flex h-[76px] w-full items-center justify-center border-b border-white/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-400 bg-white text-sm font-black text-[#183B63]">
              CF
            </div>
          </div>

          <nav className="flex flex-1 flex-col items-center gap-2 py-4">
            {modulos.map((modulo) => (
              <RailItem key={modulo.href} modulo={modulo} />
            ))}
          </nav>

          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[11px] font-bold">
            MP
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-[#12395f] bg-[#0d3760] px-5 py-3 text-white">
            <div className="flex min-h-[108px] flex-col justify-center gap-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">
                    Coforma Institucional
                  </p>
                  <h1 className="mt-1 text-[27px] font-black leading-none">
                    Dashboard ejecutivo institucional
                  </h1>
                  <p className="mt-2 truncate text-sm text-blue-100">
                    {resumen.convocatoria_codigo} · {resumen.convocatoria_nombre}
                  </p>
                </div>

                <Link
                  href="/login"
                  className="hidden rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/15 sm:inline-flex"
                >
                  🔒 Acceso
                </Link>
              </div>

              <span className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Resolución oficial trazada · simulación controlada
              </span>
            </div>
          </header>

          <div className="space-y-3 px-5 py-3">
            <section className="grid grid-cols-5 gap-3">
              <KpiCard
                title="Resolución concedida"
                mainValue={num(resumen.acciones_concedidas)}
                subtitle={`${euro(resumen.importe_total_concedido)} concedidos`}
                href="/oferta-formativa"
                tone="violet"
                icon="▣"
                cells={[
                  { label: "AF", value: num(resumen.acciones_af), tone: "blue" },
                  { label: "CP", value: num(resumen.acciones_cp), tone: "violet" },
                  { label: "Entidades", value: num(resumen.entidades_beneficiarias), tone: "blue" },
                  { label: "Con oferta", value: num(ofertaResumen.entidades_con_oferta), tone: "green" },
                ]}
              />

              <KpiCard
                title="Ejecución económica"
                mainValue={euro(ofertaResumen.importe_ejecutado_total)}
                subtitle={`${ejecucionEconomicaPct}% ejecutado sobre lo concedido`}
                href="/justificacion-economica"
                tone="green"
                icon="€"
                percentValue={ejecucionEconomicaPct}
                cells={[
                  { label: "Pend. ejecutar", value: euro(ofertaResumen.importe_pendiente_ejecutar), tone: "blue" },
                  { label: "Pend. justificar", value: euro(ofertaResumen.importe_pendiente_justificacion), tone: "amber" },
                  { label: "Sujeto revisión", value: euro(ofertaResumen.importe_sujeto_revision), tone: "red" },
                  { label: "Finalizado", value: euro(ofertaResumen.importe_finalizado_potencial_cobro), tone: "slate" },
                ]}
              />

              <KpiCard
                title="Riesgo y revisión"
                mainValue={euro(ofertaResumen.importe_en_riesgo_total)}
                subtitle={`${riesgoImportePct}% del importe concedido`}
                href="/alertas"
                tone="red"
                icon="!"
                percentValue={riesgoImportePct}
                cells={[
                  { label: "Incidencias", value: num(ofertaResumen.incidencias_abiertas), tone: "amber" },
                  { label: "Req.", value: num(ofertaResumen.requerimientos_pendientes), tone: "red" },
                  { label: "Reintegro", value: num(ofertaResumen.riesgo_reintegro), tone: "red" },
                  { label: "Entidades", value: num(ofertaResumen.entidades_con_incidencias_o_riesgo), tone: "blue" },
                ]}
              />

              <KpiCard
                title="Entidades beneficiarias"
                mainValue={num(resumen.entidades_beneficiarias)}
                subtitle={`${num(ofertaResumen.entidades_con_incidencias_o_riesgo)} priorizables`}
                href="/entidades"
                tone="blue"
                icon="▦"
                percentValue={pct(
                  ofertaResumen.entidades_con_incidencias_o_riesgo,
                  resumen.entidades_beneficiarias
                )}
                cells={[
                  { label: "Con oferta", value: num(ofertaResumen.entidades_con_oferta), tone: "green" },
                  { label: "Priorizables", value: num(ofertaResumen.entidades_con_incidencias_o_riesgo), tone: "red" },
                  { label: "Alertas altas", value: num(resumen.alertas_altas), tone: "red" },
                  { label: "Alertas medias", value: num(resumen.alertas_medias), tone: "amber" },
                ]}
              />

              <KpiCard
                title="Alumnado y resultados"
                mainValue={num(ofertaResumen.alumnos_activos)}
                subtitle={`${activosPct}% activos sobre inicio`}
                href="/mesa-fiscalizacion"
                tone="teal"
                icon="☷"
                percentValue={activosPct}
                cells={[
                  { label: "Inicio", value: num(ofertaResumen.alumnos_inicio), tone: "blue" },
                  { label: "Bajas", value: num(ofertaResumen.bajas), tone: "red" },
                  { label: "Aptos", value: num(ofertaResumen.aptos), tone: "green" },
                  { label: "No aptos", value: num(ofertaResumen.no_aptos), tone: "amber" },
                ]}
              />
            </section>

            <section className="grid gap-3 xl:grid-cols-[0.32fr_0.68fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <h2 className="text-sm font-black text-slate-950">Prioridades de revisión</h2>
                <div className="mt-3 space-y-2">
                  <PriorityRow
                    href="/entidades"
                    tone="blue"
                    label="Revisar entidades priorizables"
                    value={num(ofertaResumen.entidades_con_incidencias_o_riesgo)}
                  />
                  <PriorityRow
                    href="/oferta-formativa?requerimientos=1"
                    tone="red"
                    label="Atender requerimientos pendientes"
                    value={num(ofertaResumen.requerimientos_pendientes)}
                  />
                  <PriorityRow
                    href="/justificacion-economica?pendiente_justificar=1"
                    tone="amber"
                    label="Controlar acciones pendientes de justificar"
                    value={num(ofertaResumen.finalizadas_pendiente_justificacion)}
                  />
                  <PriorityRow
                    href="/trazabilidad-tecnica"
                    tone="blue"
                    label="Verificar trazabilidad técnica"
                    value={num(resumen.acciones_sin_datos_ejecucion)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <h2 className="text-sm font-black text-slate-950">Focos de fiscalización</h2>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <FocusPanel title="Ejecución económica">
                    <FocusRows
                      rows={[
                        {
                          label: "Ejecutado",
                          value: ofertaResumen.importe_ejecutado_total,
                          base: ofertaResumen.importe_concedido_total,
                          tone: "green",
                          valueText: euro(ofertaResumen.importe_ejecutado_total),
                          href: "/justificacion-economica?importe=ejecutado",
                          title: "Ver acciones con importe ejecutado",
                        },
                        {
                          label: "Pendiente",
                          value: ofertaResumen.importe_pendiente_ejecutar,
                          base: ofertaResumen.importe_concedido_total,
                          tone: "blue",
                          valueText: euro(ofertaResumen.importe_pendiente_ejecutar),
                          href: "/justificacion-economica?operativo=pendiente_ejecutar",
                          title: "Ver acciones pendientes de ejecutar",
                        },
                        {
                          label: "Justificar",
                          value: ofertaResumen.importe_pendiente_justificacion,
                          base: ofertaResumen.importe_concedido_total,
                          tone: "amber",
                          valueText: euro(ofertaResumen.importe_pendiente_justificacion),
                          href: "/justificacion-economica?operativo=finalizada_pendiente_justificacion",
                          title: "Ver acciones finalizadas pendientes de justificación",
                        },
                        {
                          label: "Revisión",
                          value: ofertaResumen.importe_sujeto_revision,
                          base: ofertaResumen.importe_concedido_total,
                          tone: "red",
                          valueText: euro(ofertaResumen.importe_sujeto_revision),
                          href: "/justificacion-economica?revision=1",
                          title: "Ver acciones sujetas a revisión",
                        },
                      ]}
                    />
                  </FocusPanel>

                  <FocusPanel title="Estado operativo">
                    <VerticalBars
                      base={totalAcciones}
                      items={[
                        {
                          label: "Ejecución",
                          value: ofertaResumen.en_ejecucion,
                          tone: "green",
                          href: "/oferta-formativa?estado=en_ejecucion",
                          title: "Ver acciones en ejecución",
                        },
                        {
                          label: "Pendiente",
                          value: ofertaResumen.pendientes_ejecutar,
                          tone: "blue",
                          href: "/oferta-formativa?estado=pendiente_ejecutar",
                          title: "Ver acciones pendientes de ejecutar",
                        },
                        {
                          label: "Incidencia",
                          value: ofertaResumen.en_ejecucion_con_incidencia,
                          tone: "amber",
                          href: "/oferta-formativa?estado=en_ejecucion_con_incidencia",
                          title: "Ver acciones en ejecución con incidencia",
                        },
                        {
                          label: "Justificar",
                          value: ofertaResumen.finalizadas_pendiente_justificacion,
                          tone: "red",
                          href: "/justificacion-economica?pendiente_justificar=1",
                          title: "Ver acciones finalizadas pendientes de justificación",
                        },
                        {
                          label: "Reintegro",
                          value: ofertaResumen.riesgo_reintegro,
                          tone: "violet",
                          href: "/oferta-formativa?estado=riesgo_reintegro",
                          title: "Ver acciones con riesgo de reintegro",
                        },
                      ]}
                    />
                  </FocusPanel>

                  <FocusPanel title="Carga administrativa">
                    <div className="space-y-1.5">
                      <BarRow
                        label="Requerimientos"
                        value={ofertaResumen.requerimientos_pendientes}
                        max={maxCargaAdministrativa}
                        tone="violet"
                      />
                      <BarRow
                        label="Incidencias"
                        value={ofertaResumen.incidencias_abiertas}
                        max={maxCargaAdministrativa}
                        tone="blue"
                      />
                      <BarRow
                        label="Alertas altas"
                        value={resumen.alertas_altas}
                        max={maxCargaAdministrativa}
                        tone="red"
                      />
                      <BarRow
                        label="Alertas medias"
                        value={resumen.alertas_medias}
                        max={maxCargaAdministrativa}
                        tone="amber"
                      />
                    </div>
                  </FocusPanel>

                  <FocusPanel title="Seguimiento de alumnado">
                    <div className="space-y-1.5">
                      <BarRow
                        label="Inicio"
                        value={ofertaResumen.alumnos_inicio}
                        max={ofertaResumen.alumnos_inicio}
                        tone="teal"
                      />
                      <BarRow
                        label="Activos"
                        value={ofertaResumen.alumnos_activos}
                        max={ofertaResumen.alumnos_inicio}
                        tone="green"
                      />
                      <BarRow
                        label="Bajas"
                        value={ofertaResumen.bajas}
                        max={ofertaResumen.alumnos_inicio}
                        tone="amber"
                      />
                      <BarRow
                        label="Aptos"
                        value={ofertaResumen.aptos}
                        max={ofertaResumen.alumnos_inicio}
                        tone="blue"
                      />
                    </div>
                  </FocusPanel>
                </div>
              </div>
            </section>

            <NoteCard
              title="Nota de trazabilidad"
              text={resumen.nota_trazabilidad}
              href="/trazabilidad-tecnica"
            />
          </div>
        </section>
      </div>
    </main>
  );
}