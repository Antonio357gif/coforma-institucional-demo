"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const VERSION_MATRIZ_NORMATIVA =
  "2026-05-20-v2-backend-real-corporativo";

type NormativaControl = {
  id: number;
  fase: string;
  subfase: string;
  nombre_documento: string;
  obligatoriedad: string | null;
  riesgo_actual: string | null;
  aplica_tipo_oferta: string | null;
  aplica_modalidad: string | null;
  momento_exigibilidad: string | null;
  plazo_dias: number | null;
  tipo_dias: string | null;
  canal_presentacion: string | null;
  estado_si_pendiente_ejecutar: string | null;
  estado_si_en_ejecucion: string | null;
  estado_si_finalizada: string | null;
  fuente_juridica_tipo: string | null;
  fuente_juridica_titulo: string | null;
  fuente_juridica_url: string | null;
  fuente_juridica_articulo_apartado: string | null;
  texto_justificativo: string | null;
  fuente_operativa: string | null;
  nivel_confianza: string | null;
  estado_verificacion_normativa: string | null;
  activo: boolean | null;
};

type SelectOption = {
  value: string;
  label: string;
};

const faseOrder = ["inicio", "seguimiento", "finalizacion", "justificacion", "cierre"];

const faseLabels: Record<string, string> = {
  inicio: "Inicio",
  seguimiento: "Seguimiento",
  finalizacion: "Finalización",
  justificacion: "Justificación",
  cierre: "Cierre",
};

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Number(value ?? 0));
}

