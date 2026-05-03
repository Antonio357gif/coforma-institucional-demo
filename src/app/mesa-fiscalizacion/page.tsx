"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type Decision = {
  decision_recomendada: string;
  prioridad_operativa: string;
  acciones: number;
  acciones_af: number;
  acciones_cp: number;
  entidades_afectadas: number;
  importe_concedido: number;
  importe_ejecutado: number;
  importe_en_riesgo: number;
  alumnos_inicio: number;
  alumnos_activos: number;
  bajas: number;
  media_porcentaje_alumnos_activos: number | null;
  media_porcentaje_bajas: number | null;
  media_porcentaje_importe_en_riesgo: number | null;
};

type Entidad = {
  entidad_id: number;
  entidad_nombre: string;
  cif: string;
  entidad_isla: string | null;
  entidad_municipio: string | null;
  acciones_concedidas: number;
  acciones_af: number;
  acciones_cp: number;
  importe_concedido: number;
  importe_ejecutado: number;
  importe_en_riesgo: number;
  porcentaje_importe_en_riesgo: number;
  alumnos_inicio: number;
  alumnos_activos: number;
  porcentaje_alumnos_activos: number | null;
  bajas: number;
  porcentaje_bajas: number | null;
  alertas_altas: number;
  alertas_medias: number;
  nivel_riesgo_global: string;
  acciones_revision_prioritaria: number;
  acciones_seguimiento_preventivo: number;
  decision_principal: string;
  prioridad_principal: string;
  resumen_operativo: string;
};

type Accion = {
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
  porcentaje_importe_en_riesgo: number;
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
};

type Trazabilidad = Accion & {
  evidencia_a_revisar: string;
  lectura_institucional: string;
  recomendacion_institucional: string;
  estado_trazabilidad_resolucion: string;
  estado_trazabilidad_ejecucion: string;
  regla_alerta_aplicada: string | null;
  fuente_resolucion: string | null;
  fuente_ejecucion: string | null;
};

type PriorityFilter = "todas" | "alta" | "media" | "baja" | "normal";

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

