"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Badge, Button, Select, Spinner } from "../components/ui";

type FaseResumen = {
  fase: string | null;
  controles_total: number | null;
  controles_validados: number | null;
  controles_recibidos: number | null;
  controles_en_revision: number | null;
  controles_subsanables: number | null;
  controles_no_recibidos: number | null;
  controles_no_aplica: number | null;
  controles_obligatorios: number | null;
  controles_condicionales: number | null;
  controles_alto_critico: number | null;
  controles_riesgo_activo: number | null;
  controles_accionables: number | null;
  controles_accionables_riesgo: number | null;
  subexpedientes_afectados: number | null;
  entidades_afectadas: number | null;
  controles_documentales_independientes: number | null;
  controles_integrados: number | null;
  controles_obligatorios_operativos: number | null;
  controles_condicionados_integrados_tecnicos: number | null;
};

type DocumentoAccionable = {
  recepcion_id: number | null;
  oferta_id: number | null;
  subexpediente_id: number | null;
  documento_normativo_id: number | null;

  entidad_id: number | null;
  entidad_nombre: string | null;
  entidad_cif: string | null;
  entidad_isla: string | null;
  entidad_municipio: string | null;

  codigo_accion: string | null;
  tipo_oferta: string | null;
  codigo_especialidad: string | null;
  denominacion: string | null;
  modalidad: string | null;

  estado_operativo_administrativo: string | null;
  documentacion_estado_subexpediente: string | null;
  estado_pago_administrativo: string | null;

  fase: string | null;
  subfase: string | null;
  nombre_documento: string | null;
  estado_documental: string | null;
  obligatoriedad: string | null;
  riesgo_actual: string | null;
  criticidad_documental: string | null;
  riesgo_activo_documental: string | null;
  riesgo_activo_label: string | null;

  condicion_aplicacion: string | null;
  actuacion_sugerida: string | null;

  fecha_limite: string | null;
  fecha_recepcion: string | null;
  fecha_revision: string | null;
  tecnico_revisor: string | null;
  requiere_subsanacion: boolean | null;
  comunicado_ente_fiscalizador: boolean | null;

  fuente_nombre: string | null;
  fuente_url: string | null;

  lectura_accionable: string | null;
  prioridad_orden: number | null;
};

type FaseConfig = {
  key: string;
  label: string;
  description: string;
};

const VERSION_DOCUMENTACION_FASES = "2026-05-24-v4-lectura-fiscalizadora-backend";

const fases: FaseConfig[] = [
  {
    key: "inicio",
    label: "Inicio",
    description: "Documentación previa o necesaria para arrancar la acción.",
  },
  {
    key: "seguimiento",
    label: "Seguimiento",
    description: "Controles documentales durante la ejecución.",
  },
  {
    key: "finalizacion",
    label: "Finalización",
    description: "Evidencias de cierre formativo, evaluación y comunicación final.",
  },
  {
    key: "justificacion",
    label: "Justificación",
    description: "Soporte documental asociado a la fase de justificación y cierre.",
  },
  {
    key: "cierre",
    label: "Cierre",
    description: "Cierre documental del subexpediente y control final.",
  },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Number(value ?? 0));
}

function clean(value: unknown, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
}

