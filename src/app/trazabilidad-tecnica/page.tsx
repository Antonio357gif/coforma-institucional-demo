"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const VERSION_TRAZABILIDAD_TECNICA =
  "2026-05-20-v2-trazabilidad-historico-movimientos-documentales";

type FiltroRow = {
  filtro: string;
  valor: string;
  registros: number;
};

type ResumenDocumentalPersistido = {
  convocatoria_codigo: string;
  documentos_total: number;
  no_recibidos: number;
  recibidos_pendientes: number;
  validados: number;
  no_aplica: number;
  riesgo_activo_alto_critico: number;
  ofertas: number;
  subexpedientes: number;
  entidades: number;
  registros_procesados: number;
  version_regla: string;
  calculado_en: string;
};

type TrazaDocumental = {
  trazabilidad_id: number;
  oferta_id: number | null;
  subexpediente_id: number | null;

  entidad_id: number | null;
  entidad_nombre: string | null;
  cif: string | null;
  entidad_isla: string | null;
  entidad_municipio: string | null;

  codigo_accion: string | null;
  tipo_oferta: string | null;
  codigo_especialidad: string | null;
  denominacion: string | null;
  familia_profesional: string | null;
  modalidad: string | null;
  horas: number | null;
  centro_formacion: string | null;
  isla: string | null;
  municipio: string | null;

  importe_concedido: number | null;
  importe_ejecutado: number | null;
  importe_en_riesgo: number | null;

  estado_operativo: string | null;
  decision_recomendada: string | null;
  prioridad_operativa: string | null;
  fuente_resolucion: string | null;
  tipo_dato_resolucion: string | null;

  fase: string | null;
  subfase: string | null;
  nombre_documento: string | null;
  estado_documental: string | null;
  obligatoriedad: string | null;
  criticidad_documental: string | null;
  requiere_subsanacion: boolean | null;
  comunicado_ente_fiscalizador: boolean | null;

  tecnico_revisor: string | null;

  fecha_limite: string | null;
  fecha_recepcion: string | null;
  fecha_revision: string | null;
  fecha_trazabilidad: string | null;

  fuente_dato: string | null;
  tipo_dato: string | null;
  nivel_confianza: string | null;
  observaciones: string | null;

  lectura_documental: string | null;
  lectura_operativa: string | null;
};

type MovimientoDocumental = {
  movimiento_id: number;
  fecha_movimiento: string | null;
  usuario_id: string | null;
  origen: string | null;
  tipo_movimiento: string | null;
  motivo_cambio: string | null;

  recepcion_documentacion_id: number | null;
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

  estado_operativo_administrativo: string | null;
  estado_pago_administrativo: string | null;

  fase: string | null;
  subfase: string | null;
  nombre_documento: string | null;

  obligatoriedad: string | null;
  riesgo_actual: string | null;
  criticidad_documental: string | null;
  riesgo_activo_documental: string | null;
  riesgo_activo_label: string | null;
  fecha_limite: string | null;

  estado_anterior: string | null;
  estado_nuevo: string | null;
  tecnico_anterior: string | null;
  tecnico_nuevo: string | null;
  observaciones_anteriores: string | null;
  observaciones_nuevas: string | null;

  requiere_subsanacion_anterior: boolean | null;
  requiere_subsanacion_nuevo: boolean | null;
  comunicado_ente_fiscalizador_anterior: boolean | null;
  comunicado_ente_fiscalizador_nuevo: boolean | null;

  fecha_recepcion_anterior: string | null;
  fecha_recepcion_nueva: string | null;
  fecha_revision_anterior: string | null;
  fecha_revision_nueva: string | null;
  fecha_requerimiento_anterior: string | null;
  fecha_requerimiento_nueva: string | null;
  fecha_subsanacion_anterior: string | null;
  fecha_subsanacion_nueva: string | null;

  fuente_nombre: string | null;
  fuente_url: string | null;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Number(value ?? 0));
}