function pct(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(
    Number(value)
  )} %`;
}

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePriority(value: string | null | undefined) {
  const current = normalize(value);

  if (current.includes("alta") || current === "alto") return "alta";
  if (current.includes("media") || current === "medio") return "media";
  if (current.includes("baja") || current === "bajo") return "baja";

  if (
    current.includes("normal") ||
    current.includes("ordinario") ||
    current.includes("control ordinario") ||
    current.includes("seguimiento ordinario") ||
    current.includes("inicio")
  ) {
    return "normal";
  }

  return current || "normal";
}

function priorityLabel(priority: string | null | undefined) {
  const value = normalizePriority(priority);

  if (value === "alta") return "alta";
  if (value === "media") return "media";
  if (value === "baja") return "baja";
  return "normal";
}

function priorityClass(priority: string | null | undefined) {
  const value = normalizePriority(priority);

  if (value === "alta") return "border-red-200 bg-red-50 text-red-800";
  if (value === "media") return "border-amber-200 bg-amber-50 text-amber-800";
  if (value === "baja") return "border-emerald-200 bg-emerald-50 text-emerald-800";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function riskClass(risk: string | null | undefined) {
  const value = normalize(risk);

  if (value === "alto" || value === "alta") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (value === "medio" || value === "media") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (value === "bajo" || value === "baja") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function subexpedienteHref(ofertaId: number | null | undefined) {
  return ofertaId ? `/subexpedientes-accion/${ofertaId}` : "/oferta-formativa";
}

function emitirActuacionHref(ofertaId: number | null | undefined) {
  return ofertaId ? `/acciones/nueva?ofertaId=${ofertaId}` : "/acciones";
}

function justificacionHref(ofertaId: number | null | undefined) {
  return ofertaId
    ? `/justificacion-economica?ofertaId=${ofertaId}`
    : "/justificacion-economica";
}

function decisionesHref(ofertaId: number | null | undefined) {
  return ofertaId ? `/decisiones?ofertaId=${ofertaId}` : "/decisiones";
}

function entidadContextHref(basePath: string, entidad: Entidad | null) {
  if (!entidad) return basePath;

  const params = new URLSearchParams();

  params.set("entidadId", String(entidad.entidad_id));

  if (entidad.cif) {
    params.set("cif", entidad.cif);
  }

  if (entidad.entidad_nombre) {
    params.set("entidad", entidad.entidad_nombre);
  }

  return `${basePath}?${params.toString()}`;
}

function accionPerteneceAEntidad(
  accion: Accion,
  entidadId: number | null,
  entidad: Entidad | null
) {
  if (!entidad) return false;

  const sameId = entidadId !== null && Number(accion.entidad_id) === Number(entidadId);
  const sameCif =
    normalize(accion.cif) !== "" && normalize(accion.cif) === normalize(entidad.cif);
  const sameName =
    normalize(accion.entidad_nombre) !== "" &&
    normalize(accion.entidad_nombre) === normalize(entidad.entidad_nombre);

  return sameId || sameCif || sameName;
}

async function fetchAllRows<T>(
  tableName: string,
  orderColumn: string,
  ascending = false
): Promise<{ data: T[]; error: string | null }> {
  const pageSize = 1000;
  let from = 0;
  let allRows: T[] = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order(orderColumn, { ascending })
      .range(from, to);

    if (error) {
      return { data: [], error: error.message };
    }

    const rows = (data ?? []) as T[];
    allRows = [...allRows, ...rows];

    if (rows.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return { data: allRows, error: null };
}

function KpiMini({
  label,
  value,
  detail,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  href?: string;
  tone?: "default" | "red" | "amber";
}) {
  const border =
    tone === "red"
      ? "border-red-200"
      : tone === "amber"
        ? "border-amber-200"
        : "border-slate-200";

  const color =
    tone === "red"
      ? "text-red-700"
      : tone === "amber"
        ? "text-amber-700"
        : "text-slate-950";

  const card = (
    <div className={`rounded-lg border ${border} bg-white px-3 py-2 shadow-sm`}>
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 truncate text-[15px] font-semibold leading-5 ${color}`}>
        {value}
      </p>
      <p className="truncate text-[10px] text-slate-500">{detail}</p>
    </div>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block min-w-0">
      {card}
    </Link>
  );
}

function ButtonLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      onClick={(event) => event.stopPropagation()}
      className={
        variant === "primary"
          ? "rounded-md bg-[#183B63] px-2.5 py-1.5 text-center text-[11px] font-semibold text-white hover:bg-[#122f4f]"
          : "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-center text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
      }
    >
      {children}
    </Link>
  );
}