function normalize(value: unknown) {
  return clean(value, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function faseLabel(value: string | null | undefined) {
  const normalized = normalize(value);
  return fases.find((fase) => fase.key === normalized)?.label ?? clean(value);
}

function estadoLabel(value: string | null | undefined) {
  const estado = normalize(value);

  if (estado === "validado" || estado === "validada") return "Validado";
  if (estado === "recibido" || estado === "recibida") return "Recibido";
  if (estado === "en_revision") return "En revisión";
  if (estado === "no_recibido" || estado === "pendiente_aportacion") return "No recibido";
  if (estado === "subsanable") return "Subsanable";
  if (estado === "rechazado") return "Rechazado";
  if (estado === "vencido") return "Vencido";
  if (estado === "no_aplica") return "No aplica";

  return clean(value);
}

function badgeVariant(value: string | null | undefined): "primary" | "secondary" {
  const estado = normalize(value);
  if (estado === "recibido" || estado === "en_revision") return "primary";
  return "secondary";
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

function estadoPagoLabel(value: string | null | undefined) {
  if (value === "en_ejecucion_no_abonado") {
    return "En ejecución · sin devengo automático";
  }

  return clean(value).replaceAll("_", " ");
}

function lecturaFase(row: FaseResumen) {
  const fase = normalize(row.fase);
  const accionables = Number(row.controles_accionables ?? 0);
  const noAplica = Number(row.controles_no_aplica ?? 0);
  const total = Number(row.controles_total ?? 0);
  const integrados = Number(row.controles_integrados ?? 0);
  const independientes = Number(row.controles_documentales_independientes ?? 0);

  if (fase === "seguimiento" && integrados > 0) {
    return "Incluye controles integrados: no todos equivalen a documento autónomo.";
  }

  if (accionables > 0 && fase === "seguimiento") {
    return "Fase con mayor carga técnica viva.";
  }

  if (accionables > 0) {
    return "Existen controles recibidos pendientes de revisión.";
  }

  if (total > 0 && noAplica / total > 0.5) {
    return "Predomina no aplica: no es incidencia viva.";
  }

  if (independientes > 0) {
    return "Carga documental clasificada por matriz normativa.";
  }

  return "Sin carga accionable viva.";
}

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
      <p className="text-[10px] text-slate-500">{detail}</p>
    </div>
  );
}

function FaseCard({ row }: { row: FaseResumen }) {
  const fase = fases.find((item) => item.key === normalize(row.fase));

  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-black text-slate-950">
            {fase?.label ?? faseLabel(row.fase)}
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
            {fase?.description ?? "Fase documental"}
          </p>
        </div>

        <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-800">
          {num(row.controles_total)} total
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
        <div className="rounded-lg bg-blue-50 px-2 py-1 text-blue-800">
          <span className="font-black">{num(row.controles_documentales_independientes)}</span> indep.
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1 text-slate-700">
          <span className="font-black">{num(row.controles_integrados)}</span> integr.
        </div>
        <div className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-800">
          <span className="font-black">{num(row.controles_obligatorios_operativos)}</span> oblig.
        </div>
        <div className="rounded-lg bg-amber-50 px-2 py-1 text-amber-800">
          <span className="font-black">{num(row.controles_condicionados_integrados_tecnicos)}</span> cond./téc.
        </div>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-1 text-[10px]">
        <div className="rounded-lg bg-emerald-50/70 px-2 py-1 text-emerald-800">
          <span className="font-black">{num(row.controles_validados)}</span> val.
        </div>
        <div className="rounded-lg bg-blue-50/80 px-2 py-1 text-blue-800">
          <span className="font-black">{num(row.controles_recibidos)}</span> recib.
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1 text-slate-700">
          <span className="font-black">{num(row.controles_no_aplica)}</span> no aplica
        </div>
        <div className="rounded-lg bg-amber-50/80 px-2 py-1 text-amber-800">
          <span className="font-black">{num(row.controles_accionables)}</span> acc.
        </div>
      </div>

      <p className="mt-2 text-[10.5px] leading-4 text-slate-600">
        {lecturaFase(row)}
      </p>
    </article>
  );
}

