"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type IslaResumen = {
  isla: string | null;
  acciones_total: number | null;
  acciones_af: number | null;
  acciones_cp: number | null;
  finalizadas: number | null;
  en_ejecucion: number | null;
  pendientes_ejecutar: number | null;
  municipios: number | null;
  entidades_registro_municipal: number | null;
  importe_concedido: number | null;
  importe_ejecutado: number | null;
  importe_en_riesgo: number | null;
  porcentaje_finalizadas: number | null;
  porcentaje_en_ejecucion: number | null;
  porcentaje_pendientes: number | null;
  porcentaje_ejecucion_economica: number | null;
};

type MunicipioResumen = {
  isla: string | null;
  municipio: string | null;
  acciones_total: number | null;
  acciones_af: number | null;
  acciones_cp: number | null;
  finalizadas: number | null;
  en_ejecucion: number | null;
  pendientes_ejecutar: number | null;
  importe_concedido: number | null;
  importe_ejecutado: number | null;
  importe_en_riesgo?: number | null;
  entidades?: number | null;
};

const VERSION_DISTRIBUCION_TERRITORIAL =
  "2026-05-21-v3-distribucion-territorial-kpi-islas-compactas";

const ordenIslas = [
  "TENERIFE",
  "GRAN CANARIA",
  "LANZAROTE",
  "LA PALMA",
  "FUERTEVENTURA",
  "LA GOMERA",
  "EL HIERRO",
];

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

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Number(value ?? 0));
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function pct(value: number | null | undefined) {
  return `${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))}%`;
}

function sortIslas(a: IslaResumen, b: IslaResumen) {
  const indexA = ordenIslas.indexOf(clean(a.isla, ""));
  const indexB = ordenIslas.indexOf(clean(b.isla, ""));

  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;

  return Number(b.acciones_total ?? 0) - Number(a.acciones_total ?? 0);
}

function lecturaIsla(row: IslaResumen) {
  const pendientes = Number(row.porcentaje_pendientes ?? 0);
  const ejecucion = Number(row.porcentaje_en_ejecucion ?? 0);
  const finalizadas = Number(row.porcentaje_finalizadas ?? 0);

  if (pendientes >= 50) return "Alta carga pendiente";
  if (ejecucion >= 65 && pendientes <= 10) return "Ejecución avanzada";
  if (finalizadas >= 20) return "Cierre relevante";
  if (ejecucion >= 60) return "Actividad viva";
  return "Seguimiento ordinario";
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
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-[16px] font-bold leading-5 text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>
    </article>
  );
}

