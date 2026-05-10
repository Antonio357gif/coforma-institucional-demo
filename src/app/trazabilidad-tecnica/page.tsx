"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type FiltroRow = {
  filtro: string;
  valor: string;
  registros: number;
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

  const [loadingFiltros, setLoadingFiltros] = useState(true);
  const [loadingTabla, setLoadingTabla] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const registrosMadre = filtros
    .filter((row) => row.filtro === "entidad")
    .reduce((acc, row) => acc + Number(row.registros ?? 0), 0);

  return {
    registrosMadre,
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
              Vista centralizada de entidad, subexpediente, fase, documento, técnico/unidad, lectura documental y estado operativo.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(total)} visibles · {num(resumenGlobal.registrosMadre)} registros madre
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

          <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm">
            Fuente: v_trazabilidad_tecnica_documental
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-5">
          <Kpi label="Registros madre" value={num(resumenGlobal.registrosMadre)} detail="controles documentales" />
          <Kpi label="Entidades" value={num(resumenGlobal.entidades)} detail="beneficiarias" />
          <Kpi label="Documentos" value={num(resumenGlobal.documentos)} detail="tipologías documentales" />
          <Kpi label="Técnicos/unidades" value={num(resumenGlobal.tecnicos)} detail="revisión documental" />
          <Kpi label="Fases" value={num(resumenGlobal.fases)} detail="ciclo documental" />
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
                Una línea por control documental, vinculada a entidad, subexpediente, fase, documento y técnico/unidad.
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
    </main>
  );
}