function DocumentoAccionableCard({ doc }: { doc: DocumentoAccionable }) {
  const matrizHref = `/matriz-normativa-documental?fase=${normalize(doc.fase)}&control=${
    doc.documento_normativo_id ?? ""
  }`;

  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm hover:border-blue-200 hover:bg-blue-50/30">
      <div className="grid gap-2 lg:grid-cols-[1.05fr_1.35fr_0.9fr_1.15fr_0.9fr] lg:items-start">
        <section className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Entidad / acción
          </p>
          <p className="truncate text-[13px] font-black text-slate-950">
            {clean(doc.entidad_nombre)}
          </p>
          <p className="truncate text-[10.5px] text-slate-500">
            {clean(doc.entidad_cif)} · {clean(doc.codigo_accion)}
          </p>
          <p className="truncate text-[10.5px] text-slate-500">
            Subexp. {clean(doc.subexpediente_id)} · {clean(doc.tipo_oferta)} · {clean(doc.modalidad)}
          </p>
        </section>

        <section className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Fase / control documental
          </p>
          <p className="text-[13px] font-black text-slate-950">
            {faseLabel(doc.fase)}
          </p>
          <p className="line-clamp-1 text-[12px] font-semibold text-slate-800">
            {clean(doc.nombre_documento)}
          </p>
          <p className="truncate text-[10.5px] text-slate-500">
            {clean(doc.subfase)} · Control #{clean(doc.documento_normativo_id)}
          </p>
        </section>

        <section className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Estado / criterio
          </p>
          <div className="mt-0.5">
            <Badge variant={badgeVariant(doc.estado_documental)}>
              {estadoLabel(doc.estado_documental)}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-1 text-[10.5px] text-slate-600">
            Econ./control: {estadoPagoLabel(doc.estado_pago_administrativo)}
          </p>
          <p className="line-clamp-1 text-[10.5px] text-slate-500">
            {clean(doc.obligatoriedad)} · {clean(doc.riesgo_actual ?? doc.criticidad_documental)} · {clean(doc.riesgo_activo_label)}
          </p>
        </section>

        <section className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Lectura
          </p>
          <p className="line-clamp-1 text-[12px] font-black text-slate-950">
            {clean(doc.lectura_accionable)}
          </p>
          <p className="line-clamp-2 text-[10.5px] leading-4 text-slate-600">
            {clean(doc.actuacion_sugerida)}
          </p>
        </section>

        <section className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Fechas / acciones
          </p>
          <p className="truncate text-[10.5px] text-slate-600">
            Recep.: {formatDate(doc.fecha_recepcion)} · Rev.: {formatDate(doc.fecha_revision)}
          </p>
          <p className="truncate text-[10.5px] text-slate-500">
            Técnico: {clean(doc.tecnico_revisor, "Sin asignar")}
          </p>

          <div className="mt-1 flex flex-wrap gap-1">
            {doc.subexpediente_id ? (
              <Link
                href={`/mesa-documental/${doc.subexpediente_id}`}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-800 hover:bg-emerald-100"
              >
                Mesa
              </Link>
            ) : null}

            <Link
              href={matrizHref}
              className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-800 hover:bg-blue-100"
            >
              Matriz
            </Link>

            <Link
              href="/trazabilidad-tecnica"
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-700 hover:bg-slate-50"
            >
              Traz.
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}

