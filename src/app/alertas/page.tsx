"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type AlertaTipificada = {
  oferta_id: number;
  convocatoria_id: number;
  convocatoria_codigo: string;
  entidad_id: number;
  entidad_nombre: string;
  cif: string;
  codigo_accion: string;
  tipo_oferta: string;
  codigo_especialidad: string;
  denominacion: string;
  importe_concedido: number;
  importe_ejecutado: number;
  importe_en_riesgo: number;
  estado_ejecucion: string;
  alumnos_inicio: number;
  alumnos_activos: number;
  bajas: number;
  aptos: number;
  alerta: string;
  nivel_riesgo: string;
  regla_alerta_aplicada: string | null;
  fuente_resolucion: string | null;
  tipo_dato_resolucion: string | null;
  confianza_resolucion: string | null;
  fuente_ejecucion: string | null;
  tipo_dato_ejecucion: string | null;
  confianza_ejecucion: string | null;
  escenario_demo: string;
  tipologia_codigo: string;
  tipologia_nombre: string;
  tipologia_descripcion: string;
  tipologia_nivel_base: string;
  tipologia_lectura_institucional: string;
  nivel_aplicado: string;
  descripcion_caso: string;
  evidencia_requerida: string;
  estado_revision: string;
  tipologia_fuente_dato: string;
  tipologia_tipo_dato: string;
};

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
  pendientes_ejecutar: number;
  en_ejecucion: number;
  en_ejecucion_con_incidencia: number;
  finalizadas_total: number;
  riesgo_reintegro: number;
  importe_concedido_total: number;
  importe_revision_riesgo_concedido: number;
  incidencias_abiertas: number;
  requerimientos_pendientes: number;
  entidades_con_incidencias_o_riesgo: number;
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

function pct(part: number | null | undefined, total: number | null | undefined) {
  const p = Number(part ?? 0);
  const t = Number(total ?? 0);
  if (!t) return "—";

  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1,
  }).format((p / t) * 100)} %`;
}

function normalize(value: string | number | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function isRegularizada(row: AlertaTipificada) {
  return normalize(row.estado_revision) === "regularizada";
}

function badgeClass(value: string | null | undefined) {
  const normalizado = normalize(value);

  if (
    normalizado.includes("alto") ||
    normalizado.includes("alta") ||
    normalizado.includes("anticipado") ||
    normalizado.includes("suplant")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    normalizado.includes("medio") ||
    normalizado.includes("media") ||
    normalizado.includes("discrepancia")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalizado.includes("bajo") || normalizado.includes("baja")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function estadoRevisionBadgeClass(value: string | null | undefined) {
  const estado = normalize(value);

  if (estado === "pendiente_revision") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (estado === "pendiente_subsanacion") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (estado === "regularizada") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function estadoRevisionLabel(value: string | null | undefined) {
  const estado = normalize(value);

  if (estado === "pendiente_revision") return "Pendiente revisión";
  if (estado === "pendiente_subsanacion") return "Pendiente subsanación";
  if (estado === "regularizada") return "Regularizada";

  return value || "Sin estado";
}

function importeAfectadoLabel(value: number | null | undefined) {
  const importe = Number(value ?? 0);
  if (importe <= 0) return "Sin importe cuantificado";
  return euro(importe);
}

function Kpi({
  label,
  value,
  detail,
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const cardClass = active
    ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
    : "border-slate-200 bg-white hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2 text-left shadow-sm transition ${cardClass}`}
    >
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-lg font-semibold leading-6 text-slate-950">
        {value}
      </p>
      <p className="truncate text-[10px] text-slate-500">{detail}</p>
    </button>
  );
}

