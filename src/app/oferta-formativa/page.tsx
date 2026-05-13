"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type OfertaRow = Record<string, any>;

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

type FinalizacionFiltro =
  | "todas"
  | "vencidas"
  | "proximos_7"
  | "proximos_15"
  | "proximos_30";

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

function text(row: OfertaRow, keys: string[], fallback = "—") {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function numberValue(row: OfertaRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return 0;
}

function normalizar(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function fechaValue(row: OfertaRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      const fecha = new Date(`${String(value).slice(0, 10)}T00:00:00`);

      if (!Number.isNaN(fecha.getTime())) {
        return fecha;
      }
    }
  }

  return null;
}

function fechaCorta(row: OfertaRow, keys: string[]) {
  const fecha = fechaValue(row, keys);

  if (!fecha) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(fecha);
}

function hoySinHora() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}

function diasEntre(fecha: Date, referencia: Date) {
  const msDia = 24 * 60 * 60 * 1000;
  return Math.floor((fecha.getTime() - referencia.getTime()) / msDia);
}

function estadoLabel(estado: string | null | undefined) {
  const normalizado = normalizar(estado);

  if (normalizado === "en_ejecucion") return "En ejecución";
  if (normalizado === "finalizada") return "Finalizada";
  if (normalizado === "pendiente_ejecutar") return "Pendiente de ejecutar";
  if (normalizado === "en_ejecucion_con_incidencia") return "Revisión/Riesgo";
  if (normalizado === "riesgo_reintegro") return "Revisión/Riesgo";
  if (normalizado === "finalizada_pendiente_justificacion") return "Finalizada";
  if (!normalizado) return "Sin estado";

  return String(estado ?? "Sin estado").replaceAll("_", " ");
}