export default function DocumentacionFasesPage() {
  const [resumen, setResumen] = useState<FaseResumen[]>([]);
  const [accionables, setAccionables] = useState<DocumentoAccionable[]>([]);

  const [loadingResumen, setLoadingResumen] = useState(true);
  const [loadingAccionables, setLoadingAccionables] = useState(true);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);
  const [errorAccionables, setErrorAccionables] = useState<string | null>(null);

  const [filtroFase, setFiltroFase] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAccionablesFiltrados, setTotalAccionablesFiltrados] = useState(0);

  const loadResumen = useCallback(async () => {
    setLoadingResumen(true);
    setErrorResumen(null);

    const { data, error } = await supabase
      .from("v_documentacion_fases_resumen")
      .select("*")
      .order("fase", { ascending: true });

    if (error) {
      setResumen([]);
      setErrorResumen(error.message);
      setLoadingResumen(false);
      return;
    }

    const ordered = ((data ?? []) as FaseResumen[]).sort((a, b) => {
      const indexA = fases.findIndex((fase) => fase.key === normalize(a.fase));
      const indexB = fases.findIndex((fase) => fase.key === normalize(b.fase));

      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    setResumen(ordered);
    setLoadingResumen(false);
  }, []);

  const loadAccionables = useCallback(async () => {
    setLoadingAccionables(true);
    setErrorAccionables(null);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("v_documentacion_fases_accionables")
      .select("*", { count: "exact" });

    if (filtroFase !== "todas") {
      query = query.eq("fase", filtroFase);
    }

    if (filtroEstado !== "todos") {
      query = query.eq("estado_documental", filtroEstado);
    }

    if (filtroTipo !== "todos") {
      query = query.eq("tipo_oferta", filtroTipo);
    }

    const term = busqueda.trim();

    if (term !== "") {
      const pattern = `%${term}%`;

      query = query.or(
        [
          `entidad_nombre.ilike.${pattern}`,
          `entidad_cif.ilike.${pattern}`,
          `codigo_accion.ilike.${pattern}`,
          `codigo_especialidad.ilike.${pattern}`,
          `denominacion.ilike.${pattern}`,
          `nombre_documento.ilike.${pattern}`,
          `subfase.ilike.${pattern}`,
        ].join(",")
      );
    }

    const { data, error, count } = await query
      .order("prioridad_orden", { ascending: true })
      .order("fase", { ascending: true })
      .order("subexpediente_id", { ascending: true })
      .order("documento_normativo_id", { ascending: true })
      .range(from, to);

    if (error) {
      setAccionables([]);
      setTotalAccionablesFiltrados(0);
      setErrorAccionables(error.message);
      setLoadingAccionables(false);
      return;
    }

    setAccionables((data ?? []) as DocumentoAccionable[]);
    setTotalAccionablesFiltrados(count ?? 0);
    setLoadingAccionables(false);
  }, [busqueda, currentPage, filtroEstado, filtroFase, filtroTipo, pageSize]);

  useEffect(() => {
    loadResumen();
  }, [loadResumen]);

  useEffect(() => {
    loadAccionables();
  }, [loadAccionables]);

  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, filtroFase, filtroEstado, filtroTipo, pageSize]);

  const totalControles = useMemo(
    () => resumen.reduce((acc, row) => acc + Number(row.controles_total ?? 0), 0),
    [resumen]
  );

  const totalDocumentalesIndependientes = useMemo(
    () =>
      resumen.reduce(
        (acc, row) => acc + Number(row.controles_documentales_independientes ?? 0),
        0
      ),
    [resumen]
  );

  const totalIntegrados = useMemo(
    () => resumen.reduce((acc, row) => acc + Number(row.controles_integrados ?? 0), 0),
    [resumen]
  );

  const totalObligatoriosOperativos = useMemo(
    () =>
      resumen.reduce(
        (acc, row) => acc + Number(row.controles_obligatorios_operativos ?? 0),
        0
      ),
    [resumen]
  );

  const totalCondicionadosIntegradosTecnicos = useMemo(
    () =>
      resumen.reduce(
        (acc, row) => acc + Number(row.controles_condicionados_integrados_tecnicos ?? 0),
        0
      ),
    [resumen]
  );

  const totalAccionables = useMemo(
    () => resumen.reduce((acc, row) => acc + Number(row.controles_accionables ?? 0), 0),
    [resumen]
  );

  const totalRiesgoActivo = useMemo(
    () => resumen.reduce((acc, row) => acc + Number(row.controles_riesgo_activo ?? 0), 0),
    [resumen]
  );

  const totalRecibidos = useMemo(
    () => resumen.reduce((acc, row) => acc + Number(row.controles_recibidos ?? 0), 0),
    [resumen]
  );

  const totalPages = Math.max(1, Math.ceil(totalAccionablesFiltrados / pageSize));

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroFase("todas");
    setFiltroEstado("todos");
    setFiltroTipo("todos");
    setCurrentPage(1);
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold">
              Documentación por fases
            </h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Lectura fiscalizadora real de controles documentales por fase: unidades independientes, controles integrados, obligaciones operativas y derivación técnica.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-blue-50">
            Fuentes: v_documentacion_fases_resumen · v_documentacion_fases_accionables
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              ← Volver al dashboard
            </Link>

            <Link
              href="/recepcion-documentacion"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Recepción documental
            </Link>

            <Link
              href="/matriz-normativa-documental"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            >
              Matriz normativa
            </Link>

            <Link
              href="/trazabilidad-tecnica"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Trazabilidad técnica
            </Link>
          </div>

          <Button
            onClick={() => {
              loadResumen();
              loadAccionables();
            }}
          >
            Recargar lectura
          </Button>
        </div>

        {errorResumen || errorAccionables ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 shadow-sm">
            {errorResumen ? <p>Resumen: {errorResumen}</p> : null}
            {errorAccionables ? <p>Accionables: {errorAccionables}</p> : null}
          </section>
        ) : null}

        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] leading-5 text-emerald-950 shadow-sm">
          <span className="font-black">Lectura institucional:</span> el backend distingue universo de controles
          fiscalizadores, unidades independientes, controles integrados, obligaciones operativas y