function euro(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function clean(value: string | number | null | undefined, fallback = "—") {
  const text = String(value ?? "").trim();
  return text === "" ? fallback : text;
}

function label(value: string | null | undefined) {
  return clean(value).replaceAll("_", " ");
}

function fecha(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function fechaCorta(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function badgeClass(value: string | null | undefined) {
  const normalizado = String(value ?? "").toLowerCase();

  if (
    normalizado.includes("critico") ||
    normalizado.includes("crítico") ||
    normalizado.includes("riesgo") ||
    normalizado.includes("reintegro")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    normalizado.includes("alto") ||
    normalizado.includes("media") ||
    normalizado.includes("medio") ||
    normalizado.includes("recibido") ||
    normalizado.includes("pendiente")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    normalizado.includes("validado") ||
    normalizado.includes("validada") ||
    normalizado.includes("finalizada") ||
    normalizado.includes("ordinario") ||
    normalizado.includes("ejecucion") ||
    normalizado.includes("ejecución")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (normalizado.includes("no_aplica") || normalizado.includes("no aplica")) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function movimientoBadgeClass(value: string | null | undefined) {
  const normalizado = String(value ?? "").toLowerCase();

  if (
    normalizado.includes("reabrir") ||
    normalizado.includes("revertir") ||
    normalizado.includes("rechazar") ||
    normalizado.includes("vencido")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    normalizado.includes("validar") ||
    normalizado.includes("registrar") ||
    normalizado.includes("recepcion")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (normalizado.includes("subsanacion") || normalizado.includes("subsanación")) {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function estadoPagoLabel(value: string | null | undefined) {
  if (value === "en_ejecucion_no_abonado") {
    return "En ejecución · pendiente de devengo";
  }

  return label(value);
}

function Kpi({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "ok" | "warn" | "risk";
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-200"
      : tone === "warn"
        ? "border-amber-200"
        : tone === "risk"
          ? "border-red-200"
          : "border-slate-200";

  return (
    <div className={`rounded-lg border ${toneClass} bg-white px-3 py-1.5 shadow-sm`}>
      <p className="truncate text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
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

function SelectFiltro({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FiltroRow[];
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
      >
        <option value="todos">{placeholder}</option>
        {options.map((option) => (
          <option key={`${label}-${option.valor}`} value={option.valor}>
            {label === "Entidad" || label === "Documento"
              ? `${option.valor} (${num(option.registros)})`
              : `${label === "Fase" || label.includes("Estado") ? option.valor.replaceAll("_", " ") : option.valor} (${num(option.registros)})`}
          </option>
        ))}
      </select>
    </div>
  );
}

function normalizeSearch(value: string) {
  return value.trim().replaceAll(",", " ").replaceAll("%", "").replaceAll("*", "");
}

export default function TrazabilidadTecnicaPage() {
  const [filtros, setFiltros] = useState<FiltroRow[]>([]);
  const [trazas, setTrazas] = useState<TrazaDocumental[]>([]);
  const [total, setTotal] = useState(0);

  const [movimientos, setMovimientos] = useState<MovimientoDocumental[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(true);
  const [movimientosError, setMovimientosError] = useState<string | null>(null);

  const [loadingFiltros, setLoadingFiltros] = useState(true);
  const [loadingTabla, setLoadingTabla] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resumenDocumental, setResumenDocumental] =
    useState<ResumenDocumentalPersistido | null>(null);
  const [loadingResumenDocumental, setLoadingResumenDocumental] = useState(true);
  const [refreshingResumenDocumental, setRefreshingResumenDocumental] = useState(false);
  const [resumenDocumentalError, setResumenDocumentalError] = useState<string | null>(null);
  const [resumenDocumentalOk, setResumenDocumentalOk] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [entidadFiltro, setEntidadFiltro] = useState("todos");
  const [tecnicoFiltro, setTecnicoFiltro] = useState("todos");
  const [faseFiltro, setFaseFiltro] = useState("todos");
  const [documentoFiltro, setDocumentoFiltro] = useState("todos");
  const [estadoOperativoFiltro, setEstadoOperativoFiltro] = useState("todos");
  const [estadoDocumentalFiltro, setEstadoDocumentalFiltro] = useState("todos");
  const [lecturaDocumentalFiltro, setLecturaDocumentalFiltro] = useState("todos");
  const [lecturaOperativaFiltro, setLecturaOperativaFiltro] = useState("todos");

  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [seleccionada, setSeleccionada] = useState<TrazaDocumental | null>(null);
  const [movimientoSeleccionado, setMovimientoSeleccionado] =
    useState<MovimientoDocumental | null>(null);

  const loadResumenDocumental = useCallback(async () => {
    setLoadingResumenDocumental(true);
    setResumenDocumentalError(null);

    const { data, error: resumenError } = await supabase
      .from("resumen_documental_institucional")
      .select(
        "convocatoria_codigo, documentos_total, no_recibidos, recibidos_pendientes, validados, no_aplica, riesgo_activo_alto_critico, ofertas, subexpedientes, entidades, registros_procesados, version_regla, calculado_en"
      )
      .order("calculado_en", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resumenError) {
      setResumenDocumental(null);
      setResumenDocumentalError(resumenError.message);
      setLoadingResumenDocumental(false);
      return;
    }

    setResumenDocumental(data as ResumenDocumentalPersistido | null);
    setLoadingResumenDocumental(false);
  }, []);

  const loadMovimientos = useCallback(async () => {
    setLoadingMovimientos(true);
    setMovimientosError(null);

    const { data, error: movimientosLoadError } = await supabase
      .from("v_movimientos_documentacion_trazabilidad")
      .select("*")
      .order("fecha_movimiento", { ascending: false, nullsFirst: false })
      .order("movimiento_id", { ascending: false })
      .limit(50);

    if (movimientosLoadError) {
      setMovimientos([]);
      setMovimientosError(movimientosLoadError.message);
      setLoadingMovimientos(false);
      return;
    }

    setMovimientos((data ?? []) as MovimientoDocumental[]);
    setLoadingMovimientos(false);
  }, []);

  async function refrescarResumenDocumental() {
    setRefreshingResumenDocumental(true);
    setResumenDocumentalError(null);
    setResumenDocumentalOk(null);

    const { data, error: rpcError } = await supabase.rpc(
      "refrescar_resumen_documental_institucional_rpc"
    );

    if (rpcError) {
      setResumenDocumentalError(rpcError.message);
      setRefreshingResumenDocumental(false);
      return;
    }

    const primeraFila = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (primeraFila) {
      setResumenDocumental(primeraFila as ResumenDocumentalPersistido);
      setResumenDocumentalOk("Resumen documental actualizado correctamente.");
    } else {
      await loadResumenDocumental();
      setResumenDocumentalOk("Refresco ejecutado. Resumen recargado desde tabla persistida.");
    }

    setRefreshingResumenDocumental(false);
  }

  useEffect(() => {
    async function loadFiltros() {
      setLoadingFiltros(true);
      setError(null);

      const { data, error: filtrosError } = await supabase
        .from("v_trazabilidad_tecnica_documental_filtros")
        .select("*")
        .order("filtro", { ascending: true })
        .order("registros", { ascending: false })
        .order("valor", { ascending: true });

      if (filtrosError) {
        setError(filtrosError.message);
        setLoadingFiltros(false);
        return;
      }

      setFiltros((data ?? []) as FiltroRow[]);
      setLoadingFiltros(false);
    }

    loadFiltros();
  }, []);

  useEffect(() => {
    loadResumenDocumental();
  }, [loadResumenDocumental]);

  useEffect(() => {
    loadMovimientos();
  }, [loadMovimientos]);

  useEffect(() => {
    async function loadTabla() {
      setLoadingTabla(true);
      setError(null);

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("v_trazabilidad_tecnica_documental")
        .select("*", { count: "exact" });

      const term = normalizeSearch(busqueda);

      if (term !== "") {
        const pattern = `%${term}%`;

        query = query.or(
          [
            `entidad_nombre.ilike.${pattern}`,
            `cif.ilike.${pattern}`,
            `codigo_accion.ilike.${pattern}`,
            `codigo_especialidad.ilike.${pattern}`,
            `denominacion.ilike.${pattern}`,
            `nombre_documento.ilike.${pattern}`,
            `tecnico_revisor.ilike.${pattern}`,
            `fase.ilike.${pattern}`,
            `estado_documental.ilike.${pattern}`,
            `estado_operativo.ilike.${pattern}`,
          ].join(",")
        );
      }

      if (entidadFiltro !== "todos") {
        query = query.eq("entidad_nombre", entidadFiltro);
      }

      if (tecnicoFiltro !== "todos") {
        query = query.eq("tecnico_revisor", tecnicoFiltro);
      }

      if (faseFiltro !== "todos") {
        query = query.eq("fase", faseFiltro);
      }

      if (documentoFiltro !== "todos") {
        query = query.eq("nombre_documento", documentoFiltro);
      }

      if (estadoOperativoFiltro !== "todos") {
        query = query.eq("estado_operativo", estadoOperativoFiltro);
      }

      if (estadoDocumentalFiltro !== "todos") {
        query = query.eq("estado_documental", estadoDocumentalFiltro);
      }

      if (lecturaDocumentalFiltro !== "todos") {
        query = query.eq("lectura_documental", lecturaDocumentalFiltro);
      }

      if (lecturaOperativaFiltro !== "todos") {
        query = query.eq("lectura_operativa", lecturaOperativaFiltro);
      }

      const { data, error: tablaError, count } = await query
        .order("fecha_trazabilidad", { ascending: false, nullsFirst: false })
        .order("trazabilidad_id", { ascending: false })
        .range(from, to);

      if (tablaError) {
        setError(tablaError.message);
        setTrazas([]);
        setTotal(0);
        setLoadingTabla(false);
        return;
      }

      setTrazas((data ?? []) as TrazaDocumental[]);
      setTotal(count ?? 0);
      setLoadingTabla(false);
    }

    loadTabla();
  }, [
    busqueda,
    entidadFiltro,
    tecnicoFiltro,
    faseFiltro,
    documentoFiltro,
    estadoOperativoFiltro,
    estadoDocumentalFiltro,
    lecturaDocumentalFiltro,
    lecturaOperativaFiltro,
    pageSize,
    currentPage,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    busqueda,
    entidadFiltro,
    tecnicoFiltro,
    faseFiltro,
    documentoFiltro,
    estadoOperativoFiltro,
    estadoDocumentalFiltro,
    lecturaDocumentalFiltro,
    lecturaOperativaFiltro,
    pageSize,
  ]);

  const opcionesEntidad = useMemo(
    () => filtros.filter((row) => row.filtro === "entidad"),
    [filtros]
  );

  const opcionesTecnico = useMemo(
    () => filtros.filter((row) => row.filtro === "tecnico_revisor"),
    [filtros]
  );

  const opcionesFase = useMemo(
    () => filtros.filter((row) => row.filtro === "fase"),
    [filtros]
  );

  const opcionesDocumento = useMemo(
    () => filtros.filter((row) => row.filtro === "documento"),
    [filtros]
  );

  const opcionesEstadoOperativo = useMemo(
    () => filtros.filter((row) => row.filtro === "estado_operativo"),
    [filtros]
  );

  const opcionesEstadoDocumental = useMemo(
    () => filtros.filter((row) => row.filtro === "estado_documental"),
    [filtros]
  );

  const opcionesLecturaDocumental = useMemo(
    () => filtros.filter((row) => row.filtro === "lectura_documental"),
    [filtros]
  );

  const opcionesLecturaOperativa = useMemo(
    () => filtros.filter((row) => row.filtro === "lectura_operativa"),
    [filtros]
  );

  const resumenGlobal = useMemo(() => {
    const controlesTrazados = filtros
      .filter((row) => row.filtro === "entidad")
      .reduce((acc, row) => acc + Number(row.registros ?? 0), 0);

    return {
      controlesTrazados,
      entidades: opcionesEntidad.length,
      documentos: opcionesDocumento.length,
      tecnicos: opcionesTecnico.length,
      fases: opcionesFase.length,
      estadosOperativos: opcionesEstadoOperativo.length,
    };
  }, [
    filtros,
    opcionesEntidad.length,
    opcionesDocumento.length,
    opcionesTecnico.length,
    opcionesFase.length,
    opcionesEstadoOperativo.length,
  ]);

  const resumenMovimientos = useMemo(() => {
    const totalMovimientos = movimientos.length;
    const desdeMesa = movimientos.filter((row) => row.origen === "mesa_documental").length;
    const cambiosEstado = movimientos.filter(
      (row) => row.estado_anterior !== row.estado_nuevo
    ).length;
    const actualizaciones = movimientos.filter(
      (row) => row.estado_anterior === row.estado_nuevo
    ).length;
    const conSubsanacion = movimientos.filter(
      (row) => row.requiere_subsanacion_nuevo
    ).length;

    return {
      totalMovimientos,
      desdeMesa,
      cambiosEstado,
      actualizaciones,
      conSubsanacion,
    };
  }, [movimientos]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  function limpiarFiltros() {
    setBusqueda("");
    setEntidadFiltro("todos");
    setTecnicoFiltro("todos");
    setFaseFiltro("todos");
    setDocumentoFiltro("todos");
    setEstadoOperativoFiltro("todos");
    setEstadoDocumentalFiltro("todos");
    setLecturaDocumentalFiltro("todos");
    setLecturaOperativaFiltro("todos");
    setCurrentPage(1);
  }

  if (loadingFiltros) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">
            Cargando filtros de trazabilidad técnica documental...
          </p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error cargando trazabilidad técnica documental
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error}
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
            <h1 className="mt-1 text-xl font-semibold">
              Trazabilidad técnica documental
            </h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Vista de auditoría documental: estado vigente, resumen persistido e histórico real de movimientos registrados desde la mesa documental.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(total)} visibles · {num(resumenGlobal.controlesTrazados)} controles ·{" "}
            {num(resumenMovimientos.totalMovimientos)} movimientos recientes
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-2 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver al dashboard
            </Link>
            <Link href="/recepcion-documentacion" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Recepción documental
            </Link>
            <Link href="/mesa-fiscalizacion" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Mesa de fiscalización
            </Link>
          </div>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-sm">
            Fuentes: v_trazabilidad_tecnica_documental · v_movimientos_documentacion_trazabilidad
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-5">
          <Kpi label="Controles trazados" value={num(resumenGlobal.controlesTrazados)} detail="registros documentales" />
          <Kpi label="Entidades" value={num(resumenGlobal.entidades)} detail="beneficiarias" />
          <Kpi label="Documentos" value={num(resumenGlobal.documentos)} detail="tipologías documentales" />
          <Kpi label="Técnicos/unidades" value={num(resumenGlobal.tecnicos)} detail="revisión documental" />
          <Kpi label="Movimientos" value={num(resumenMovimientos.totalMovimientos)} detail="histórico reciente" tone="ok" />
        </section>

        <section className="rounded-lg border border-emerald-100 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[14px] font-semibold leading-5 text-slate-950">
                  Histórico de movimientos documentales
                </h2>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  public.v_movimientos_documentacion_trazabilidad
                </span>
              </div>
              <p className="mt-0.5 text-[10.5px] leading-4 text-slate-500">
                Evidencia de cambios generados desde la mesa documental: estado anterior, estado nuevo, técnico, motivo, origen y observaciones.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadMovimientos}
                disabled={loadingMovimientos}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMovimientos ? "Recargando..." : "Recargar histórico"}
              </button>
            </div>
          </div>

          <div className="mt-2 grid gap-2 lg:grid-cols-5">
            <Kpi
              label="Movimientos"
              value={loadingMovimientos ? "…" : num(resumenMovimientos.totalMovimientos)}
              detail="últimos 50"
              tone="ok"
            />
            <Kpi
              label="Desde mesa"
              value={loadingMovimientos ? "…" : num(resumenMovimientos.desdeMesa)}
              detail="origen mesa documental"
              tone="ok"
            />
            <Kpi
              label="Cambio estado"
              value={loadingMovimientos ? "…" : num(resumenMovimientos.cambiosEstado)}
              detail="estado anterior/nuevo"
              tone="warn"
            />
            <Kpi
              label="Actualizaciones"
              value={loadingMovimientos ? "…" : num(resumenMovimientos.actualizaciones)}
              detail="sin cambio de estado"
            />
            <Kpi
              label="Subsanación"
              value={loadingMovimientos ? "…" : num(resumenMovimientos.conSubsanacion)}
              detail="marca activa"
              tone={resumenMovimientos.conSubsanacion > 0 ? "warn" : "ok"}
            />
          </div>

          {movimientosError ? (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[10.5px] font-semibold text-red-800">
              {movimientosError}
            </p>
          ) : null}

          <div className="mt-2 max-h-[290px] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[9.5px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Fecha / origen</th>
                  <th className="px-2 py-1.5">Entidad / acción</th>
                  <th className="px-2 py-1.5">Fase / documento</th>
                  <th className="px-2 py-1.5">Cambio</th>
                  <th className="px-2 py-1.5">Técnico</th>
                  <th className="px-2 py-1.5">Motivo</th>
                  <th className="px-2 py-1.5">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {loadingMovimientos ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-500">
                      Cargando histórico de movimientos...
                    </td>
                  </tr>
                ) : null}

                {!loadingMovimientos &&
                  movimientos.map((row) => (
                    <tr
                      key={`movimiento-${row.movimiento_id}`}
                      className="border-t border-slate-100 hover:bg-emerald-50"
                    >
                      <td className="px-2 py-1">
                        <p className="font-semibold leading-4 text-slate-950">
                          {fecha(row.fecha_movimiento)}
                        </p>
                        <p className="text-[10px] leading-4 text-slate-500">
                          {clean(row.origen)} · #{row.movimiento_id}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <p className="line-clamp-1 font-semibold leading-4 text-slate-950">
                          {clean(row.entidad_nombre, "Entidad no informada")}
                        </p>
                        <p className="text-[10px] leading-4 text-slate-500">
                          {clean(row.entidad_cif)} · {clean(row.codigo_accion)} · {clean(row.tipo_oferta)}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <p className="font-semibold leading-4 text-slate-950">
                          {label(row.fase)}
                        </p>
                        <p className="line-clamp-1 text-[10px] leading-4 text-slate-500">
                          {clean(row.nombre_documento)}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <p className="font-semibold leading-4 text-slate-950">
                          {label(row.estado_anterior)} → {label(row.estado_nuevo)}
                        </p>
                        <span className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${movimientoBadgeClass(row.tipo_movimiento)}`}>
                          {label(row.tipo_movimiento)}
                        </span>
                      </td>

                      <td className="px-2 py-1">
                        <p className="font-semibold leading-4 text-slate-950">
                          {clean(row.tecnico_anterior, "Sin asignar")} → {clean(row.tecnico_nuevo, "Sin asignar")}
                        </p>
                        <p className="text-[10px] leading-4 text-slate-500">
                          Pago: {estadoPagoLabel(row.estado_pago_administrativo)}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <p className="line-clamp-2 text-[10.5px] leading-4 text-slate-600">
                          {clean(row.motivo_cambio)}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setMovimientoSeleccionado(row)}
                            className="rounded-md bg-[#183B63] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                          >
                            Ver movimiento
                          </button>

                          {row.subexpediente_id ? (
                            <Link
                              href={`/mesa-documental/${row.subexpediente_id}?fase=${row.fase ?? ""}&control=${row.documento_normativo_id ?? ""}`}
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-center text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                            >
                              Mesa
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loadingMovimientos && movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-500">
                      Todavía no hay movimientos documentales registrados en la tabla histórica.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-blue-100 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[14px] font-semibold leading-5 text-slate-950">
                  Resumen documental persistido
                </h2>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  public.resumen_documental_institucional
                </span>
              </div>

              <p className="mt-0.5 text-[10.5px] leading-4 text-slate-500">
                Control técnico del resumen ejecutivo usado por el dashboard. El refresco ejecuta la RPC trazada y devuelve evidencia de cálculo.
              </p>

              <div className="mt-2 grid gap-2 lg:grid-cols-5">
                <Kpi
                  label="Documentos"
                  value={loadingResumenDocumental ? "…" : num(resumenDocumental?.documentos_total)}
                  detail="total procesado"
                  tone="default"
                />
                <Kpi
                  label="Recibidos pendientes"
                  value={loadingResumenDocumental ? "…" : num(resumenDocumental?.recibidos_pendientes)}
                  detail="recibidos sin validación final"
                  tone="warn"
                />
                <Kpi
                  label="Validados"
                  value={loadingResumenDocumental ? "…" : num(resumenDocumental?.validados)}
                  detail="documentación validada"
                  tone="ok"
                />
                <Kpi
                  label="No aplica"
                  value={loadingResumenDocumental ? "…" : num(resumenDocumental?.no_aplica)}
                  detail="controles no exigibles"
                  tone="default"
                />
                <Kpi
                  label="Riesgo activo"
                  value={loadingResumenDocumental ? "…" : num(resumenDocumental?.riesgo_activo_alto_critico)}
                  detail="alto/crítico activo"
                  tone={Number(resumenDocumental?.riesgo_activo_alto_critico ?? 0) > 0 ? "risk" : "ok"}
                />
              </div>

              <div className="mt-2 grid gap-2 text-[10.5px] text-slate-600 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <span className="font-semibold text-slate-800">Último cálculo:</span>{" "}
                  {fecha(resumenDocumental?.calculado_en)}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <span className="font-semibold text-slate-800">Registros procesados:</span>{" "}
                  {num(resumenDocumental?.registros_procesados)}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <span className="font-semibold text-slate-800">Ofertas/Subexp.:</span>{" "}
                  {num(resumenDocumental?.ofertas)} / {num(resumenDocumental?.subexpedientes)}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <span className="font-semibold text-slate-800">Entidades:</span>{" "}
                  {num(resumenDocumental?.entidades)}
                </div>
              </div>

              <p className="mt-1.5 truncate text-[10px] text-slate-500">
                Regla: {clean(resumenDocumental?.version_regla, "pendiente de carga")}
              </p>

              {resumenDocumentalError ? (
                <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[10.5px] font-semibold text-red-800">
                  {resumenDocumentalError}
                </p>
              ) : null}

              {resumenDocumentalOk ? (
                <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10.5px] font-semibold text-emerald-800">
                  {resumenDocumentalOk}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col gap-2 lg:w-[210px]">
              <button
                type="button"
                onClick={refrescarResumenDocumental}
                disabled={refreshingResumenDocumental || loadingResumenDocumental}
                className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refreshingResumenDocumental ? "Actualizando..." : "Actualizar resumen"}
              </button>

              <button
                type="button"
                onClick={loadResumenDocumental}
                disabled={refreshingResumenDocumental || loadingResumenDocumental}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Recargar lectura
              </button>

              <Link
                href="/dashboard"
                className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-center text-xs font-semibold text-blue-800 hover:bg-blue-100"
              >
                Ver dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, acción, especialidad, documento, técnico..."
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <SelectFiltro
              label="Entidad"
              value={entidadFiltro}
              onChange={setEntidadFiltro}
              options={opcionesEntidad}
              placeholder="Todas las entidades"
            />

            <SelectFiltro
              label="Técnico / unidad"
              value={tecnicoFiltro}
              onChange={setTecnicoFiltro}
              options={opcionesTecnico}
              placeholder="Todos"
            />

            <SelectFiltro
              label="Documento"
              value={documentoFiltro}
              onChange={setDocumentoFiltro}
              options={opcionesDocumento}
              placeholder="Todos los documentos"
            />

            <div className="flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="mt-2 grid gap-2 lg:grid-cols-5">
            <SelectFiltro
              label="Fase"
              value={faseFiltro}
              onChange={setFaseFiltro}
              options={opcionesFase}
              placeholder="Todas"
            />

            <SelectFiltro
              label="Estado operativo"
              value={estadoOperativoFiltro}
              onChange={setEstadoOperativoFiltro}
              options={opcionesEstadoOperativo}
              placeholder="Todos"
            />

            <SelectFiltro
              label="Estado documental"
              value={estadoDocumentalFiltro}
              onChange={setEstadoDocumentalFiltro}
              options={opcionesEstadoDocumental}
              placeholder="Todos"
            />

            <SelectFiltro
              label="Lectura documental"
              value={lecturaDocumentalFiltro}
              onChange={setLecturaDocumentalFiltro}
              options={opcionesLecturaDocumental}
              placeholder="Todas"
            />

            <SelectFiltro
              label="Lectura operativa"
              value={lecturaOperativaFiltro}
              onChange={setLecturaOperativaFiltro}
              options={opcionesLecturaOperativa}
              placeholder="Todas"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-1.5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[14px] font-semibold leading-5">
                Registro centralizado de trazabilidad documental
              </h2>
              <p className="text-[10.5px] leading-4 text-slate-500">
                Estado vigente por control documental, vinculado a entidad, subexpediente, fase, documento y técnico/unidad.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-600">
              {loadingTabla ? (
                <span className="font-semibold text-slate-500">Cargando tabla...</span>
              ) : (
                <span className="font-semibold">
                  Página {num(safeCurrentPage)} de {num(totalPages)}
                </span>
              )}

              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[10.5px] font-semibold outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={`page-size-${size}`} value={size}>
                    {size} filas
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={safeCurrentPage <= 1 || loadingTabla}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10.5px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages || loadingTabla}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10.5px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="max-h-[620px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[9.5px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Técnico / unidad</th>
                  <th className="px-2 py-1.5">Fecha</th>
                  <th className="px-2 py-1.5">Entidad / subexpediente</th>
                  <th className="px-2 py-1.5">Fase / documento</th>
                  <th className="px-2 py-1.5">Operativo</th>
                  <th className="px-2 py-1.5">Documental</th>
                  <th className="px-2 py-1.5">Lectura</th>
                  <th className="px-2 py-1.5">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {loadingTabla ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                      Cargando registros...
                    </td>
                  </tr>
                ) : null}

                {!loadingTabla &&
                  trazas.map((row, index) => (
                    <tr
                      key={`traza-${row.trazabilidad_id}-${row.oferta_id ?? "sin-oferta"}-${index}`}
                      className="border-t border-slate-100 hover:bg-blue-50"
                    >
                      <td className="px-2 py-1">
                        <p className="font-semibold leading-4 text-slate-950">
                          {clean(row.tecnico_revisor, "Sin asignar")}
                        </p>
                        <p className="text-[10px] leading-4 text-slate-500">
                          {clean(row.tipo_dato, "control documental")}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <p className="font-semibold leading-4">
                          {fecha(row.fecha_trazabilidad)}
                        </p>
                        <p className="text-[10px] leading-4 text-slate-500">
                          Límite: {fechaCorta(row.fecha_limite)}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <p className="font-semibold leading-4 text-slate-950">
                          {clean(row.entidad_nombre, "Entidad no informada")}
                        </p>
                        <p className="text-[10px] leading-4 text-slate-500">
                          {clean(row.cif)} · {clean(row.codigo_accion)} · {clean(row.codigo_especialidad)} ·{" "}
                          {clean(row.tipo_oferta)}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <p className="font-semibold leading-4 text-slate-950">
                          {label(row.fase)}
                        </p>
                        <p className="line-clamp-1 text-[10px] leading-4 text-slate-500">
                          {clean(row.nombre_documento)}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.estado_operativo)}`}>
                          {label(row.estado_operativo)}
                        </span>
                      </td>

                      <td className="px-2 py-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.estado_documental)}`}>
                          {label(row.estado_documental)}
                        </span>
                        <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                          Criticidad: {label(row.criticidad_documental)}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <p className="line-clamp-1 font-semibold leading-4 text-slate-950">
                          {clean(row.lectura_operativa)}
                        </p>
                        <p className="line-clamp-1 text-[10px] leading-4 text-slate-500">
                          {clean(row.lectura_documental)}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setSeleccionada(row)}
                            className="rounded-md bg-[#183B63] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                          >
                            Ver ficha
                          </button>

                          <Link
                            href={`/subexpedientes-accion/${row.oferta_id}`}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Subexp.
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loadingTabla && trazas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay trazas que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {movimientoSeleccionado ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Movimiento documental histórico
              </p>
              <h2 className="mt-0.5 text-base font-semibold">
                {clean(movimientoSeleccionado.nombre_documento)}
              </h2>
              <p className="mt-0.5 text-[11px] text-blue-100">
                {clean(movimientoSeleccionado.entidad_nombre)} · {clean(movimientoSeleccionado.codigo_accion)} ·{" "}
                {fecha(movimientoSeleccionado.fecha_movimiento)}
              </p>
            </div>

            <div className="space-y-2 p-3">
              <section className="grid gap-2 lg:grid-cols-5">
                <Kpi
                  label="Origen"
                  value={clean(movimientoSeleccionado.origen)}
                  detail={`movimiento #${movimientoSeleccionado.movimiento_id}`}
                  tone="ok"
                />
                <Kpi
                  label="Tipo"
                  value={label(movimientoSeleccionado.tipo_movimiento)}
                  detail="acción registrada"
                />
                <Kpi
                  label="Estado anterior"
                  value={label(movimientoSeleccionado.estado_anterior)}
                  detail="antes del cambio"
                />
                <Kpi
                  label="Estado nuevo"
                  value={label(movimientoSeleccionado.estado_nuevo)}
                  detail="después del cambio"
                  tone="ok"
                />
                <Kpi
                  label="Pago"
                  value={estadoPagoLabel(movimientoSeleccionado.estado_pago_administrativo)}
                  detail="lectura administrativa"
                />
              </section>

              <section className="grid gap-2 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Entidad y subexpediente
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold leading-4 text-slate-950">
                    {clean(movimientoSeleccionado.entidad_nombre)}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-4 text-slate-500">
                    {clean(movimientoSeleccionado.entidad_cif)} · {clean(movimientoSeleccionado.codigo_accion)} ·{" "}
                    {clean(movimientoSeleccionado.codigo_especialidad)} · {clean(movimientoSeleccionado.tipo_oferta)}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Fase y documento
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold leading-4 text-slate-950">
                    {label(movimientoSeleccionado.fase)}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-4 text-slate-500">
                    {clean(movimientoSeleccionado.nombre_documento)}
                  </p>
                </div>
              </section>

              <section className="grid gap-2 lg:grid-cols-2">
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-blue-700">
                    Antes
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-blue-950">
                    Estado: <span className="font-semibold">{label(movimientoSeleccionado.estado_anterior)}</span>
                  </p>
                  <p className="text-[11px] leading-4 text-blue-950">
                    Técnico: <span className="font-semibold">{clean(movimientoSeleccionado.tecnico_anterior, "Sin asignar")}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[10.5px] leading-4 text-blue-900">
                    {clean(movimientoSeleccionado.observaciones_anteriores, "Sin observaciones anteriores.")}
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                    Después
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-emerald-950">
                    Estado: <span className="font-semibold">{label(movimientoSeleccionado.estado_nuevo)}</span>
                  </p>
                  <p className="text-[11px] leading-4 text-emerald-950">
                    Técnico: <span className="font-semibold">{clean(movimientoSeleccionado.tecnico_nuevo, "Sin asignar")}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[10.5px] leading-4 text-emerald-900">
                    {clean(movimientoSeleccionado.observaciones_nuevas, "Sin observaciones nuevas.")}
                  </p>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  Motivo y evidencia
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-700">
                  {clean(movimientoSeleccionado.motivo_cambio)}
                </p>
                <p className="mt-1 text-[10.5px] leading-4 text-slate-500">
                  Recepción: {fecha(movimientoSeleccionado.fecha_recepcion_anterior)} →{" "}
                  {fecha(movimientoSeleccionado.fecha_recepcion_nueva)} · Revisión:{" "}
                  {fecha(movimientoSeleccionado.fecha_revision_anterior)} →{" "}
                  {fecha(movimientoSeleccionado.fecha_revision_nueva)}
                </p>
                <p className="mt-1 text-[10.5px] leading-4 text-slate-500">
                  Usuario: {clean(movimientoSeleccionado.usuario_id, "No identificado en SQL Editor o sesión demo")}
                </p>
              </section>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                {movimientoSeleccionado.subexpediente_id ? (
                  <Link
                    href={`/mesa-documental/${movimientoSeleccionado.subexpediente_id}?fase=${movimientoSeleccionado.fase ?? ""}&control=${movimientoSeleccionado.documento_normativo_id ?? ""}`}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Abrir mesa documental
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={() => setMovimientoSeleccionado(null)}
                  className="rounded-md bg-[#183B63] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f]"
                >
                  Cerrar movimiento
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {seleccionada ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Ficha institucional de trazabilidad documental
              </p>
              <h2 className="mt-0.5 text-base font-semibold">
                {clean(seleccionada.nombre_documento)}
              </h2>
              <p className="mt-0.5 text-[11px] text-blue-100">
                {clean(seleccionada.entidad_nombre)} · {clean(seleccionada.codigo_accion)} ·{" "}
                {clean(seleccionada.codigo_especialidad)}
              </p>
            </div>

            <div className="space-y-2 p-3">
              <section className="grid gap-2 lg:grid-cols-5">
                <Kpi
                  label="Técnico / unidad"
                  value={clean(seleccionada.tecnico_revisor, "Sin asignar")}
                  detail="responsable documental"
                />
                <Kpi
                  label="Fase"
                  value={label(seleccionada.fase)}
                  detail={clean(seleccionada.subfase, "sin subfase")}
                />
                <Kpi
                  label="Estado documental"
                  value={label(seleccionada.estado_documental)}
                  detail={`criticidad ${label(seleccionada.criticidad_documental)}`}
                />
                <Kpi
                  label="Estado operativo"
                  value={label(seleccionada.estado_operativo)}
                  detail={clean(seleccionada.prioridad_operativa)}
                />
                <Kpi
                  label="Control económico"
                  value={euro(seleccionada.importe_en_riesgo)}
                  detail="revisión/riesgo asociado"
                  tone={Number(seleccionada.importe_en_riesgo ?? 0) > 0 ? "risk" : "ok"}
                />
              </section>

              <section className="grid gap-2 lg:grid-cols-[0.55fr_1.45fr]">
                <div className="space-y-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Entidad beneficiaria
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold leading-4 text-slate-950">
                      {clean(seleccionada.entidad_nombre, "Entidad no informada")}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                      {clean(seleccionada.cif)} · {clean(seleccionada.entidad_isla)} ·{" "}
                      {clean(seleccionada.entidad_municipio)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Subexpediente
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold leading-4 text-slate-950">
                      {clean(seleccionada.codigo_accion)}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                      {clean(seleccionada.tipo_oferta)} · {clean(seleccionada.codigo_especialidad)} ·{" "}
                      {clean(seleccionada.horas)} h
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Fechas
                    </p>
                    <div className="mt-1 grid gap-1 text-[10.5px]">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Límite</span>
                        <span className="font-semibold">{fechaCorta(seleccionada.fecha_limite)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Recepción</span>
                        <span className="font-semibold">{fecha(seleccionada.fecha_recepcion)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Revisión</span>
                        <span className="font-semibold">{fecha(seleccionada.fecha_revision)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <section className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] leading-5 text-blue-950">
                    <p className="font-semibold">Lectura institucional</p>
                    <p className="mt-0.5">
                      {clean(seleccionada.lectura_operativa)}. {clean(seleccionada.lectura_documental)}.
                    </p>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Acción formativa / especialidad
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold leading-4 text-slate-950">
                      {clean(seleccionada.denominacion)}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-600">
                      Familia: {clean(seleccionada.familia_profesional)} · Modalidad:{" "}
                      {clean(seleccionada.modalidad)} · Centro: {clean(seleccionada.centro_formacion)}
                    </p>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Documento controlado
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold leading-4 text-slate-950">
                      {clean(seleccionada.nombre_documento)}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-600">
                      Obligatoriedad: {label(seleccionada.obligatoriedad)} · Subsanación:{" "}
                      {seleccionada.requiere_subsanacion ? "Sí" : "No"} · Comunicado al ente fiscalizador:{" "}
                      {seleccionada.comunicado_ente_fiscalizador ? "Sí" : "No"}
                    </p>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Fuente y trazabilidad del dato
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-700">
                      Fuente documental: {clean(seleccionada.fuente_dato)} · Tipo dato:{" "}
                      {clean(seleccionada.tipo_dato)} · Nivel confianza:{" "}
                      {clean(seleccionada.nivel_confianza)}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-700">
                      Fuente resolución: {clean(seleccionada.fuente_resolucion)} · Tipo resolución:{" "}
                      {clean(seleccionada.tipo_dato_resolucion)}
                    </p>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Observaciones
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-4 text-slate-700">
                      {clean(seleccionada.observaciones, "Sin observaciones adicionales registradas.")}
                    </p>
                  </section>
                </div>
              </section>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                <Link
                  href={`/subexpedientes-accion/${seleccionada.oferta_id}`}
                  className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver subexpediente
                </Link>

                <button
                  type="button"
                  onClick={() => setSeleccionada(null)}
                  className="rounded-md bg-[#183B63] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f]"
                >
                  Cerrar ficha
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <span className="hidden">{VERSION_TRAZABILIDAD_TECNICA}</span>
    </main>
  );
}