function StatusCard({
  label,
  value,
  detail,
  tone = "slate",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "slate" | "green" | "red" | "amber" | "blue";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-900"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : tone === "blue"
            ? "border-blue-200 bg-blue-50 text-blue-900"
            : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-xl border px-3 py-2 shadow-sm ${toneClass}`}>
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-0.5 truncate text-lg font-black leading-6">{value}</p>
      <p className="truncate text-[10px] opacity-75">{detail}</p>
    </div>
  );
}

function AlertasPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const entidadIdParam = searchParams.get("entidadId");
  const cifParam = searchParams.get("cif");
  const entidadParam = searchParams.get("entidad");

  const entidadIdInicial = entidadIdParam ? Number(entidadIdParam) : null;
  const cifInicial = cifParam ?? "";
  const entidadInicial = entidadParam ?? "";

  const filtroEntidadActivo =
    Boolean(entidadIdInicial) || Boolean(cifInicial) || Boolean(entidadInicial);

  const [alertas, setAlertas] = useState<AlertaTipificada[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [ofertaResumen, setOfertaResumen] = useState<OfertaResumen | null>(null);
  const [documentacionResumen, setDocumentacionResumen] =
    useState<DocumentacionResumen | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [tipologiaFiltro, setTipologiaFiltro] = useState("todos");
  const [nivelFiltro, setNivelFiltro] = useState("todos");
  const [soloDocumentales, setSoloDocumentales] = useState(false);
  const [mostrarRegularizadas, setMostrarRegularizadas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlertas() {
      setLoading(true);
      setError(null);

      const [alertasRes, resumenRes, ofertaRes, documentacionRes] = await Promise.all([
        supabase
          .from("v_alertas_institucionales_tipificadas")
          .select("*")
          .order("importe_en_riesgo", { ascending: false }),
        supabase.from("v_fiscalizacion_resumen").select("*").single(),
        supabase.from("v_oferta_formativa_resumen_institucional").select("*").single(),
        supabase.from("v_recepcion_documentacion_resumen").select("*").single(),
      ]);

      const firstError =
        alertasRes.error || resumenRes.error || ofertaRes.error || documentacionRes.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setAlertas((alertasRes.data ?? []) as AlertaTipificada[]);
      setResumen(resumenRes.data as Resumen);
      setOfertaResumen(ofertaRes.data as OfertaResumen);
      setDocumentacionResumen(documentacionRes.data as DocumentacionResumen);
      setLoading(false);
    }

    loadAlertas();
  }, []);

  const revisionRiesgoAcciones = useMemo(() => {
    if (!ofertaResumen) return 0;
    return (
      Number(ofertaResumen.en_ejecucion_con_incidencia ?? 0) +
      Number(ofertaResumen.riesgo_reintegro ?? 0)
    );
  }, [ofertaResumen]);

  const alertasEntidadTodas = useMemo(() => {
    if (!filtroEntidadActivo) return alertas;

    return alertas.filter((row) => {
      const pasaEntidadId =
        entidadIdInicial !== null && Number(row.entidad_id) === Number(entidadIdInicial);

      const pasaCif =
        normalize(cifInicial) !== "" && normalize(row.cif) === normalize(cifInicial);

      const pasaNombre =
        normalize(entidadInicial) !== "" &&
        normalize(row.entidad_nombre) === normalize(entidadInicial);

      return pasaEntidadId || pasaCif || pasaNombre;
    });
  }, [alertas, filtroEntidadActivo, entidadIdInicial, cifInicial, entidadInicial]);

  const alertasActivas = useMemo(() => {
    return alertasEntidadTodas.filter((row) => !isRegularizada(row));
  }, [alertasEntidadTodas]);

  const alertasRegularizadas = useMemo(() => {
    return alertasEntidadTodas.filter((row) => isRegularizada(row));
  }, [alertasEntidadTodas]);

  const totalRegularizadas = alertasRegularizadas.length;
  const totalActivas = alertasActivas.length;

  const tipologias = useMemo(() => {
    const mapa = new Map<string, string>();

    alertasRegularizadas.forEach((row) => {
      mapa.set(row.tipologia_codigo, row.tipologia_nombre);
    });

    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [alertasRegularizadas]);

  const niveles = useMemo(() => {
    const set = new Set<string>();

    alertasRegularizadas.forEach((row) => set.add(row.nivel_aplicado));

    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [alertasRegularizadas]);

  const regularizadasFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return alertasRegularizadas.filter((row) => {
      const texto = [
        row.entidad_nombre,
        row.cif,
        row.codigo_accion,
        row.codigo_especialidad,
        row.denominacion,
        row.tipologia_nombre,
        row.descripcion_caso,
        row.evidencia_requerida,
        row.estado_revision,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaTipologia =
        tipologiaFiltro === "todos" || row.tipologia_codigo === tipologiaFiltro;
      const pasaNivel = nivelFiltro === "todos" || row.nivel_aplicado === nivelFiltro;
      const pasaDocumental = !soloDocumentales || row.tipologia_codigo?.startsWith("FALTA_");

      return pasaBusqueda && pasaTipologia && pasaNivel && pasaDocumental;
    });
  }, [alertasRegularizadas, busqueda, tipologiaFiltro, nivelFiltro, soloDocumentales]);

  const resumenRegularizadas = useMemo(() => {
    return regularizadasFiltradas.reduce(
      (acc, row) => {
        acc.importeAfectado += Number(row.importe_en_riesgo ?? 0);
        acc.altas += row.nivel_aplicado === "alto" ? 1 : 0;
        acc.medias += row.nivel_aplicado === "medio" ? 1 : 0;
        acc.bajasNivel += row.nivel_aplicado === "bajo" ? 1 : 0;
        acc.documentales += row.tipologia_codigo?.startsWith("FALTA_") ? 1 : 0;

        if (row.tipologia_codigo === "PAGOS_ANTICIPADOS") acc.pagos++;
        if (row.tipologia_codigo === "DISCREPANCIAS_FORMACION") acc.discrepancias++;
        if (row.tipologia_codigo === "SUPLANTACION_ALUMNOS") acc.suplantacion++;

        return acc;
      },
      {
        importeAfectado: 0,
        altas: 0,
        medias: 0,
        bajasNivel: 0,
        documentales: 0,
        pagos: 0,
        discrepancias: 0,
        suplantacion: 0,
      }
    );
  }, [regularizadasFiltradas]);

  function limpiarFiltros() {
    setBusqueda("");
    setTipologiaFiltro("todos");
    setNivelFiltro("todos");
    setSoloDocumentales(false);
  }

  function filtrarTodasRegularizadas() {
    setBusqueda("");
    setTipologiaFiltro("todos");
    setNivelFiltro("todos");
    setSoloDocumentales(false);
  }

  function filtrarNivel(nivel: string) {
    setNivelFiltro(nivel);
    setTipologiaFiltro("todos");
    setSoloDocumentales(false);
  }

  function filtrarDocumentales() {
    setNivelFiltro("todos");
    setTipologiaFiltro("todos");
    setSoloDocumentales(true);
  }

  function filtrarTipologia(codigo: string) {
    setNivelFiltro("todos");
    setTipologiaFiltro(codigo);
    setSoloDocumentales(false);
  }

  function toggleRegularizadas() {
    limpiarFiltros();
    setMostrarRegularizadas((prev) => !prev);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando alertas institucionales...</p>
        </section>
      </main>
    );
  }

  if (error || !resumen || !ofertaResumen || !documentacionResumen) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error cargando alertas institucionales
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se pudo cargar la información de alertas."}
          </pre>
        </section>
      </main>
    );
  }

  const tieneAlertasActivas =
    totalActivas > 0 ||
    revisionRiesgoAcciones > 0 ||
    Number(ofertaResumen.requerimientos_pendientes ?? 0) > 0 ||
    Number(ofertaResumen.incidencias_abiertas ?? 0) > 0 ||
    Number(resumen.alertas_altas ?? 0) > 0 ||
    Number(resumen.alertas_medias ?? 0) > 0 ||
    Number(documentacionResumen.riesgo_activo_alto_critico ?? 0) > 0 ||
    Number(ofertaResumen.importe_revision_riesgo_concedido ?? 0) > 0;

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold">
              Alertas y revisión institucional
            </h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Control de alertas activas, requerimientos, incidencias, riesgo documental y registros regularizados.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(totalActivas)} activas · {num(totalRegularizadas)} regularizadas ·{" "}
            {num(ofertaResumen.requerimientos_pendientes)} requerimientos
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-blue-800 hover:text-blue-950"
          >
            ← Volver al dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/alertas/nueva"
              className="rounded-full border border-blue-200 bg-blue-700 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-800"
            >
              + Registrar alerta / revisión
            </Link>

            <button
              type="button"
              onClick={toggleRegularizadas}
              className={
                mostrarRegularizadas
                  ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100"
                  : "rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
              }
            >
              {mostrarRegularizadas
                ? "Ocultar alertas regularizadas"
                : `Ver alertas regularizadas (${num(totalRegularizadas)})`}
            </button>
          </div>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <StatusCard
            label="Alertas activas"
            value={num(totalActivas)}
            detail="pendientes de revisión/subsanación"
            tone={totalActivas > 0 ? "red" : "green"}
          />

          <StatusCard
            label="Rev./Riesgo"
            value={num(revisionRiesgoAcciones)}
            detail={`${euro(ofertaResumen.importe_revision_riesgo_concedido)} revisión/riesgo`}
            tone={revisionRiesgoAcciones > 0 ? "red" : "green"}
          />

          <StatusCard
            label="Requerimientos"
            value={num(ofertaResumen.requerimientos_pendientes)}
            detail="pendientes según vista operativa"
            tone={ofertaResumen.requerimientos_pendientes > 0 ? "amber" : "green"}
          />

          <StatusCard
            label="Incidencias"
            value={num(ofertaResumen.incidencias_abiertas)}
            detail="incidencias abiertas"
            tone={ofertaResumen.incidencias_abiertas > 0 ? "amber" : "green"}
          />

          <StatusCard
            label="Riesgo documental"
            value={num(documentacionResumen.riesgo_activo_alto_critico)}
            detail={`${num(documentacionResumen.no_recibidos)} sin recibir`}
            tone={documentacionResumen.riesgo_activo_alto_critico > 0 ? "red" : "green"}
          />

          <StatusCard
            label="Regularizadas"
            value={num(totalRegularizadas)}
            detail="registros cerrados/regularizados"
            tone="blue"
          />
        </section>

        {!tieneAlertasActivas ? (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 shadow-sm">
            No hay alertas activas pendientes en la lectura institucional actual. Los registros regularizados
            quedan disponibles como consulta de control y trazabilidad técnica.
          </section>
        ) : (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 shadow-sm">
            Existen indicadores activos de revisión o riesgo. Revise los módulos enlazados desde el
            dashboard y la bandeja de alertas activas.
          </section>
        )}

        {filtroEntidadActivo ? (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-950 shadow-sm">
            <div>
              <p className="font-semibold">Filtro activo por entidad beneficiaria</p>
              <p className="mt-0.5">
                {entidadInicial || "Entidad seleccionada"}
                {cifInicial ? ` · ${cifInicial}` : ""}
              </p>
            </div>

            <Link
              href="/alertas"
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-50"
            >
              Ver lectura global de alertas
            </Link>
          </section>
        ) : null}

        {mostrarRegularizadas ? (
          <>
            <section className="grid gap-2 lg:grid-cols-7">
              <Kpi
                label="Regularizadas"
                value={num(regularizadasFiltradas.length)}
                detail="registros de control"
                active={
                  tipologiaFiltro === "todos" &&
                  nivelFiltro === "todos" &&
                  !soloDocumentales &&
                  busqueda.trim() === ""
                }
                onClick={filtrarTodasRegularizadas}
              />

              <Kpi
                label="Prioridad original alta"
                value={num(resumenRegularizadas.altas)}
                detail="regularizadas"
                active={nivelFiltro === "alto"}
                onClick={() => filtrarNivel("alto")}
              />

              <Kpi
                label="Prioridad original media"
                value={num(resumenRegularizadas.medias)}
                detail="regularizadas"
                active={nivelFiltro === "medio"}
                onClick={() => filtrarNivel("medio")}
              />

              <Kpi
                label="Documentales regularizadas"
                value={num(resumenRegularizadas.documentales)}
                detail="registros documentales"
                active={soloDocumentales}
                onClick={filtrarDocumentales}
              />

              <Kpi
                label="Pagos regularizados"
                value={num(resumenRegularizadas.pagos)}
                detail="control económico"
                active={tipologiaFiltro === "PAGOS_ANTICIPADOS"}
                onClick={() => filtrarTipologia("PAGOS_ANTICIPADOS")}
              />

              <Kpi
                label="Discrepancias regularizadas"
                value={num(resumenRegularizadas.discrepancias)}
                detail="control formativo"
                active={tipologiaFiltro === "DISCREPANCIAS_FORMACION"}
                onClick={() => filtrarTipologia("DISCREPANCIAS_FORMACION")}
              />

              <Kpi
                label="Identidad regularizada"
                value={num(resumenRegularizadas.suplantacion)}
                detail="alumnado/trabajadores"
                active={tipologiaFiltro === "SUPLANTACION_ALUMNOS"}
                onClick={() => filtrarTipologia("SUPLANTACION_ALUMNOS")}
              />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="grid gap-2 lg:grid-cols-[1.25fr_0.85fr_0.65fr_auto]">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Buscar
                  </label>
                  <input
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    placeholder="Entidad, CIF, acción, especialidad, caso, evidencia..."
                    className="mt-1 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Tipología
                  </label>
                  <select
                    value={tipologiaFiltro}
                    onChange={(event) => {
                      setTipologiaFiltro(event.target.value);
                      setSoloDocumentales(false);
                    }}
                    className="mt-1 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
                  >
                    <option value="todos">Todas</option>
                    {tipologias.map(([codigo, nombre]) => (
                      <option key={codigo} value={codigo}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Nivel
                  </label>
                  <select
                    value={nivelFiltro}
                    onChange={(event) => setNivelFiltro(event.target.value)}
                    className="mt-1 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
                  >
                    <option value="todos">Todos</option>
                    {niveles.map((nivel) => (
                      <option key={nivel} value={nivel}>
                        {nivel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-3 py-2">
                <h2 className="text-sm font-semibold">
                  Alertas regularizadas
                </h2>
                <p className="text-[11px] text-slate-500">
                  Registros ya cerrados. Se conservan para control, contraste y trazabilidad del subexpediente.
                </p>
              </div>

              <div className="max-h-[610px] overflow-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-2 py-2">Prioridad original</th>
                      <th className="px-2 py-2">Tipología</th>
                      <th className="px-2 py-2">Entidad / acción</th>
                      <th className="px-2 py-2">Caso registrado</th>
                      <th className="px-2 py-2">Evidencia asociada</th>
                      <th className="px-2 py-2 text-right">Importe afectado</th>
                      <th className="px-2 py-2 text-right">Bajas</th>
                      <th className="px-2 py-2">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {regularizadasFiltradas.map((row) => (
                      <tr
                        key={`${row.oferta_id}-${row.tipologia_codigo}-${row.estado_revision}`}
                        onClick={() =>
                          router.push(
                            `/subexpedientes-accion/${row.oferta_id}?tipologia=${encodeURIComponent(
                              row.tipologia_codigo
                            )}`
                          )
                        }
                        className="cursor-pointer border-t border-slate-100 hover:bg-blue-50"
                      >
                        <td className="px-2 py-1.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(
                              row.nivel_aplicado
                            )}`}
                          >
                            {row.nivel_aplicado}
                          </span>
                        </td>

                        <td className="px-2 py-1.5">
                          <p className="font-semibold text-slate-950">{row.tipologia_nombre}</p>
                          <p className="text-[10px] text-slate-500">{row.tipologia_codigo}</p>
                        </td>

                        <td className="px-2 py-1.5">
                          <p className="font-semibold text-slate-950">{row.entidad_nombre}</p>
                          <p className="text-[10px] text-slate-500">
                            {row.codigo_accion} · {row.tipo_oferta} · {row.codigo_especialidad}
                          </p>
                        </td>

                        <td className="max-w-[250px] px-2 py-1.5">
                          <p className="line-clamp-3">{row.descripcion_caso}</p>
                        </td>

                        <td className="max-w-[260px] px-2 py-1.5">
                          <p className="line-clamp-3">{row.evidencia_requerida}</p>
                        </td>

                        <td className="px-2 py-1.5 text-right">
                          {Number(row.importe_en_riesgo ?? 0) > 0 ? (
                            <span className="font-semibold text-red-700">
                              {euro(row.importe_en_riesgo)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500">
                              {importeAfectadoLabel(row.importe_en_riesgo)}
                            </span>
                          )}
                        </td>

                        <td className="px-2 py-1.5 text-right">
                          {num(row.bajas)}
                          <p className="text-[10px] text-slate-500">
                            {pct(row.bajas, row.alumnos_inicio)}
                          </p>
                        </td>

                        <td className="px-2 py-1.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${estadoRevisionBadgeClass(
                              row.estado_revision
                            )}`}
                          >
                            {estadoRevisionLabel(row.estado_revision)}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {regularizadasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                          No hay alertas regularizadas que coincidan con los filtros aplicados.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default function AlertasPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
          <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Cargando alertas institucionales...</p>
          </section>
        </main>
      }
    >
      <AlertasPageContent />
    </Suspense>
  );
}