controles condicionales o técnicos. No todo control equivale
a un documento autónomo ni todo
control aplica en todas las fases.
        </section>

        <section className="grid gap-2 md:grid-cols-2 lg:grid-cols-7">
          <KpiCard
            label="Universo fiscalizador"
            value={loadingResumen ? "…" : num(totalControles)}
            detail="controles documentales"
          />

          <KpiCard
            label="Unidades independientes"
            value={loadingResumen ? "…" : num(totalDocumentalesIndependientes)}
            detail="documentos o controles propios"
          />

          <KpiCard
            label="Controles integrados"
            value={loadingResumen ? "…" : num(totalIntegrados)}
            detail="integrados en otros controles"
          />

          <KpiCard
            label="Obligaciones operativas"
            value={loadingResumen ? "…" : num(totalObligatoriosOperativos)}
            detail="según matriz normativa"
          />

          <KpiCard
            label="Condicionales / técnicos"
            value={loadingResumen ? "…" : num(totalCondicionadosIntegradosTecnicos)}
            detail="dependen de fase o incidencia"
          />

          <KpiCard
            label="Recibidos pendientes"
            value={loadingResumen ? "…" : num(totalRecibidos)}
            detail="aportados para revisión"
          />

          <KpiCard
            label="Riesgo activo"
            value={loadingResumen ? "…" : num(totalRiesgoActivo)}
            detail="alto/crítico vivo"
          />
        </section>

        <section className="grid gap-2 lg:grid-cols-5">
          {loadingResumen ? (
            <div className="col-span-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
              <Spinner />
              Cargando resumen por fases...
            </div>
          ) : null}

          {!loadingResumen
            ? resumen.map((faseRow) => (
                <FaseCard key={clean(faseRow.fase)} row={faseRow} />
              ))
            : null}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, acción, especialidad, control, subfase..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Fase
              </label>
              <Select value={filtroFase} onValueChange={setFiltroFase}>
                <option value="todas">Todas</option>
                {fases.map((fase) => (
                  <option key={fase.key} value={fase.key}>
                    {fase.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <option value="todos">Todos</option>
                <option value="recibido">Recibido</option>
                <option value="en_revision">En revisión</option>
                <option value="subsanable">Subsanable</option>
                <option value="rechazado">Rechazado</option>
                <option value="vencido">Vencido</option>
                <option value="no_recibido">No recibido</option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Tipo
              </label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <option value="todos">Todos</option>
                <option value="AF">AF</option>
                <option value="CP">CP</option>
              </Select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
            <div>
              <h2 className="text-sm font-black text-slate-950">
                Controles accionables por fase
              </h2>
              <p className="text-[10.5px] leading-4 text-slate-500">
                Resultado filtrado: {num(totalAccionablesFiltrados)} controles. Vista de priorización y derivación técnica.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} filas
                  </option>
                ))}
              </Select>

              <button
                type="button"
                disabled={currentPage <= 1 || loadingAccionables}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <span className="text-[11px] font-semibold text-slate-500">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages || loadingAccionables}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

          {loadingAccionables ? (
            <div className="flex items-center gap-3 px-4 py-4 text-sm text-slate-600">
              <Spinner />
              Cargando controles accionables...
            </div>
          ) : null}

          {!loadingAccionables && accionables.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">
              No hay controles accionables con los filtros actuales.
            </div>
          ) : null}

          {!loadingAccionables && accionables.length > 0 ? (
            <div className="space-y-1.5 bg-slate-50 px-3 py-2">
              {accionables.map((doc) => (
                <DocumentoAccionableCard
                  key={`${doc.recepcion_id ?? "sin-rec"}-${doc.subexpediente_id ?? "sin-sub"}-${doc.documento_normativo_id ?? "sin-doc"}`}
                  doc={doc}
                />
              ))}
            </div>
          ) : null}
        </section>
      </section>

      <span className="hidden">{VERSION_DOCUMENTACION_FASES}</span>
    </main>
  );
}