function clean(value: string | null | undefined, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function uniqueOptions(rows: NormativaControl[], key: keyof NormativaControl): SelectOption[] {
  const values = Array.from(
    new Set(
      rows
        .map((row) => row[key])
        .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  return [
    { value: "todos", label: "Todos" },
    ...values.map((value) => ({
      value,
      label: faseLabels[value] ?? value,
    })),
  ];
}

function faseClass(fase: string | null | undefined) {
  const value = (fase ?? "").toLowerCase();

  if (value === "inicio") return "border-blue-200 bg-blue-50 text-blue-800";
  if (value === "seguimiento") return "border-cyan-200 bg-cyan-50 text-cyan-800";
  if (value === "finalizacion") return "border-violet-200 bg-violet-50 text-violet-800";
  if (value === "justificacion") return "border-orange-200 bg-orange-50 text-orange-800";
  if (value === "cierre") return "border-slate-300 bg-slate-100 text-slate-800";

  return "border-slate-200 bg-white text-slate-700";
}

function riesgoClass(riesgo: string | null | undefined) {
  const value = (riesgo ?? "").toLowerCase();

  if (value === "critico" || value === "crítico") return "border-red-300 bg-red-50 text-red-800";
  if (value === "alto" || value === "alta") return "border-rose-200 bg-rose-50 text-rose-800";
  if (value === "medio" || value === "media") return "border-amber-200 bg-amber-50 text-amber-800";
  if (value === "bajo" || value === "baja") return "border-emerald-200 bg-emerald-50 text-emerald-800";

  return "border-slate-200 bg-white text-slate-700";
}

function obligatoriedadClass(value: string | null | undefined) {
  const text = (value ?? "").toLowerCase();

  if (text === "obligatorio") return "border-blue-200 bg-blue-50 text-blue-800";
  if (text === "condicional") return "border-violet-200 bg-violet-50 text-violet-800";
  if (text === "recomendado") return "border-slate-200 bg-slate-50 text-slate-700";

  return "border-slate-200 bg-white text-slate-700";
}

function verificacionClass(value: string | null | undefined) {
  const text = (value ?? "").toLowerCase();

  if (text.includes("verificado")) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (text.includes("parcial")) return "border-amber-200 bg-amber-50 text-amber-800";
  if (text.includes("pendiente")) return "border-red-200 bg-red-50 text-red-800";

  return "border-slate-200 bg-white text-slate-700";
}

function SmallBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function KpiCard({
  label,
  value,
  detail,
  tone = "slate",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "green" | "amber" | "red" | "slate" | "violet" | "emerald";
}) {
  const toneClass =
    tone === "green" || tone === "emerald"
      ? "border-emerald-200"
      : tone === "blue"
        ? "border-blue-200"
        : tone === "amber"
          ? "border-amber-200"
          : tone === "red"
            ? "border-red-200"
            : tone === "violet"
              ? "border-violet-200"
              : "border-slate-200";

  return (
    <div className={`rounded-xl border ${toneClass} bg-white px-3 py-2 shadow-sm`}>
      <p className="truncate text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[17px] font-semibold leading-5 text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">
        {detail}
      </p>
    </div>
  );
}

export default function MatrizNormativaDocumentalPage() {
  const [rows, setRows] = useState<NormativaControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faseFiltro, setFaseFiltro] = useState("todos");
  const [obligatoriedadFiltro, setObligatoriedadFiltro] = useState("todos");
  const [riesgoFiltro, setRiesgoFiltro] = useState("todos");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [modalidadFiltro, setModalidadFiltro] = useState("todos");
  const [verificacionFiltro, setVerificacionFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  async function loadControles() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("normativa_documental_controles")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as NormativaControl[]);
    setLoading(false);
  }

  useEffect(() => {
    loadControles();
  }, []);

  const faseOptions = useMemo(() => {
    const existing = new Set(rows.map((row) => row.fase).filter(Boolean));
    return [
      { value: "todos", label: "Todas" },
      ...faseOrder
        .filter((fase) => existing.has(fase))
        .map((fase) => ({ value: fase, label: faseLabels[fase] ?? fase })),
      ...Array.from(existing)
        .filter((fase) => !faseOrder.includes(fase))
        .map((fase) => ({ value: fase, label: faseLabels[fase] ?? fase })),
    ];
  }, [rows]);

  const obligatoriedadOptions = useMemo(
    () => uniqueOptions(rows, "obligatoriedad"),
    [rows]
  );

  const riesgoOptions = useMemo(
    () => uniqueOptions(rows, "riesgo_actual"),
    [rows]
  );

  const tipoOptions = useMemo(
    () => uniqueOptions(rows, "aplica_tipo_oferta"),
    [rows]
  );

  const modalidadOptions = useMemo(
    () => uniqueOptions(rows, "aplica_modalidad"),
    [rows]
  );

  const verificacionOptions = useMemo(
    () => uniqueOptions(rows, "estado_verificacion_normativa"),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const query = busqueda.trim().toLowerCase();

    return rows.filter((row) => {
      if (faseFiltro !== "todos" && row.fase !== faseFiltro) return false;
      if (obligatoriedadFiltro !== "todos" && row.obligatoriedad !== obligatoriedadFiltro) return false;
      if (riesgoFiltro !== "todos" && row.riesgo_actual !== riesgoFiltro) return false;
      if (tipoFiltro !== "todos" && row.aplica_tipo_oferta !== tipoFiltro) return false;
      if (modalidadFiltro !== "todos" && row.aplica_modalidad !== modalidadFiltro) return false;
      if (
        verificacionFiltro !== "todos" &&
        row.estado_verificacion_normativa !== verificacionFiltro
      ) {
        return false;
      }

      if (!query) return true;

      const searchable = [
        row.fase,
        row.subfase,
        row.nombre_documento,
        row.obligatoriedad,
        row.riesgo_actual,
        row.aplica_tipo_oferta,
        row.aplica_modalidad,
        row.momento_exigibilidad,
        row.canal_presentacion,
        row.fuente_juridica_tipo,
        row.fuente_juridica_titulo,
        row.fuente_juridica_articulo_apartado,
        row.texto_justificativo,
        row.fuente_operativa,
        row.nivel_confianza,
        row.estado_verificacion_normativa,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [
    rows,
    faseFiltro,
    obligatoriedadFiltro,
    riesgoFiltro,
    tipoFiltro,
    modalidadFiltro,
    verificacionFiltro,
    busqueda,
  ]);

  const kpis = useMemo(() => {
    const activos = rows.filter((row) => row.activo !== false);
    const fases = new Set(rows.map((row) => row.fase).filter(Boolean)).size;
    const obligatorios = rows.filter((row) => row.obligatoriedad === "obligatorio").length;
    const condicionales = rows.filter((row) => row.obligatoriedad === "condicional").length;
    const altoCritico = rows.filter((row) => {
      const riesgo = (row.riesgo_actual ?? "").toLowerCase();
      return riesgo === "alto" || riesgo === "critico" || riesgo === "crítico";
    }).length;
    const conFuente = rows.filter((row) => Boolean(row.fuente_juridica_url || row.fuente_juridica_titulo)).length;

    return {
      total: rows.length,
      activos: activos.length,
      fases,
      obligatorios,
      condicionales,
      altoCritico,
      conFuente,
    };
  }, [rows]);

  function limpiarFiltros() {
    setFaseFiltro("todos");
    setObligatoriedadFiltro("todos");
    setRiesgoFiltro("todos");
    setTipoFiltro("todos");
    setModalidadFiltro("todos");
    setVerificacionFiltro("todos");
    setBusqueda("");
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold">Matriz normativa documental</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Consulta real de controles documentales, fases, obligatoriedad, riesgo y fuente normativa FPED.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
              Normativa documental
            </div>
            <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-100">
              {loading ? "Cargando..." : `${num(kpis.total)} controles FPED`}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/recepcion-documentacion" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver a recepción documental
            </Link>
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Dashboard
            </Link>
            <Link href="/trazabilidad-tecnica" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Trazabilidad técnica
            </Link>
          </div>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 shadow-sm">
            Fuente normativa del control documental
          </span>
        </div>

        {error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 shadow-sm">
            No se pudo cargar la matriz normativa: {error}
            <button
              type="button"
              onClick={loadControles}
              className="ml-2 rounded-lg border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-800 hover:bg-red-100"
            >
              Reintentar
            </button>
          </section>
        ) : null}

        <section className="grid gap-2 lg:grid-cols-6">
          <KpiCard label="Controles" value={loading ? "—" : num(kpis.total)} detail="matriz FPED" tone="green" />
          <KpiCard label="Activos" value={loading ? "—" : num(kpis.activos)} detail="controles vigentes" tone="blue" />
          <KpiCard label="Fases" value={loading ? "—" : num(kpis.fases)} detail="inicio a cierre" tone="blue" />
          <KpiCard label="Obligatorios" value={loading ? "—" : num(kpis.obligatorios)} detail="exigencia principal" tone="violet" />
          <KpiCard label="Condicionales" value={loading ? "—" : num(kpis.condicionales)} detail="según caso" tone="amber" />
          <KpiCard label="Riesgo alto/crítico" value={loading ? "—" : num(kpis.altoCritico)} detail="prioridad normativa" tone="red" />
        </section>

        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-950">
            Criterio operativo
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-emerald-900">
            La matriz normativa no sustituye a la mesa documental. La mesa trabaja el subexpediente concreto; la matriz explica por qué se exige cada control, en qué fase aplica, con qué obligatoriedad, qué riesgo tiene y qué fuente FPED lo respalda.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr_auto]">
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Documento, fuente, fase, artículo, texto justificativo..."
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Fase
              </label>
              <select value={faseFiltro} onChange={(e) => setFaseFiltro(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none">
                {faseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Oblig.
              </label>
              <select value={obligatoriedadFiltro} onChange={(e) => setObligatoriedadFiltro(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none">
                {obligatoriedadOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Riesgo
              </label>
              <select value={riesgoFiltro} onChange={(e) => setRiesgoFiltro(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none">
                {riesgoOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Tipo
              </label>
              <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none">
                {tipoOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Verificación
              </label>
              <select value={verificacionFiltro} onChange={(e) => setVerificacionFiltro(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none">
                {verificacionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
            <div>
              <h2 className="text-[14px] font-semibold leading-5">
                Controles normativos documentales
              </h2>
              <p className="text-[10.5px] leading-4 text-slate-500">
                Resultado filtrado: {loading ? "—" : num(filteredRows.length)} controles.
              </p>
            </div>

            <Link
              href="/recepcion-documentacion"
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-blue-800 hover:bg-blue-100"
            >
              Volver a recepción documental
            </Link>
          </div>

          <div className="max-h-[700px] overflow-auto px-3 py-2">
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                Cargando matriz normativa documental...
              </div>
            ) : null}

            {!loading && filteredRows.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                No hay controles que coincidan con los filtros aplicados o la tabla no devuelve filas al frontend.
              </div>
            ) : null}

            {!loading && filteredRows.length > 0 ? (
              <div className="space-y-2">
                {filteredRows.map((row) => (
                  <article
                    key={row.id}
                    className="grid gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-blue-50 lg:grid-cols-[0.9fr_1.35fr_1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap gap-1">
                        <SmallBadge className={faseClass(row.fase)}>
                          {faseLabels[row.fase] ?? clean(row.fase)}
                        </SmallBadge>
                        <SmallBadge className={obligatoriedadClass(row.obligatoriedad)}>
                          {clean(row.obligatoriedad)}
                        </SmallBadge>
                        <SmallBadge className={riesgoClass(row.riesgo_actual)}>
                          {clean(row.riesgo_actual)}
                        </SmallBadge>
                      </div>

                      <p className="mt-2 text-[10px] leading-4 text-slate-500">
                        Subfase: <span className="font-semibold text-slate-700">{clean(row.subfase)}</span>
                      </p>
                      <p className="text-[10px] leading-4 text-slate-500">
                        Tipo: {clean(row.aplica_tipo_oferta)} · Modalidad: {clean(row.aplica_modalidad)}
                      </p>
                      <p className="text-[10px] leading-4 text-slate-500">
                        Plazo: {row.plazo_dias ?? "—"} {clean(row.tipo_dias, "")}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold leading-4 text-slate-950">
                        {clean(row.nombre_documento)}
                      </p>
                      <p className="mt-1 text-[10.5px] leading-4 text-slate-500">
                        {clean(row.texto_justificativo, "Sin texto justificativo informado.")}
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-slate-500">
                        Exigibilidad: <span className="font-semibold text-slate-700">{clean(row.momento_exigibilidad)}</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Fuente jurídica
                      </p>
                      <p className="mt-1 text-[10.5px] leading-4 text-slate-700">
                        {clean(row.fuente_juridica_tipo)} · {clean(row.fuente_juridica_titulo)}
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-slate-500">
                        Artículo/apartado: {clean(row.fuente_juridica_articulo_apartado)}
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-slate-500">
                        Fuente operativa: {clean(row.fuente_operativa)}
                      </p>
                      <SmallBadge className={verificacionClass(row.estado_verificacion_normativa)}>
                        {clean(row.estado_verificacion_normativa)}
                      </SmallBadge>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {row.fuente_juridica_url ? (
                        <a
                          href={row.fuente_juridica_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50 lg:w-[116px]"
                        >
                          Fuente PDF
                        </a>
                      ) : null}

                      <Link
                        href={`/recepcion-documentacion?fase=${row.fase}`}
                        className="w-full rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-center text-[10px] font-semibold text-blue-800 hover:bg-blue-100 lg:w-[116px]"
                      >
                        Ver recepción
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <span className="hidden">{VERSION_MATRIZ_NORMATIVA}</span>
    </main>
  );
}