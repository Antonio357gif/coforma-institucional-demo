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

  importe_en_ejecucion_concedido: number;
  importe_finalizado_concedido: number;
  importe_pendiente_ejecutar_concedido: number;
  importe_revision_riesgo_concedido: number;
  avance_economico_en_ejecucion: number;
  importe_finalizado_ejecutado: number;

  plazas_potenciales_estimadas: number;
  bajas_estimadas: number;
  alumnado_potencial_neto_estimado: number;

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

type DocumentacionResumen = {
  documentos_total: number;
  no_recibidos: number;
  recibidos: number;
  en_revision: number;
  validados: number;
  no_aplica: number;
  riesgo_activo_alto_critico: number;
  ofertas: number;
  subexpedientes: number;
  entidades: number;
};

type Tone = "blue" | "green" | "red" | "amber" | "slate" | "violet" | "teal";

type NavChild = {
  label: string;
  href: string;
  description: string;
};

type NavArea = {
  label: string;
  icon: string;
  href: string;
  active?: boolean;
  description: string;
  children: NavChild[];
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

function RailArea({ area }: { area: NavArea }) {
  return (
    <div className="group relative">
      <Link
        href={area.href}
        title={area.label}
        aria-label={area.label}
        className={`flex h-10 w-10 items-center justify-center rounded-2xl text-[17px] font-bold transition ${
          area.active
            ? "bg-blue-600 text-white shadow-sm"
            : "text-blue-100 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden="true">{area.icon}</span>
      </Link>

      <div className="pointer-events-auto absolute left-[20px] top-1/2 z-50 hidden w-[330px] -translate-y-1/2 pl-10 group-hover:block group-focus-within:block">
        <div className="absolute left-0 top-0 h-full w-12" />
        <div className="relative w-[270px] rounded-2xl border border-slate-200 bg-white p-2 text-slate-950 shadow-2xl">
          <div className="border-b border-slate-100 px-2 py-2">
            <p className="text-[12px] font-black text-slate-950">{area.label}</p>
            <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{area.description}</p>
          </div>

          <div className="mt-1 space-y-1">
            <Link
              href={area.href}
              className="block rounded-xl bg-blue-50 px-2.5 py-2 text-[11px] font-black text-blue-800 hover:bg-blue-100"
            >
              Abrir área principal
            </Link>

            {area.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className="block rounded-xl px-2.5 py-2 hover:bg-slate-50"
              >
                <span className="block text-[11px] font-bold leading-4 text-slate-900">
                  {child.label}
                </span>
                <span className="block text-[10px] leading-4 text-slate-500">
                  {child.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
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
  const isMoneyValue = value.includes("€");

  return (
    <div className="min-w-0 border-r border-slate-200 px-1.5 py-1.5 text-center last:border-r-0">
      <p className="truncate text-[8px] font-black uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-0.5 font-black ${
          isMoneyValue
            ? "break-words text-[9px] leading-[1.08]"
            : "truncate text-[10px] leading-[1.15]"
        } ${palette.text}`}
      >
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
  const isMoneyValue = mainValue.includes("€");

  return (
    <Link
      href={href}
      className={`relative flex min-h-[218px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border ${palette.border} bg-white p-3 shadow-sm transition after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full hover:-translate-y-0.5 hover:shadow-md ${palette.bottom}`}
    >
      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <KpiIcon tone={tone}>{icon}</KpiIcon>

          <p className={`min-w-0 text-[11px] font-black uppercase leading-4 tracking-[0.07em] ${palette.text}`}>
            {title}
          </p>
        </div>

        <p
          className={`mt-2 font-black ${
            isMoneyValue ? "break-words text-[14px] leading-[1.08]" : "truncate text-[18px] leading-none"
          } ${palette.text}`}
        >
          {mainValue}
        </p>

        {subtitle ? (
          <p className="mt-1 break-words text-[11px] leading-4 text-slate-600">
            {subtitle}
          </p>
        ) : null}

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

function ControlTile({
  href,
  tone,
  label,
  value,
  helper,
}: {
  href: string;
  tone: Tone;
  label: string;
  value: string;
  helper: string;
}) {
  const palette = toneClasses(tone);

  return (
    <Link
      href={href}
      className={`group grid min-w-0 grid-cols-[22px_1fr_auto] items-center gap-2 rounded-xl border ${palette.border} bg-slate-50 px-2.5 py-1.5 transition hover:bg-blue-50 hover:shadow-sm`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg ${palette.icon}`}>
        <span className={`h-2 w-2 rounded-full ${palette.line}`} />
      </span>

      <span className="min-w-0">
        <span className="block truncate text-[11px] font-black leading-4 text-slate-800 group-hover:text-slate-950">
          {label}
        </span>
        <span className="block truncate text-[9px] leading-3 text-slate-500">
          {helper}
        </span>
      </span>

      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${palette.soft}`}>
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
          <div
            key={item.label}
            className="grid grid-cols-[96px_1fr_116px_38px] items-center gap-2 px-1.5 py-1 text-[11px]"
          >
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
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
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
  const [documentacionResumen, setDocumentacionResumen] = useState<DocumentacionResumen | null>(null);
  const [documentacionLoading, setDocumentacionLoading] = useState(false);
  const [documentacionError, setDocumentacionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      setDocumentacionError(null);
      setDocumentacionResumen(null);

      const [resumenRes, ofertaRes] = await Promise.all([
        supabase.from("v_fiscalizacion_resumen").select("*").single(),
        supabase.from("v_oferta_formativa_resumen_institucional").select("*").single(),
      ]);

      const firstError = resumenRes.error || ofertaRes.error;

      if (!activo) return;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setResumen(resumenRes.data as Resumen);
      setOfertaResumen(ofertaRes.data as OfertaResumen);
      setLoading(false);

      setDocumentacionLoading(true);

      const { data: documentacionData, error: documentacionLoadError } = await supabase
        .from("v_recepcion_documentacion_resumen")
        .select("*")
        .single();

      if (!activo) return;

      if (documentacionLoadError) {
        setDocumentacionError(documentacionLoadError.message);
        setDocumentacionResumen(null);
        setDocumentacionLoading(false);
        return;
      }

      setDocumentacionResumen(documentacionData as DocumentacionResumen);
      setDocumentacionLoading(false);
    }

    loadDashboard();

    return () => {
      activo = false;
    };
  }, []);

  const navAreas: NavArea[] = useMemo(
    () => [
      {
        label: "Dashboard",
        icon: "🏠",
        href: "/dashboard",
        active: true,
        description: "Foto madre ejecutiva de la resolución.",
        children: [
          {
            label: "Vista ejecutiva",
            href: "/dashboard",
            description: "KPIs principales, estado económico, documentación e impacto.",
          },
        ],
      },
      {
        label: "Fiscalización",
        icon: "🧭",
        href: "/mesa-fiscalizacion",
        description: "Ruta central: entidad, acción, subexpediente y decisión.",
        children: [
          {
            label: "Mesa de fiscalización",
            href: "/mesa-fiscalizacion",
            description: "Pantalla operativa de revisión institucional.",
          },
          {
            label: "Entidades beneficiarias",
            href: "/entidades",
            description: "Expedientes principales por entidad.",
          },
          {
            label: "Oferta formativa",
            href: "/oferta-formativa",
            description: "Acciones AF/CP concedidas.",
          },
        ],
      },
      {
        label: "Documentación",
        icon: "📁",
        href: "/recepcion-documentacion",
        description: "Inicio, seguimiento, finalización, justificación y cierre.",
        children: [
          {
            label: "Recepción documental",
            href: "/recepcion-documentacion",
            description: "Control documental por fases y subexpedientes.",
          },
          {
            label: "Trazabilidad técnica",
            href: "/trazabilidad-tecnica",
            description: "Evidencia técnica de carga y coherencia.",
          },
        ],
      },
      {
        label: "Económico",
        icon: "€",
        href: "/justificacion-economica",
        description: "Importes, ejecución, pendiente y justificación.",
        children: [
          {
            label: "Justificación económica",
            href: "/justificacion-economica",
            description: "Lectura económica de las acciones.",
          },
          {
            label: "Decisiones económicas",
            href: "/decisiones",
            description: "Criterios y decisión administrativa asociada.",
          },
        ],
      },
      {
        label: "Actuaciones",
        icon: "✅",
        href: "/actuaciones-emitidas",
        description: "Decisión recomendada, actuación y expediente administrativo.",
        children: [
          {
            label: "Decisiones",
            href: "/decisiones",
            description: "Carga de decisiones administrativas.",
          },
          {
            label: "Acciones",
            href: "/acciones",
            description: "Preparación de actuaciones.",
          },
          {
            label: "Actuaciones emitidas",
            href: "/actuaciones-emitidas",
            description: "Actuaciones registradas y trazadas.",
          },
        ],
      },
      {
        label: "Comunicaciones",
        icon: "📣",
        href: "/avisos-institucionales",
        description: "Avisos extraordinarios, expediente y canal de comunicación.",
        children: [
          {
            label: "Avisos institucionales",
            href: "/avisos-institucionales",
            description: "Bandeja de avisos internos extraordinarios.",
          },
          {
            label: "Nuevo aviso",
            href: "/avisos-institucionales/nuevo",
            description: "Crear aviso trazado desde origen.",
          },
          {
            label: "Comunicaciones / canal",
            href: "/comunicaciones-canal",
            description: "Estado de canal, emisión y referencia externa.",
          },
        ],
      },
      {
        label: "Auditoría",
        icon: "🧾",
        href: "/auditoria-intervencion",
        description: "Cierre defendible: auditoría, alertas y trazabilidad.",
        children: [
          {
            label: "Auditoría / intervención",
            href: "/auditoria-intervencion",
            description: "Lectura de auditoría institucional.",
          },
          {
            label: "Alertas / controles",
            href: "/alertas",
            description: "Tipologías, revisión histórica y controles.",
          },
          {
            label: "Trazabilidad técnica",
            href: "/trazabilidad-tecnica",
            description: "Trazabilidad de datos y coherencia backend.",
          },
        ],
      },
      {
        label: "Sistema demo",
        icon: "🔌",
        href: "/conexiones",
        description: "Accesos, conexiones previstas e integraciones futuras.",
        children: [
          {
            label: "Conexiones",
            href: "/conexiones",
            description: "APIs previstas, canales e integraciones.",
          },
          {
            label: "Usuarios demo",
            href: "/usuarios-demo",
            description: "Accesos nominales para la demo institucional.",
          },
          {
            label: "Login",
            href: "/login",
            description: "Entrada controlada a la demo.",
          },
        ],
      },
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

  const documentacionDisponible = documentacionResumen !== null;
  const documentacionPendiente = documentacionLoading && !documentacionResumen;
  const documentacionAviso =
    documentacionError && !documentacionResumen
      ? "Resumen documental pendiente de recarga"
      : documentacionPendiente
        ? "Cargando resumen documental..."
        : null;

  const totalAcciones = ofertaResumen.acciones_total || resumen.acciones_concedidas || 1;

  const revisionRiesgoAcciones =
    ofertaResumen.en_ejecucion_con_incidencia + ofertaResumen.riesgo_reintegro;

  const documentacionOperativaPct = documentacionDisponible
    ? pct(
        documentacionResumen.documentos_total - documentacionResumen.no_recibidos,
        documentacionResumen.documentos_total
      )
    : 0;

  const ejecucionEconomicaPct = pct(
    ofertaResumen.importe_en_ejecucion_concedido,
    ofertaResumen.importe_concedido_total
  );

  const finalizadoEconomicoPct = pct(
    ofertaResumen.importe_finalizado_concedido,
    ofertaResumen.importe_concedido_total
  );

  const pendienteEconomicoPct = pct(
    ofertaResumen.importe_pendiente_ejecutar_concedido,
    ofertaResumen.importe_concedido_total
  );

  const estadoResolucionPct = pct(
    ofertaResumen.importe_en_ejecucion_concedido + ofertaResumen.importe_finalizado_concedido,
    ofertaResumen.importe_concedido_total
  );

  const avanceEconomicoPct = pct(
    ofertaResumen.importe_ejecutado_total,
    ofertaResumen.importe_concedido_total
  );

  const impactoNetoPct = pct(
    ofertaResumen.alumnado_potencial_neto_estimado,
    ofertaResumen.plazas_potenciales_estimadas
  );

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
          <div className="flex h-[92px] w-full items-center justify-center border-b border-white/10">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-400 bg-white p-1 shadow-sm">
              <img
                src="/coforma-isotipo.png"
                alt="Coforma"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <nav className="flex flex-1 flex-col items-center gap-2 py-4">
            {navAreas.map((area) => (
              <RailArea key={area.href} area={area} />
            ))}
          </nav>

          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[11px] font-bold">
            CI
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
                Resolución oficial trazada · simulación controlada con lectura backend
              </span>
            </div>
          </header>

          <div className="space-y-3 px-5 py-3">
            {documentacionAviso ? (
              <section className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900 shadow-sm">
                {documentacionAviso}. El resto del dashboard se mantiene operativo.
              </section>
            ) : null}

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
                title="Estado económico"
                mainValue={euro(ofertaResumen.importe_concedido_total)}
                subtitle={`${ejecucionEconomicaPct}% ejec. · ${finalizadoEconomicoPct}% fin. · ${pendienteEconomicoPct}% pend.`}
                href="/justificacion-economica"
                tone="green"
                icon="€"
                percentValue={estadoResolucionPct}
                cells={[
                  { label: "En ejecución", value: euro(ofertaResumen.importe_en_ejecucion_concedido), tone: "green" },
                  { label: "Finalizado", value: euro(ofertaResumen.importe_finalizado_concedido), tone: "slate" },
                  { label: "Pendiente", value: euro(ofertaResumen.importe_pendiente_ejecutar_concedido), tone: "blue" },
                  { label: "Revisión", value: euro(ofertaResumen.importe_revision_riesgo_concedido), tone: "red" },
                ]}
              />

              <KpiCard
                title="Estado operativo"
                mainValue={num(totalAcciones)}
                subtitle=""
                href="/oferta-formativa"
                tone="amber"
                icon="☷"
                percentValue={pct(
                  ofertaResumen.en_ejecucion + ofertaResumen.finalizadas_total,
                  totalAcciones
                )}
                cells={[
                  { label: "En ejecución", value: num(ofertaResumen.en_ejecucion), tone: "green" },
                  { label: "Finalizadas", value: num(ofertaResumen.finalizadas_total), tone: "slate" },
                  { label: "Pendientes", value: num(ofertaResumen.pendientes_ejecutar), tone: "blue" },
                  { label: "Rev./Riesgo", value: num(revisionRiesgoAcciones), tone: "red" },
                ]}
              />

              <KpiCard
                title="Documentación"
                mainValue={documentacionDisponible ? num(documentacionResumen.documentos_total) : "—"}
                subtitle={
                  documentacionDisponible
                    ? `${num(documentacionResumen.no_recibidos)} sin recibir · ${num(documentacionResumen.validados)} validados`
                    : "resumen documental pendiente"
                }
                href="/recepcion-documentacion"
                tone="blue"
                icon="≡"
                percentValue={documentacionDisponible ? documentacionOperativaPct : undefined}
                cells={[
                  {
                    label: "Recibidos",
                    value: documentacionDisponible ? num(documentacionResumen.recibidos) : "—",
                    tone: "blue",
                  },
                  {
                    label: "Validados",
                    value: documentacionDisponible ? num(documentacionResumen.validados) : "—",
                    tone: "green",
                  },
                  {
                    label: "No aplica",
                    value: documentacionDisponible ? num(documentacionResumen.no_aplica) : "—",
                    tone: "slate",
                  },
                  {
                    label: "Sin recibir",
                    value: documentacionDisponible ? num(documentacionResumen.no_recibidos) : "—",
                    tone: "amber",
                  },
                ]}
              />

              <KpiCard
                title="Impacto potencial"
                mainValue={num(ofertaResumen.plazas_potenciales_estimadas)}
                subtitle={`${num(ofertaResumen.alumnado_potencial_neto_estimado)} netas estimadas tras bajas`}
                href="/oferta-formativa"
                tone="teal"
                icon="☷"
                percentValue={impactoNetoPct}
                cells={[
                  { label: "AF", value: num(ofertaResumen.acciones_af), tone: "blue" },
                  { label: "CP", value: num(ofertaResumen.acciones_cp), tone: "violet" },
                  { label: "Bajas est.", value: num(ofertaResumen.bajas_estimadas), tone: "amber" },
                  { label: "Neto", value: num(ofertaResumen.alumnado_potencial_neto_estimado), tone: "green" },
                ]}
              />
            </section>

            <section className="grid gap-3 xl:grid-cols-[0.32fr_0.68fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-slate-950">Control institucional</h2>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Sin prioridades críticas abiertas según la lectura backend actual.
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-emerald-800">
                    Operativo
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-2">
                  <ControlTile
                    href="/entidades"
                    tone="blue"
                    label="Entidades"
                    helper={`${num(resumen.entidades_beneficiarias)} benef. · ${num(ofertaResumen.entidades_con_oferta)} con oferta`}
                    value={num(ofertaResumen.entidades_con_incidencias_o_riesgo)}
                  />
                  <ControlTile
                    href="/recepcion-documentacion"
                    tone="green"
                    label="Documentación"
                    helper={
                      documentacionDisponible
                        ? `${num(documentacionResumen.validados)} validados · ${num(documentacionResumen.no_recibidos)} sin recibir`
                        : "resumen pendiente"
                    }
                    value={
                      documentacionDisponible
                        ? num(documentacionResumen.riesgo_activo_alto_critico)
                        : "—"
                    }
                  />
                  <ControlTile
                    href="/alertas"
                    tone="red"
                    label="Rev./Riesgo"
                    helper={`${num(resumen.alertas_altas)} altas · ${num(resumen.alertas_medias)} medias`}
                    value={num(revisionRiesgoAcciones)}
                  />
                  <ControlTile
                    href="/justificacion-economica"
                    tone="violet"
                    label="Justificación"
                    helper={`${euro(ofertaResumen.importe_ejecutado_total)} · ${avanceEconomicoPct}% avance`}
                    value={`${avanceEconomicoPct}%`}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <h2 className="text-sm font-black text-slate-950">Focos de fiscalización</h2>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <FocusPanel title="Reparto económico de la resolución">
                    <FocusRows
                      rows={[
                        {
                          label: "En ejecución",
                          value: ofertaResumen.importe_en_ejecucion_concedido,
                          base: ofertaResumen.importe_concedido_total,
                          tone: "green",
                          valueText: euro(ofertaResumen.importe_en_ejecucion_concedido),
                          href: "/oferta-formativa?estado=en_ejecucion",
                          title: "Ver acciones en ejecución",
                        },
                        {
                          label: "Finalizado",
                          value: ofertaResumen.importe_finalizado_concedido,
                          base: ofertaResumen.importe_concedido_total,
                          tone: "slate",
                          valueText: euro(ofertaResumen.importe_finalizado_concedido),
                          href: "/oferta-formativa?estado=finalizada",
                          title: "Ver acciones finalizadas",
                        },
                        {
                          label: "Pendiente",
                          value: ofertaResumen.importe_pendiente_ejecutar_concedido,
                          base: ofertaResumen.importe_concedido_total,
                          tone: "blue",
                          valueText: euro(ofertaResumen.importe_pendiente_ejecutar_concedido),
                          href: "/oferta-formativa?estado=pendiente_ejecutar",
                          title: "Ver acciones pendientes de ejecutar",
                        },
                        {
                          label: "Revisión",
                          value: ofertaResumen.importe_revision_riesgo_concedido,
                          base: ofertaResumen.importe_concedido_total,
                          tone: "red",
                          valueText: euro(ofertaResumen.importe_revision_riesgo_concedido),
                          href: "/alertas",
                          title: "Ver acciones sujetas a revisión o riesgo",
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
                          label: "Finalizadas",
                          value: ofertaResumen.finalizadas_total,
                          tone: "slate",
                          href: "/oferta-formativa?estado=finalizada",
                          title: "Ver acciones finalizadas",
                        },
                        {
                          label: "Pendientes",
                          value: ofertaResumen.pendientes_ejecutar,
                          tone: "blue",
                          href: "/oferta-formativa?estado=pendiente_ejecutar",
                          title: "Ver acciones pendientes de ejecutar",
                        },
                        {
                          label: "Rev./Riesgo",
                          value: revisionRiesgoAcciones,
                          tone: "red",
                          href: "/alertas",
                          title: "Ver revisión, alertas o riesgo",
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

                  <FocusPanel title="Impacto potencial estimado">
                    <div className="space-y-1.5">
                      <BarRow
                        label="Plazas"
                        value={ofertaResumen.plazas_potenciales_estimadas}
                        max={ofertaResumen.plazas_potenciales_estimadas}
                        tone="teal"
                      />
                      <BarRow
                        label="Neto"
                        value={ofertaResumen.alumnado_potencial_neto_estimado}
                        max={ofertaResumen.plazas_potenciales_estimadas}
                        tone="green"
                      />
                      <BarRow
                        label="Bajas"
                        value={ofertaResumen.bajas_estimadas}
                        max={ofertaResumen.plazas_potenciales_estimadas}
                        tone="amber"
                      />
                      <BarRow
                        label="Avance €"
                        value={Math.round(ofertaResumen.importe_ejecutado_total)}
                        max={Math.round(ofertaResumen.importe_concedido_total)}
                        tone="blue"
                      />
                    </div>
                  </FocusPanel>
                </div>

                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-600">
                  Avance económico registrado:{" "}
                  <span className="font-black text-slate-900">
                    {euro(ofertaResumen.importe_ejecutado_total)}
                  </span>{" "}
                  ({avanceEconomicoPct}% sobre lo concedido). Dato auxiliar separado del reparto
                  institucional de la resolución.
                </div>
              </div>
            </section>

            <NoteCard
              title="Nota de trazabilidad"
              text={ofertaResumen.nota_trazabilidad || resumen.nota_trazabilidad}
              href="/trazabilidad-tecnica"
            />
          </div>
        </section>
      </div>
    </main>
  );
}