function estadoClass(estado: string) {
  const normalizado = estado.toLowerCase();

  if (normalizado.includes("riesgo") || normalizado.includes("incidencia")) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (normalizado.includes("pendiente")) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (normalizado.includes("finalizada") || normalizado.includes("justificacion")) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (normalizado.includes("ejecucion")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function estadoFiltroLabel(estado: string) {
  return estadoLabel(estado);
}

function estadoParaFiltro(row: OfertaRow) {
  return text(
    row,
    ["estado_operativo_administrativo", "estado_operativo", "estado_ejecucion", "estado"],
    ""
  );
}

async function cargarTodasLasAcciones() {
  const pageSize = 1000;
  let from = 0;
  let allRows: OfertaRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("v_oferta_formativa_institucional")
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const bloque = (data ?? []) as OfertaRow[];
    allRows = [...allRows, ...bloque];

    if (bloque.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

function Kpi({
  label,
  value,
  detail,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "blue" | "green" | "amber" | "red" | "slate" | "violet";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200 hover:border-red-400"
      : tone === "amber"
        ? "border-amber-200 hover:border-amber-400"
        : tone === "green"
          ? "border-emerald-200 hover:border-emerald-400"
          : tone === "blue"
            ? "border-blue-200 hover:border-blue-400"
            : tone === "slate"
              ? "border-slate-200 hover:border-slate-400"
              : tone === "violet"
                ? "border-violet-200 hover:border-violet-400"
                : "border-slate-200 hover:border-blue-300";

  const valueClass =
    tone === "red"
      ? "text-red-800"
      : tone === "amber"
        ? "text-amber-800"
        : tone === "green"
          ? "text-emerald-800"
          : tone === "blue"
            ? "text-blue-800"
            : tone === "violet"
              ? "text-violet-800"
              : "text-slate-950";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[62px] rounded-xl border bg-white px-3 py-1.5 text-left shadow-sm transition ${toneClass}`}
    >
      <p className="truncate text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 truncate text-[15px] font-semibold leading-5 ${valueClass}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">{detail}</p>
    </button>
  );
}

export default function OfertaFormativaPage() {
  const router = useRouter();

  const [rows, setRows] = useState<OfertaRow[]>([]);
  const [resumen, setResumen] = useState<OfertaResumen | null>(null);
  const [entidadFiltro, setEntidadFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [finalizacionFiltro, setFinalizacionFiltro] =
    useState<FinalizacionFiltro>("todas");
  const [soloRequerimientos, setSoloRequerimientos] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Cargando oferta formativa concedida...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function loadOferta() {
      setLoading(true);
      setError(null);
      setLoadingMsg("Cargando resumen institucional...");

      try {
        const resumenPromise = supabase
          .from("v_oferta_formativa_resumen_institucional")
          .select("*")
          .single();

        setLoadingMsg("Cargando acciones concedidas...");

        const [rowsData, resumenRes] = await Promise.all([
          cargarTodasLasAcciones(),
          resumenPromise,
        ]);

        if (!activo) return;

        if (resumenRes.error) {
          setError(resumenRes.error.message);
          setLoading(false);
          return;
        }

        setRows(rowsData);
        setResumen(resumenRes.data as OfertaResumen);
        setLoading(false);
      } catch (err: any) {
        if (!activo) return;

        setError(err?.message ?? "No se pudo cargar la oferta formativa institucional.");
        setLoading(false);
      }
    }

    loadOferta();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const estado = params.get("estado");
    const entidad = params.get("entidad");
    const tipo = params.get("tipo");
    const requerimientos = params.get("requerimientos");
    const finalizacion = params.get("finalizacion") as FinalizacionFiltro | null;

    if (estado) setEstadoFiltro(estado);
    if (entidad) setEntidadFiltro(entidad);
    if (tipo) setTipoFiltro(tipo.toUpperCase());
    if (
      finalizacion === "vencidas" ||
      finalizacion === "proximos_7" ||
      finalizacion === "proximos_15" ||
      finalizacion === "proximos_30"
    ) {
      setFinalizacionFiltro(finalizacion);
    }
    if (requerimientos === "1" || requerimientos === "true") setSoloRequerimientos(true);
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [
    entidadFiltro,
    estadoFiltro,
    tipoFiltro,
    finalizacionFiltro,
    soloRequerimientos,
    busqueda,
    pageSize,
  ]);

  const entidades = useMemo(() => {
    const mapa = new Map<string, string>();

    rows.forEach((row) => {
      const id = text(row, ["entidad_id"], "");
      const nombre = text(row, ["entidad_nombre", "entidad", "nombre_entidad"], "");

      if (id && nombre) {
        mapa.set(id, nombre);
      }
    });

    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [rows]);

  const estados = useMemo(() => {
    const set = new Set<string>();

    rows.forEach((row) => {
      const estado = estadoParaFiltro(row);

      if (estado) {
        set.add(estado);
      }
    });

    return Array.from(set).sort((a, b) =>
      estadoFiltroLabel(a).localeCompare(estadoFiltroLabel(b), "es")
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    const hoy = hoySinHora();

    return rows.filter((row) => {
      const entidadId = text(row, ["entidad_id"], "");
      const estado = estadoParaFiltro(row);
      const tipo = text(row, ["tipo_oferta", "tipo", "tipo_accion"], "").toUpperCase();
      const requerimientosPendientes = numberValue(row, ["requerimientos_pendientes"]);
      const finValidada = fechaValue(row, ["fecha_fin_validada"]);

      const textoBusqueda = [
        text(row, ["entidad_nombre", "entidad", "nombre_entidad"], ""),
        text(row, ["cif"], ""),
        text(row, ["codigo_accion", "codigo_administrativo"], ""),
        text(row, ["codigo_especialidad", "especialidad"], ""),
        text(row, ["denominacion", "nombre_accion", "nombre"], ""),
        text(row, ["familia_profesional", "familia"], ""),
        text(row, ["municipio", "entidad_municipio"], ""),
        text(row, ["isla", "entidad_isla"], ""),
        estadoLabel(estado),
        fechaCorta(row, ["fecha_fin_prevista"]),
        fechaCorta(row, ["fecha_fin_validada"]),
      ]
        .join(" ")
        .toLowerCase();

      const pasaEntidad = entidadFiltro === "todos" || entidadId === entidadFiltro;
      const pasaEstado = estadoFiltro === "todos" || estado === estadoFiltro;
      const pasaTipo = tipoFiltro === "todos" || tipo === tipoFiltro;
      const pasaRequerimientos = !soloRequerimientos || requerimientosPendientes > 0;
      const pasaBusqueda = term === "" || textoBusqueda.includes(term);

      let pasaFinalizacion = true;

      if (finalizacionFiltro !== "todas") {
        if (!finValidada) {
          pasaFinalizacion = false;
        } else {
          const dias = diasEntre(finValidada, hoy);

          if (finalizacionFiltro === "vencidas") {
            pasaFinalizacion = dias < 0;
          }

          if (finalizacionFiltro === "proximos_7") {
            pasaFinalizacion = dias >= 0 && dias <= 7;
          }

          if (finalizacionFiltro === "proximos_15") {
            pasaFinalizacion = dias >= 0 && dias <= 15;
          }

          if (finalizacionFiltro === "proximos_30") {
            pasaFinalizacion = dias >= 0 && dias <= 30;
          }
        }
      }

      return (
        pasaEntidad &&
        pasaEstado &&
        pasaTipo &&
        pasaFinalizacion &&
        pasaRequerimientos &&
        pasaBusqueda
      );
    });
  }, [
    rows,
    entidadFiltro,
    estadoFiltro,
    tipoFiltro,
    finalizacionFiltro,
    soloRequerimientos,
    busqueda,
  ]);

  const totalPaginas = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * pageSize;
  const fin = inicio + pageSize;
  const rowsPagina = filteredRows.slice(inicio, fin);

  const revisionRiesgoAcciones =
    Number(resumen?.en_ejecucion_con_incidencia ?? 0) + Number(resumen?.riesgo_reintegro ?? 0);

  function limpiarFiltros() {
    setEntidadFiltro("todos");
    setEstadoFiltro("todos");
    setTipoFiltro("todos");
    setFinalizacionFiltro("todas");
    setSoloRequerimientos(false);
    setBusqueda("");
    setPagina(1);
  }

  function abrirSubexpediente(row: OfertaRow) {
    const id = text(row, ["oferta_id", "id"], "");

    if (id) {
      router.push(`/subexpedientes-accion/${id}`);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">{loadingMsg}</p>
        </section>
      </main>
    );
  }

  if (error || !resumen) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error cargando oferta formativa institucional
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se pudo cargar la información."}
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

            <h1 className="mt-1 text-xl font-semibold">Oferta formativa concedida</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Mesa operativa de subexpedientes AF/CP concedidos, estados, fechas de control y seguimiento administrativo.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filteredRows.length)} acciones visibles · {num(rows.length)} total cargado
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-2 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            ← Volver al dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/oferta-formativa/nueva"
              className="rounded-full border border-blue-700 bg-blue-700 px-3 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              + Nueva acción
            </Link>

            {soloRequerimientos ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-800 shadow-sm">
                Filtro activo: requerimientos pendientes
              </span>
            ) : null}

            {finalizacionFiltro !== "todas" ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 shadow-sm">
                Filtro activo: finalización validada
              </span>
            ) : null}

            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm">
              Clic en una fila para abrir subexpediente
            </span>
          </div>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi
            label="Total acciones"
            value={num(resumen.acciones_total)}
            detail={`${num(resumen.acciones_af)} AF · ${num(resumen.acciones_cp)} CP`}
            onClick={limpiarFiltros}
            tone="violet"
          />

          <Kpi
            label="En ejecución"
            value={num(resumen.en_ejecucion)}
            detail="acciones en ejecución ordinaria"
            tone="green"
            onClick={() => {
              setSoloRequerimientos(false);
              setEstadoFiltro("en_ejecucion");
            }}
          />

          <Kpi
            label="Finalizadas"
            value={num(resumen.finalizadas_total)}
            detail="acciones finalizadas"
            tone="slate"
            onClick={() => {
              setSoloRequerimientos(false);
              setEstadoFiltro("finalizada");
            }}
          />

          <Kpi
            label="Pendientes"
            value={num(resumen.pendientes_ejecutar)}
            detail={euro(resumen.importe_pendiente_ejecutar)}
            tone="blue"
            onClick={() => {
              setSoloRequerimientos(false);
              setEstadoFiltro("pendiente_ejecutar");
            }}
          />

          <Kpi
            label="Revisión/Riesgo"
            value={num(revisionRiesgoAcciones)}
            detail={euro(resumen.importe_en_riesgo_total)}
            tone="red"
            onClick={() => {
              setSoloRequerimientos(false);
              if (revisionRiesgoAcciones > 0) {
                setEstadoFiltro("riesgo_reintegro");
              } else {
                setEstadoFiltro("todos");
              }
            }}
          />

          <Kpi
            label="Requerimientos"
            value={num(resumen.requerimientos_pendientes)}
            detail="pendientes según lectura backend"
            tone="red"
            onClick={() => {
              setEstadoFiltro("todos");
              setSoloRequerimientos(true);
            }}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.2fr_0.9fr_0.65fr_0.5fr_0.7fr_auto_auto]">
            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, código, especialidad, denominación..."
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad beneficiaria
              </label>
              <select
                value={entidadFiltro}
                onChange={(event) => setEntidadFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todas las entidades</option>
                {entidades.map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </label>
              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estadoFiltroLabel(estado)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Tipo
              </label>
              <select
                value={tipoFiltro}
                onChange={(event) => setTipoFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                <option value="AF">AF</option>
                <option value="CP">CP</option>
              </select>
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Fin validada
              </label>
              <select
                value={finalizacionFiltro}
                onChange={(event) => setFinalizacionFiltro(event.target.value as FinalizacionFiltro)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todas">Todas</option>
                <option value="vencidas">Vencidas</option>
                <option value="proximos_7">Próx. 7 días</option>
                <option value="proximos_15">Próx. 15 días</option>
                <option value="proximos_30">Próx. 30 días</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setSoloRequerimientos((prev) => !prev)}
                className={
                  soloRequerimientos
                    ? "h-7 rounded-lg border border-red-200 bg-red-50 px-2 text-[10px] font-semibold text-red-800 hover:bg-red-100"
                    : "h-7 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                }
              >
                Requerimientos
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-xs">
            <p className="font-semibold text-slate-700">
              {num(filteredRows.length)} acciones encontradas
            </p>

            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span>
                Página {paginaSegura} de {totalPaginas}
              </span>

              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[10px] outline-none focus:border-blue-400"
              >
                <option value={25}>25 filas</option>
                <option value={50}>50 filas</option>
                <option value={100}>100 filas</option>
              </select>

              <button
                type="button"
                disabled={paginaSegura <= 1}
                onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={paginaSegura >= totalPaginas}
                onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="max-h-[590px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[9.5px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Código</th>
                  <th className="px-2 py-1.5">Entidad</th>
                  <th className="px-2 py-1.5">Tipo</th>
                  <th className="px-2 py-1.5">Especialidad</th>
                  <th className="px-2 py-1.5">Denominación</th>
                  <th className="px-2 py-1.5">Estado</th>
                  <th className="px-2 py-1.5">Fin prevista</th>
                  <th className="px-2 py-1.5">Fin validada</th>
                  <th className="px-2 py-1.5 text-right">Concedido</th>
                  <th className="px-2 py-1.5 text-right">Rev./Riesgo</th>
                  <th className="px-2 py-1.5 text-right">Inc.</th>
                  <th className="px-2 py-1.5 text-right">Req.</th>
                </tr>
              </thead>

              <tbody>
                {rowsPagina.map((row, index) => {
                  const estado = estadoParaFiltro(row);
                  const estadoVisible = estadoLabel(estado);
                  const ofertaId = text(row, ["oferta_id", "id"], String(index));

                  return (
                    <tr
                      key={`${ofertaId}-${index}`}
                      onClick={() => abrirSubexpediente(row)}
                      className="cursor-pointer border-t border-slate-100 hover:bg-blue-50"
                    >
                      <td className="px-2 py-1 font-semibold text-slate-950">
                        {text(row, ["codigo_accion", "codigo_administrativo"])}
                      </td>

                      <td className="px-2 py-1">
                        <p className="font-medium leading-4 text-slate-900">
                          {text(row, ["entidad_nombre", "entidad", "nombre_entidad"])}
                        </p>
                        <p className="text-[10px] leading-4 text-slate-500">{text(row, ["cif"])}</p>
                      </td>

                      <td className="px-2 py-1">
                        {text(row, ["tipo_oferta", "tipo", "tipo_accion"])}
                      </td>

                      <td className="px-2 py-1 font-medium">
                        {text(row, ["codigo_especialidad", "especialidad"])}
                      </td>

                      <td className="max-w-[260px] px-2 py-1">
                        <p className="line-clamp-1 text-slate-700">
                          {text(row, ["denominacion", "nombre_accion", "nombre"])}
                        </p>
                      </td>

                      <td className="px-2 py-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${estadoClass(estado)}`}>
                          {estadoVisible}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-2 py-1 text-slate-600">
                        {fechaCorta(row, ["fecha_fin_prevista"])}
                      </td>

                      <td className="whitespace-nowrap px-2 py-1 font-semibold text-slate-800">
                        {fechaCorta(row, ["fecha_fin_validada"])}
                      </td>

                      <td className="px-2 py-1 text-right font-medium">
                        {euro(numberValue(row, ["importe_concedido", "importe_total_concedido"]))}
                      </td>

                      <td className="px-2 py-1 text-right font-medium text-red-700">
                        {euro(numberValue(row, ["importe_en_riesgo", "riesgo_economico"]))}
                      </td>

                      <td className="px-2 py-1 text-right">
                        {num(numberValue(row, ["incidencias_abiertas"]))}
                      </td>

                      <td className="px-2 py-1 text-right">
                        {num(numberValue(row, ["requerimientos_pendientes"]))}
                      </td>
                    </tr>
                  );
                })}

                {rowsPagina.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay acciones que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}