export default function MesaFiscalizacionPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [decisiones, setDecisiones] = useState<Decision[]>([]);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [trazabilidad, setTrazabilidad] = useState<Trazabilidad[]>([]);
  const [selectedEntidadId, setSelectedEntidadId] = useState<number | null>(null);
  const [selectedOfertaId, setSelectedOfertaId] = useState<number | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("todas");
  const [entitySearch, setEntitySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      const [resumenRes, decisionesRes, entidadesRes, accionesRes, trazabilidadRes] =
        await Promise.all([
          supabase.from("v_fiscalizacion_resumen").select("*").single(),
          supabase.from("v_fiscalizacion_decisiones").select("*"),
          fetchAllRows<Entidad>(
            "v_fiscalizacion_ficha_entidad",
            "importe_en_riesgo",
            false
          ),
          fetchAllRows<Accion>(
            "v_fiscalizacion_acciones_operativas",
            "importe_en_riesgo",
            false
          ),
          fetchAllRows<Trazabilidad>(
            "v_fiscalizacion_trazabilidad_accion",
            "importe_en_riesgo",
            false
          ),
        ]);

      const firstError =
        resumenRes.error?.message ||
        decisionesRes.error?.message ||
        entidadesRes.error ||
        accionesRes.error ||
        trazabilidadRes.error;

      if (firstError) {
        setError(firstError);
        setLoading(false);
        return;
      }

      const loadedResumen = resumenRes.data as Resumen;
      const loadedDecisiones = (decisionesRes.data ?? []) as Decision[];
      const loadedEntidades = entidadesRes.data;
      const loadedAcciones = accionesRes.data;
      const loadedTrazabilidad = trazabilidadRes.data;

      setResumen(loadedResumen);
      setDecisiones(loadedDecisiones);
      setEntidades(loadedEntidades);
      setAcciones(loadedAcciones);
      setTrazabilidad(loadedTrazabilidad);

      const firstEntity = loadedEntidades[0] ?? null;

      if (firstEntity) {
        setSelectedEntidadId(firstEntity.entidad_id);

        const firstAction = loadedAcciones.find((accion) =>
          accionPerteneceAEntidad(accion, firstEntity.entidad_id, firstEntity)
        );

        setSelectedOfertaId(firstAction?.oferta_id ?? null);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const entidadesFiltradas = useMemo(() => {
    const q = normalize(entitySearch);

    if (!q) return entidades;

    return entidades.filter((entidad) => {
      const haystack = [
        entidad.entidad_nombre,
        entidad.cif,
        entidad.entidad_isla,
        entidad.entidad_municipio,
        entidad.prioridad_principal,
        entidad.nivel_riesgo_global,
      ]
        .map((value) => normalize(value))
        .join(" ");

      return haystack.includes(q);
    });
  }, [entidades, entitySearch]);

  const selectedEntidad = useMemo(
    () => entidades.find((entidad) => entidad.entidad_id === selectedEntidadId) ?? null,
    [entidades, selectedEntidadId]
  );

  const accionesEntidadTodas = useMemo(() => {
    if (!selectedEntidad) return [];

    return acciones.filter((accion) =>
      accionPerteneceAEntidad(accion, selectedEntidadId, selectedEntidad)
    );
  }, [acciones, selectedEntidad, selectedEntidadId]);

  const accionesEntidad = useMemo(() => {
    return accionesEntidadTodas.filter((accion) => {
      if (priorityFilter === "todas") return true;
      return normalizePriority(accion.prioridad_operativa) === priorityFilter;
    });
  }, [accionesEntidadTodas, priorityFilter]);

  const selectedAccion = useMemo(
    () => trazabilidad.find((accion) => accion.oferta_id === selectedOfertaId) ?? null,
    [trazabilidad, selectedOfertaId]
  );

  const resumenPrioridadesEntidad = useMemo(() => {
    return accionesEntidadTodas.reduce(
      (acc, accion) => {
        const prioridad = normalizePriority(accion.prioridad_operativa);

        if (prioridad === "alta") acc.alta += 1;
        if (prioridad === "media") acc.media += 1;
        if (prioridad === "baja") acc.baja += 1;
        if (prioridad === "normal") acc.normal += 1;

        return acc;
      },
      { alta: 0, media: 0, baja: 0, normal: 0 }
    );
  }, [accionesEntidadTodas]);

  function selectEntidad(entidadId: number) {
    const entidad = entidades.find((item) => item.entidad_id === entidadId) ?? null;

    setSelectedEntidadId(entidadId);
    setPriorityFilter("todas");

    if (!entidad) {
      setSelectedOfertaId(null);
      return;
    }

    const firstAction = acciones.find((accion) =>
      accionPerteneceAEntidad(accion, entidadId, entidad)
    );

    setSelectedOfertaId(firstAction?.oferta_id ?? null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">
            Cargando mesa de fiscalización institucional...
          </p>
        </section>
      </main>
    );
  }

  if (error || !resumen) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error conectando con Supabase
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se pudo cargar el resumen institucional."}
          </pre>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-0.5 text-xl font-semibold">Mesa de fiscalización FPED 2025</h1>
            <p className="truncate text-xs text-blue-100">
              {resumen.convocatoria_codigo} · {resumen.convocatoria_nombre}
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            Resolución oficial · ejecución trazada · actuación administrativa
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Dashboard
            </Link>
            <Link href="/oferta-formativa" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Oferta
            </Link>
            <Link href="/alertas" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Alertas
            </Link>
            <Link href="/acciones" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Acciones
            </Link>
            <Link href="/actuaciones-emitidas" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Emitidas
            </Link>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            Entidad → acción → decisión
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <KpiMini
            label="Entidades"
            value={num(resumen.entidades_beneficiarias)}
            detail="beneficiarias"
            href="/entidades"
          />
          <KpiMini
            label="Acciones"
            value={num(resumen.acciones_concedidas)}
            detail={`${num(resumen.acciones_af)} AF · ${num(resumen.acciones_cp)} CP`}
            href="/oferta-formativa"
          />
          <KpiMini
            label="Concedido"
            value={euro(resumen.importe_total_concedido)}
            detail="resolución cargada"
            href="/oferta-formativa"
          />
          <KpiMini
            label="Ejecutado"
            value={euro(resumen.importe_total_ejecutado)}
            detail="ejecución trazada"
            href="/justificacion-economica"
          />
          <KpiMini
            label="Riesgo"
            value={euro(resumen.importe_total_en_riesgo)}
            detail={`${num(resumen.alertas_altas)} alertas altas`}
            href="/acciones"
            tone="red"
          />
          <KpiMini
            label="Seguimiento"
            value={num(resumen.alertas_medias)}
            detail="incidencias medias"
            href="/alertas"
            tone="amber"
          />
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.82fr_0.86fr_1.32fr]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-3 py-2">
              <h2 className="text-sm font-semibold">Entidades beneficiarias</h2>
              <p className="text-[11px] text-slate-500">
                {num(entidadesFiltradas.length)} de {num(entidades.length)} entidades · revisión institucional
              </p>
              <input
                value={entitySearch}
                onChange={(event) => setEntitySearch(event.target.value)}
                placeholder="Buscar entidad, CIF, isla..."
                className="mt-2 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div className="max-h-[430px] overflow-y-auto overflow-x-hidden">
              {entidadesFiltradas.map((entidad) => (
                <button
                  key={entidad.entidad_id}
                  type="button"
                  onClick={() => selectEntidad(entidad.entidad_id)}
                  className={`w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-blue-50 ${
                    selectedEntidadId === entidad.entidad_id ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-slate-950">
                        {entidad.entidad_nombre}
                      </p>
                      <p className="text-[10px] text-slate-500">{entidad.cif}</p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskClass(
                        entidad.nivel_riesgo_global
                      )}`}
                    >
                      {entidad.nivel_riesgo_global}
                    </span>
                  </div>

                  <div className="mt-1 grid grid-cols-[50px_1fr_60px] gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-500">Acc.</span>{" "}
                      <span className="font-semibold">{num(entidad.acciones_concedidas)}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500">R. </span>
                      <span className="font-semibold text-red-700">
                        {euro(entidad.importe_en_riesgo)}
                      </span>
                    </div>
                    <div className="truncate text-right font-semibold">
                      {priorityLabel(entidad.prioridad_principal)}
                    </div>
                  </div>
                </button>
              ))}

              {entidadesFiltradas.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-slate-500">
                  No hay entidades que coincidan con la búsqueda.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Entidad activa
                </p>
                <h2 className="mt-0.5 truncate text-base font-semibold text-slate-950">
                  {selectedEntidad?.entidad_nombre ?? "—"}
                </h2>
                <p className="truncate text-[11px] text-slate-500">
                  {selectedEntidad?.cif ?? "—"} · {selectedEntidad?.entidad_isla ?? "Canarias"} ·{" "}
                  {selectedEntidad?.entidad_municipio ?? "varios municipios"}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityClass(
                  selectedEntidad?.prioridad_principal
                )}`}
              >
                {selectedEntidad ? priorityLabel(selectedEntidad.prioridad_principal) : "—"}
              </span>
            </div>

            <p className="mt-2 line-clamp-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-700">
              {selectedEntidad?.resumen_operativo ?? "Selecciona una entidad para revisar su situación."}
            </p>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500">Concedido</p>
                <p className="truncate text-xs font-semibold">
                  {euro(selectedEntidad?.importe_concedido)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500">Ejecutado</p>
                <p className="truncate text-xs font-semibold">
                  {euro(selectedEntidad?.importe_ejecutado)}
                </p>
              </div>
              <div className="rounded-lg border border-red-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500">Riesgo</p>
                <p className="truncate text-xs font-semibold text-red-700">
                  {euro(selectedEntidad?.importe_en_riesgo)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500">Alumnado</p>
                <p className="truncate text-xs font-semibold">
                  {num(selectedEntidad?.alumnos_activos)} · {pct(selectedEntidad?.porcentaje_alumnos_activos)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedEntidad ? (
                <Link
                  href={`/entidades/${selectedEntidad.entidad_id}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ficha entidad
                </Link>
              ) : null}
              <Link
                href={entidadContextHref("/acciones", selectedEntidad)}
                className="rounded-md bg-[#183B63] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#122f4f]"
              >
                Acciones
              </Link>
              <Link
                href={entidadContextHref("/alertas", selectedEntidad)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Alertas
              </Link>
              <Link
                href={entidadContextHref("/actuaciones-emitidas", selectedEntidad)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Emitidas
              </Link>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-3 py-2">
              <div>
                <h2 className="text-sm font-semibold">Acciones de la entidad</h2>
                <p className="text-[11px] text-slate-500">
                  {num(accionesEntidad.length)} visibles · alta {num(resumenPrioridadesEntidad.alta)} · media{" "}
                  {num(resumenPrioridadesEntidad.media)} · baja {num(resumenPrioridadesEntidad.baja)} · normal{" "}
                  {num(resumenPrioridadesEntidad.normal)}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(["todas", "alta", "media", "baja", "normal"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setPriorityFilter(filter)}
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                      priorityFilter === filter
                        ? "border-blue-400 bg-blue-50 text-blue-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[430px] overflow-auto">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-[105px] px-2 py-2">Acción</th>
                    <th className="px-2 py-2">Especialidad</th>
                    <th className="w-[95px] px-2 py-2 text-right">Riesgo</th>
                    <th className="w-[70px] px-2 py-2">Prior.</th>
                    <th className="w-[86px] px-2 py-2">Operar</th>
                  </tr>
                </thead>

                <tbody>
                  {accionesEntidad.map((accion) => (
                    <tr
                      key={accion.oferta_id}
                      onClick={() => setSelectedOfertaId(accion.oferta_id)}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-blue-50 ${
                        selectedOfertaId === accion.oferta_id ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-2 py-1.5 align-top">
                        <p className="font-semibold text-slate-950">{accion.codigo_accion}</p>
                        <p className="text-[10px] text-slate-500">{accion.tipo_oferta}</p>
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <p className="font-medium">{accion.codigo_especialidad}</p>
                        <p className="line-clamp-1 text-[10px] text-slate-500">{accion.denominacion}</p>
                      </td>
                      <td className="px-2 py-1.5 text-right align-top font-semibold text-red-700">
                        {euro(accion.importe_en_riesgo)}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityClass(
                            accion.prioridad_operativa
                          )}`}
                        >
                          {priorityLabel(accion.prioridad_operativa)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <div className="flex flex-col gap-1">
                          <ButtonLink href={subexpedienteHref(accion.oferta_id)} variant="primary">
                            Subexp.
                          </ButtonLink>
                          <ButtonLink href={emitirActuacionHref(accion.oferta_id)}>
                            Emitir
                          </ButtonLink>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {accionesEntidad.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-xs text-slate-500">
                        No hay acciones con la prioridad seleccionada.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Panel de decisión de la acción seleccionada
                </p>
                <h2 className="mt-0.5 truncate text-base font-semibold">
                  {selectedAccion
                    ? `${selectedAccion.codigo_accion} · ${selectedAccion.codigo_especialidad}`
                    : "Sin acción seleccionada"}
                </h2>
                <p className="line-clamp-2 text-xs text-slate-600">
                  {selectedAccion?.denominacion ?? "Selecciona una acción para revisar trazabilidad."}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${priorityClass(
                  selectedAccion?.prioridad_operativa
                )}`}
              >
                {selectedAccion ? priorityLabel(selectedAccion.prioridad_operativa) : "normal"}
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500">Concedido</p>
                <p className="truncate text-xs font-semibold">{euro(selectedAccion?.importe_concedido)}</p>
              </div>
              <div className="rounded-lg border border-red-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500">Riesgo</p>
                <p className="truncate text-xs font-semibold text-red-700">
                  {euro(selectedAccion?.importe_en_riesgo)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500">Bajas</p>
                <p className="truncate text-xs font-semibold">
                  {num(selectedAccion?.bajas)} · {pct(selectedAccion?.porcentaje_bajas)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500">Estado</p>
                <p className="truncate text-xs font-semibold">{selectedAccion?.estado_ejecucion ?? "—"}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  Decisión recomendada
                </p>
                <p className="mt-1 line-clamp-4 text-xs leading-5 text-slate-700">
                  {selectedAccion?.decision_recomendada ?? "—"}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  Evidencia a revisar
                </p>
                <p className="mt-1 line-clamp-4 text-xs leading-5 text-slate-700">
                  {selectedAccion?.evidencia_a_revisar ?? "—"}
                </p>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-blue-900">
                <p className="text-[10px] font-semibold uppercase">Trazabilidad</p>
                <p className="mt-1 line-clamp-4 text-xs leading-5">
                  {selectedAccion?.lectura_institucional ?? "—"}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <ButtonLink href={justificacionHref(selectedAccion?.oferta_id)}>
                Justificación
              </ButtonLink>
              <ButtonLink href={decisionesHref(selectedAccion?.oferta_id)}>
                Decisiones
              </ButtonLink>
              <ButtonLink href={subexpedienteHref(selectedAccion?.oferta_id)}>
                Subexpediente
              </ButtonLink>
              <ButtonLink href={emitirActuacionHref(selectedAccion?.oferta_id)} variant="primary">
                Emitir
              </ButtonLink>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-3 py-2">
              <div>
                <h2 className="text-sm font-semibold">Carga administrativa global por decisión</h2>
                <p className="text-[11px] text-slate-500">
                  Resumen global de decisiones de toda la resolución.
                </p>
              </div>

              <Link
                href={decisionesHref(selectedAccion?.oferta_id)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver decisión seleccionada
              </Link>
            </div>

            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {decisiones.map((decision) => (
                <div
                  key={`${decision.decision_recomendada}-${decision.prioridad_operativa}`}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <p className="line-clamp-2 text-xs font-semibold text-slate-900">
                    {decision.decision_recomendada}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold leading-6">{num(decision.acciones)}</p>
                      <p className="text-[11px] text-slate-500">
                        {num(decision.entidades_afectadas)} entidades
                      </p>
                    </div>
                    <p className="text-right text-[11px] font-semibold text-red-700">
                      {euro(decision.importe_en_riesgo)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <footer className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-800">Trazabilidad general</p>
          <p className="mt-0.5">{resumen.nota_trazabilidad}</p>
        </footer>
      </section>
    </main>
  );
}