function EstadoMiniBar({
  finalizadas,
  enEjecucion,
  pendientes,
  total,
}: {
  finalizadas: number;
  enEjecucion: number;
  pendientes: number;
  total: number;
}) {
  const safeTotal = total > 0 ? total : 1;

  const pFinalizadas = Math.max(0, (finalizadas / safeTotal) * 100);
  const pEjecucion = Math.max(0, (enEjecucion / safeTotal) * 100);
  const pPendientes = Math.max(0, (pendientes / safeTotal) * 100);

  return (
    <div className="mt-1.5">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-emerald-300"
          style={{ width: `${pFinalizadas}%` }}
        />
        <div
          className="h-full bg-blue-300"
          style={{ width: `${pEjecucion}%` }}
        />
        <div
          className="h-full bg-amber-300"
          style={{ width: `${pPendientes}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-[8.5px] text-slate-500">
        <span>F {num(finalizadas)}</span>
        <span>E {num(enEjecucion)}</span>
        <span>P {num(pendientes)}</span>
      </div>
    </div>
  );
}

function IslaCard({
  row,
  selected,
  onSelect,
}: {
  row: IslaResumen;
  selected: boolean;
  onSelect: (isla: string) => void;
}) {
  const isla = clean(row.isla);
  const total = Number(row.acciones_total ?? 0);
  const af = Number(row.acciones_af ?? 0);
  const cp = Number(row.acciones_cp ?? 0);
  const finalizadas = Number(row.finalizadas ?? 0);
  const enEjecucion = Number(row.en_ejecucion ?? 0);
  const pendientes = Number(row.pendientes_ejecutar ?? 0);

  return (
    <button
      type="button"
      onClick={() => onSelect(isla)}
      className={`min-w-[176px] rounded-xl border bg-white px-2.5 py-2 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/30 ${
        selected ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-bold leading-4 text-slate-950">
            {isla}
          </p>
          <p className="text-[9px] text-slate-500">
            {num(row.municipios)} mun. · {num(total)} acc.
          </p>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
          {num(total)}
        </span>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px] text-slate-600">
        <p>
          <span className="font-bold text-blue-800">{num(af)}</span> AF
        </p>
        <p>
          <span className="font-bold text-violet-800">{num(cp)}</span> CP
        </p>
        <p>
          <span className="font-bold text-emerald-800">
            {pct(row.porcentaje_finalizadas)}
          </span>{" "}
          fin.
        </p>
        <p>
          <span className="font-bold text-amber-800">
            {pct(row.porcentaje_pendientes)}
          </span>{" "}
          pend.
        </p>
      </div>

      <EstadoMiniBar
        finalizadas={finalizadas}
        enEjecucion={enEjecucion}
        pendientes={pendientes}
        total={total}
      />

      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-1">
        <p className="truncate text-[9.5px] font-semibold text-slate-600">
          {lecturaIsla(row)}
        </p>
        <p className="shrink-0 text-[9px] text-slate-500">
          {pct(row.porcentaje_ejecucion_economica)}
        </p>
      </div>
    </button>
  );
}

function MunicipioCard({ row }: { row: MunicipioResumen }) {
  const total = Number(row.acciones_total ?? 0);
  const pendientes = Number(row.pendientes_ejecutar ?? 0);
  const finalizadas = Number(row.finalizadas ?? 0);
  const enEjecucion = Number(row.en_ejecucion ?? 0);

  const porcentajePendiente = total === 0 ? 0 : (pendientes / total) * 100;
  const porcentajeEjecucion = total === 0 ? 0 : (enEjecucion / total) * 100;
  const porcentajeFinalizadas = total === 0 ? 0 : (finalizadas / total) * 100;

  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm hover:border-blue-200 hover:bg-blue-50/30">
      <div className="grid gap-2 lg:grid-cols-[1.15fr_0.8fr_1.05fr_1.05fr_0.8fr] lg:items-start">
        <section className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Territorio
          </p>
          <p className="truncate text-[13px] font-black text-slate-950">
            {clean(row.municipio)}
          </p>
          <p className="truncate text-[10.5px] text-slate-500">
            {clean(row.isla)}
          </p>
        </section>

        <section>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Oferta
          </p>
          <p className="text-[13px] font-black text-slate-950">
            {num(row.acciones_total)} acciones
          </p>
          <p className="text-[10.5px] text-slate-500">
            {num(row.acciones_af)} AF · {num(row.acciones_cp)} CP
          </p>
        </section>

        <section>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Estado operativo
          </p>
          <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
              {num(row.finalizadas)} fin.
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-800">
              {num(row.en_ejecucion)} ejec.
            </span>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
              {num(row.pendientes_ejecutar)} pend.
            </span>
          </div>
          <p className="mt-1 text-[10.5px] text-slate-500">
            Pendiente: {pct(porcentajePendiente)}
          </p>
        </section>

        <section>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Económico
          </p>
          <p className="truncate text-[11px] font-black text-slate-950">
            {money(row.importe_concedido)}
          </p>
          <p className="truncate text-[10.5px] text-slate-500">
            Ejecutado: {money(row.importe_ejecutado)}
          </p>
          <p className="truncate text-[10.5px] text-slate-500">
            Riesgo: {money(row.importe_en_riesgo ?? 0)}
          </p>
        </section>

        <section>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Lectura
          </p>
          <p className="text-[10.5px] leading-4 text-slate-600">
            {porcentajePendiente >= 50
              ? "Alta carga pendiente."
              : porcentajeEjecucion >= 60
                ? "Predomina ejecución."
                : porcentajeFinalizadas >= 25
                  ? "Cierre avanzado."
                  : "Seguimiento ordinario."}
          </p>
        </section>
      </div>
    </article>
  );
}

export default function DistribucionTerritorialPage() {
  const [islas, setIslas] = useState<IslaResumen[]>([]);
  const [municipios, setMunicipios] = useState<MunicipioResumen[]>([]);

  const [loadingIslas, setLoadingIslas] = useState(true);
  const [loadingMunicipios, setLoadingMunicipios] = useState(true);

  const [errorIslas, setErrorIslas] = useState<string | null>(null);
  const [errorMunicipios, setErrorMunicipios] = useState<string | null>(null);

  const [filtroIsla, setFiltroIsla] = useState("todas");
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const loadIslas = useCallback(async () => {
    setLoadingIslas(true);
    setErrorIslas(null);

    const { data, error } = await supabase
      .from("v_distribucion_territorial_islas")
      .select("*");

    if (error) {
      setIslas([]);
      setErrorIslas(error.message);
      setLoadingIslas(false);
      return;
    }

    setIslas(((data ?? []) as IslaResumen[]).sort(sortIslas));
    setLoadingIslas(false);
  }, []);

  const loadMunicipios = useCallback(async () => {
    setLoadingMunicipios(true);
    setErrorMunicipios(null);

    const { data, error } = await supabase
      .from("v_distribucion_territorial_oferta_estado")
      .select("*")
      .order("isla", { ascending: true })
      .order("acciones_total", { ascending: false });

    if (error) {
      setMunicipios([]);
      setErrorMunicipios(error.message);
      setLoadingMunicipios(false);
      return;
    }

    setMunicipios((data ?? []) as MunicipioResumen[]);
    setLoadingMunicipios(false);
  }, []);

  useEffect(() => {
    loadIslas();
    loadMunicipios();
  }, [loadIslas, loadMunicipios]);

  const municipiosFiltrados = useMemo(() => {
    const search = normalize(busqueda);

    return municipios.filter((row) => {
      const islaOk = filtroIsla === "todas" || clean(row.isla) === filtroIsla;
      const municipioOk =
        filtroMunicipio === "todos" || clean(row.municipio) === filtroMunicipio;

      const tipoOk =
        filtroTipo === "todos" ||
        (filtroTipo === "AF" && Number(row.acciones_af ?? 0) > 0) ||
        (filtroTipo === "CP" && Number(row.acciones_cp ?? 0) > 0);

      const estadoOk =
        filtroEstado === "todos" ||
        (filtroEstado === "finalizadas" && Number(row.finalizadas ?? 0) > 0) ||
        (filtroEstado === "en_ejecucion" && Number(row.en_ejecucion ?? 0) > 0) ||
        (filtroEstado === "pendientes" && Number(row.pendientes_ejecutar ?? 0) > 0);

      const searchOk =
        search === "" ||
        normalize(row.isla).includes(search) ||
        normalize(row.municipio).includes(search);

      return islaOk && municipioOk && tipoOk && estadoOk && searchOk;
    });
  }, [busqueda, filtroEstado, filtroIsla, filtroMunicipio, filtroTipo, municipios]);

  const municipiosDisponibles = useMemo(() => {
    const base =
      filtroIsla === "todas"
        ? municipios
        : municipios.filter((row) => clean(row.isla) === filtroIsla);

    return Array.from(new Set(base.map((row) => clean(row.municipio))))
      .filter((value) => value !== "—")
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [filtroIsla, municipios]);

  const totals = useMemo(() => {
    return municipiosFiltrados.reduce(
      (acc, row) => {
        acc.acciones += Number(row.acciones_total ?? 0);
        acc.af += Number(row.acciones_af ?? 0);
        acc.cp += Number(row.acciones_cp ?? 0);
        acc.finalizadas += Number(row.finalizadas ?? 0);
        acc.enEjecucion += Number(row.en_ejecucion ?? 0);
        acc.pendientes += Number(row.pendientes_ejecutar ?? 0);
        acc.importeConcedido += Number(row.importe_concedido ?? 0);
        acc.importeEjecutado += Number(row.importe_ejecutado ?? 0);
        acc.importeRiesgo += Number(row.importe_en_riesgo ?? 0);
        return acc;
      },
      {
        acciones: 0,
        af: 0,
        cp: 0,
        finalizadas: 0,
        enEjecucion: 0,
        pendientes: 0,
        importeConcedido: 0,
        importeEjecutado: 0,
        importeRiesgo: 0,
      }
    );
  }, [municipiosFiltrados]);

  function limpiarFiltros() {
    setFiltroIsla("todas");
    setFiltroMunicipio("todos");
    setFiltroTipo("todos");
    setFiltroEstado("todos");
    setBusqueda("");
  }

  function seleccionarIsla(isla: string) {
    setFiltroIsla(isla);
    setFiltroMunicipio("todos");
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
              Distribución territorial
            </h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Lectura de cobertura territorial de AF y CP por isla, municipio, estado operativo e importe.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-blue-50">
            Fuentes: v_distribucion_territorial_islas · v_distribucion_territorial_oferta_estado
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
              href="/oferta-formativa"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Oferta formativa
            </Link>

            <Link
              href="/recepcion-documentacion"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Recepción documental
            </Link>

            <Link
              href="/documentacion-fases"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            >
              Documentación por fases
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              loadIslas();
              loadMunicipios();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-black text-white shadow-sm hover:bg-blue-700"
          >
            Recargar lectura
          </button>
        </div>

        {errorIslas || errorMunicipios ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 shadow-sm">
            {errorIslas ? <p>Islas: {errorIslas}</p> : null}
            {errorMunicipios ? <p>Municipios: {errorMunicipios}</p> : null}
          </section>
        ) : null}

        <section className="grid gap-2 md:grid-cols-5">
          <KpiCard
            label="Acciones filtradas"
            value={loadingMunicipios ? "…" : num(totals.acciones)}
            detail={`${num(totals.af)} AF · ${num(totals.cp)} CP`}
          />

          <KpiCard
            label="En ejecución"
            value={loadingMunicipios ? "…" : num(totals.enEjecucion)}
            detail="actividad viva territorial"
          />

          <KpiCard
            label="Finalizadas"
            value={loadingMunicipios ? "…" : num(totals.finalizadas)}
            detail="acciones cerradas"
          />

          <KpiCard
            label="Pendientes"
            value={loadingMunicipios ? "…" : num(totals.pendientes)}
            detail="pendientes de ejecutar"
          />

          <KpiCard
            label="Importe concedido"
            value={loadingMunicipios ? "…" : money(totals.importeConcedido)}
            detail={`Ejecutado: ${money(totals.importeEjecutado)}`}
          />
        </section>

        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 shadow-sm">
          <div className="grid min-w-[1260px] grid-cols-7 gap-2">
            {loadingIslas ? (
              <div className="col-span-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                Cargando resumen por islas...
              </div>
            ) : null}

            {!loadingIslas
              ? islas.map((row) => (
                  <IslaCard
                    key={clean(row.isla)}
                    row={row}
                    selected={filtroIsla === clean(row.isla)}
                    onSelect={seleccionarIsla}
                  />
                ))
              : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Isla o municipio..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Isla
              </label>
              <select
                value={filtroIsla}
                onChange={(event) => {
                  setFiltroIsla(event.target.value);
                  setFiltroMunicipio("todos");
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                <option value="todas">Todas</option>
                {islas.map((row) => (
                  <option key={clean(row.isla)} value={clean(row.isla)}>
                    {clean(row.isla)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Municipio
              </label>
              <select
                value={filtroMunicipio}
                onChange={(event) => setFiltroMunicipio(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                <option value="todos">Todos</option>
                {municipiosDisponibles.map((municipio) => (
                  <option key={municipio} value={municipio}>
                    {municipio}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(event) => setFiltroTipo(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                <option value="todos">Todos</option>
                <option value="AF">AF</option>
                <option value="CP">CP</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-blue-400"
              >
                <option value="todos">Todos</option>
                <option value="finalizadas">Finalizadas</option>
                <option value="en_ejecucion">En ejecución</option>
                <option value="pendientes">Pendientes</option>
              </select>
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
                Municipios y estado de ejecución
              </h2>
              <p className="text-[10.5px] leading-4 text-slate-500">
                Resultado filtrado: {num(municipiosFiltrados.length)} municipios. Vista de cobertura territorial de AF/CP.
              </p>
            </div>

            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-700">
              {num(totals.acciones)} acciones · {num(totals.pendientes)} pendientes
            </div>
          </div>

          {loadingMunicipios ? (
            <div className="px-4 py-4 text-sm text-slate-600">
              Cargando municipios...
            </div>
          ) : null}

          {!loadingMunicipios && municipiosFiltrados.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">
              No hay municipios con los filtros actuales.
            </div>
          ) : null}

          {!loadingMunicipios && municipiosFiltrados.length > 0 ? (
            <div className="space-y-1.5 bg-slate-50 px-3 py-2">
              {municipiosFiltrados.map((row) => (
                <MunicipioCard
                  key={`${clean(row.isla)}-${clean(row.municipio)}`}
                  row={row}
                />
              ))}
            </div>
          ) : null}
        </section>
      </section>

      <span className="hidden">{VERSION_DISTRIBUCION_TERRITORIAL}</span>
    </main>
  );
}