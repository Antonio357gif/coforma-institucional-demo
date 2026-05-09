"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ActuacionEmitida = {
  id: number;
  oferta_id: number;
  entidad_id: number;
  tecnico_id: number | null;
  tecnico_nombre: string | null;
  tecnico_email: string | null;
  tecnico_unidad: string | null;
  tecnico_rol: string | null;
  tipo_actuacion: string;
  prioridad: string;
  asunto: string;
  mensaje: string;
  evidencia_requerida: string | null;
  estado: string;
  fecha_emision: string | null;
  fecha_limite_respuesta: string | null;
  fecha_respuesta: string | null;
  canal_comunicacion: string;
  estado_canal: string;
  referencia_externa: string | null;
  observacion_canal: string | null;
  fuente_origen: string;
  tipo_dato: string;
  entidad_nombre: string | null;
  cif: string | null;
  codigo_accion: string | null;
  tipo_oferta: string | null;
  codigo_especialidad: string | null;
  denominacion: string | null;
  importe_concedido: number | null;
  importe_en_riesgo: number | null;
  estado_operativo_administrativo: string | null;
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

function normalize(value: string | number | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function label(value: string | null | undefined) {
  return String(value ?? "—").replaceAll("_", " ");
}

function canalLabel(value: string | null | undefined) {
  if (value === "bandeja_institucional_demo") return "Bandeja institucional interna";
  if (value === "api_bidireccional") return "API bidireccional";
  if (value === "email_certificado") return "Email certificado";
  if (value === "sede_electronica") return "Sede electrónica";
  if (value === "carpeta_entidad") return "Carpeta de entidad";
  return value ? label(value) : "—";
}

function canalDetail(value: string | null | undefined) {
  if (value === "bandeja_institucional_demo") return "registro interno trazado";
  if (value === "api_bidireccional") return "integración institucional";
  if (value === "email_certificado") return "canal fehaciente";
  if (value === "sede_electronica") return "canal oficial";
  if (value === "carpeta_entidad") return "canal documental";
  return "canal informado";
}

function estadoCanalLabel(value: string | null | undefined) {
  if (value === "registrada_no_enviada") return "Registrada, pendiente de envío oficial";
  if (value === "enviada") return "Enviada";
  if (value === "pendiente_respuesta") return "Pendiente de respuesta";
  if (value === "respondida") return "Respondida";
  return value ? label(value) : "—";
}

function badgeClass(value: string | null | undefined) {
  const normalizado = normalize(value);

  if (normalizado.includes("alta") || normalizado.includes("no_enviada")) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (normalizado.includes("media") || normalizado.includes("pendiente")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalizado.includes("emitida") || normalizado.includes("registrada")) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (normalizado.includes("respondida") || normalizado.includes("enviada")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function riesgoTone(value: number | null | undefined) {
  return Number(value ?? 0) > 0 ? "text-red-700" : "text-emerald-700";
}

function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-h-[74px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-[18px] font-semibold leading-5 text-slate-950">{value}</p>
      <p className="mt-0.5 text-[10px] leading-3 text-slate-500">{detail}</p>
    </div>
  );
}

function perteneceAEntidad(
  row: ActuacionEmitida,
  entidadIdFiltro: number | null,
  cifFiltro: string,
  entidadFiltro: string
) {
  const sameId =
    entidadIdFiltro !== null &&
    row.entidad_id !== null &&
    Number(row.entidad_id) === Number(entidadIdFiltro);

  const sameCif =
    cifFiltro !== "" &&
    normalize(row.cif) !== "" &&
    normalize(row.cif) === normalize(cifFiltro);

  const sameEntidad =
    entidadFiltro !== "" &&
    normalize(row.entidad_nombre) !== "" &&
    normalize(row.entidad_nombre) === normalize(entidadFiltro);

  return sameId || sameCif || sameEntidad;
}

function buildEntidadFilterHref(
  basePath: string,
  entidadIdFiltro: number | null,
  cifParam: string,
  entidadParam: string
) {
  const params = new URLSearchParams();

  if (entidadIdFiltro !== null) {
    params.set("entidadId", String(entidadIdFiltro));
  }

  if (cifParam.trim() !== "") {
    params.set("cif", cifParam);
  }

  if (entidadParam.trim() !== "") {
    params.set("entidad", entidadParam);
  }

  const query = params.toString();

  return query ? `${basePath}?${query}` : basePath;
}

function ActuacionesEmitidasPageContent() {
  const searchParams = useSearchParams();

  const entidadIdParam = searchParams.get("entidadId");
  const cifParam = searchParams.get("cif") ?? "";
  const entidadParam = searchParams.get("entidad") ?? "";

  const entidadIdFiltro = entidadIdParam ? Number(entidadIdParam) : null;
  const tieneFiltroEntidad =
    Boolean(entidadIdFiltro) || cifParam.trim() !== "" || entidadParam.trim() !== "";

  const accionesAdministrativasHref = buildEntidadFilterHref(
    "/acciones",
    entidadIdFiltro,
    cifParam,
    entidadParam
  );

  const [actuaciones, setActuaciones] = useState<ActuacionEmitida[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [canalFiltro, setCanalFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActuaciones() {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("v_actuaciones_administrativas")
        .select("*")
        .order("created_at", { ascending: false });

      if (supabaseError) {
        setError(supabaseError.message);
        setLoading(false);
        return;
      }

      setActuaciones((data ?? []) as ActuacionEmitida[]);
      setLoading(false);
    }

    loadActuaciones();
  }, []);

  const actuacionesPorEntidad = useMemo(() => {
    if (!tieneFiltroEntidad) return actuaciones;

    return actuaciones.filter((row) =>
      perteneceAEntidad(row, entidadIdFiltro, cifParam, entidadParam)
    );
  }, [actuaciones, tieneFiltroEntidad, entidadIdFiltro, cifParam, entidadParam]);

  const canales = useMemo(() => {
    return Array.from(new Set(actuacionesPorEntidad.map((row) => row.canal_comunicacion))).filter(Boolean);
  }, [actuacionesPorEntidad]);

  const estadosCanal = useMemo(() => {
    return Array.from(new Set(actuacionesPorEntidad.map((row) => row.estado_canal))).filter(Boolean);
  }, [actuacionesPorEntidad]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return actuacionesPorEntidad.filter((row) => {
      const texto = [
        row.tipo_actuacion,
        row.prioridad,
        row.asunto,
        row.mensaje,
        row.evidencia_requerida,
        row.estado,
        row.canal_comunicacion,
        row.estado_canal,
        row.tecnico_nombre,
        row.tecnico_email,
        row.tecnico_unidad,
        row.entidad_nombre,
        row.cif,
        row.codigo_accion,
        row.codigo_especialidad,
        row.denominacion,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaCanal = canalFiltro === "todos" || row.canal_comunicacion === canalFiltro;
      const pasaEstado = estadoFiltro === "todos" || row.estado_canal === estadoFiltro;

      return pasaBusqueda && pasaCanal && pasaEstado;
    });
  }, [actuacionesPorEntidad, busqueda, canalFiltro, estadoFiltro]);

  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, canalFiltro, estadoFiltro, pageSize, entidadIdParam, cifParam, entidadParam]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginadas = filtradas.slice(startIndex, endIndex);

  const resumen = useMemo(() => {
    return filtradas.reduce(
      (acc, row) => {
        acc.riesgo += Number(row.importe_en_riesgo ?? 0);
        if (row.estado === "emitida") acc.emitidas++;
        if (row.estado_canal === "registrada_no_enviada") acc.registradasNoEnviadas++;
        if (row.canal_comunicacion === "bandeja_institucional_demo") acc.bandejaInterna++;
        return acc;
      },
      {
        riesgo: 0,
        emitidas: 0,
        registradasNoEnviadas: 0,
        bandejaInterna: 0,
      }
    );
  }, [filtradas]);

  function limpiarFiltros() {
    setBusqueda("");
    setCanalFiltro("todos");
    setEstadoFiltro("todos");
    setCurrentPage(1);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando actuaciones emitidas...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error cargando actuaciones emitidas</p>
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
            <h1 className="mt-1 text-xl font-semibold">Actuaciones emitidas</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Trazabilidad técnica de actuaciones administrativas registradas por subexpediente.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} visibles · {num(actuaciones.length)} registradas
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-2 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver al dashboard
            </Link>

            <Link href={accionesAdministrativasHref} className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Acciones administrativas
            </Link>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            Canal institucional interno · envío oficial pendiente · técnico trazado
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-5">
          <Kpi label="Actuaciones" value={num(filtradas.length)} detail="registros visibles" />
          <Kpi label="Emitidas" value={num(resumen.emitidas)} detail="actos administrativos registrados" />
          <Kpi label="Bandeja interna" value={num(resumen.bandejaInterna)} detail="canal institucional interno" />
          <Kpi label="Pendientes de envío" value={num(resumen.registradasNoEnviadas)} detail="canal oficial no ejecutado" />
          <Kpi label="Revisión/Riesgo" value={euro(resumen.riesgo)} detail="importe asociado a subexpedientes" />
        </section>

        {tieneFiltroEntidad ? (
          <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-950 shadow-sm">
            <div>
              <p className="font-semibold">Filtro activo por entidad beneficiaria</p>
              <p className="mt-0.5">
                {entidadParam || "Entidad seleccionada"}
                {cifParam ? ` · ${cifParam}` : ""}
              </p>
            </div>

            <Link
              href="/actuaciones-emitidas"
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-50"
            >
              Ver todas las actuaciones
            </Link>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.25fr_0.8fr_0.8fr_auto]">
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, actuación, acción, técnico, canal, estado..."
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Canal
              </label>
              <select
                value={canalFiltro}
                onChange={(event) => setCanalFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                {canales.map((canal) => (
                  <option key={canal} value={canal}>
                    {canalLabel(canal)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Estado canal
              </label>
              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                {estadosCanal.map((estado) => (
                  <option key={estado} value={estado}>
                    {estadoCanalLabel(estado)}
                  </option>
                ))}
              </select>
            </div>

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
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Registro técnico de actuaciones</h2>
              <p className="text-[11px] text-slate-500">
                Cada registro representa una actuación administrativa emitida, trazada y vinculada a una entidad beneficiaria y subexpediente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span className="font-semibold">
                Página {num(safeCurrentPage)} de {num(totalPages)}
              </span>

              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold outline-none"
              >
                <option value={25}>25 filas</option>
                <option value={50}>50 filas</option>
                <option value={100}>100 filas</option>
              </select>

              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="max-h-[610px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Actuación</th>
                  <th className="px-2 py-2">Entidad / acción</th>
                  <th className="px-2 py-2">Técnico</th>
                  <th className="px-2 py-2">Canal</th>
                  <th className="px-2 py-2">Estado canal</th>
                  <th className="px-2 py-2">Emisión</th>
                  <th className="px-2 py-2">Límite</th>
                  <th className="px-2 py-2 text-right">Rev./Riesgo</th>
                  <th className="px-2 py-2">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {paginadas.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4 text-slate-950">{row.tipo_actuacion}</p>
                      <p className="line-clamp-1 text-[10px] leading-4 text-slate-500">{row.asunto}</p>
                      <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.prioridad)}`}>
                        {label(row.prioridad)}
                      </span>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4 text-slate-950">{row.entidad_nombre ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.cif ?? "—"}</p>
                      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                        {row.codigo_accion ?? "—"} · {row.codigo_especialidad ?? "—"} · {row.tipo_oferta ?? "—"}
                      </p>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4 text-slate-950">{row.tecnico_nombre ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.tecnico_unidad ?? "—"}</p>
                      <p className="line-clamp-1 text-[10px] leading-4 text-slate-500">{row.tecnico_email ?? "—"}</p>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4">{canalLabel(row.canal_comunicacion)}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{canalDetail(row.canal_comunicacion)}</p>
                    </td>

                    <td className="px-2 py-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.estado_canal)}`}>
                        {estadoCanalLabel(row.estado_canal)}
                      </span>
                    </td>

                    <td className="px-2 py-1 text-[10px] leading-4">{fecha(row.fecha_emision)}</td>
                    <td className="px-2 py-1 text-[10px] leading-4">{fechaCorta(row.fecha_limite_respuesta)}</td>

                    <td className={`px-2 py-1 text-right font-semibold ${riesgoTone(row.importe_en_riesgo)}`}>
                      {euro(row.importe_en_riesgo)}
                    </td>

                    <td className="px-2 py-1">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/actuaciones-emitidas/${row.id}`}
                          className="rounded-lg bg-[#183B63] px-2 py-1 text-center text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                        >
                          Ver emisión
                        </Link>

                        <Link
                          href={`/subexpedientes-accion/${row.oferta_id}`}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Subexpediente
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {paginadas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay actuaciones emitidas que coincidan con los filtros aplicados.
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

export default function ActuacionesEmitidasPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
          <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Cargando actuaciones emitidas...</p>
          </section>
        </main>
      }
    >
      <ActuacionesEmitidasPageContent />
    </Suspense>
  );
}