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

function canalLabel(value: string | null | undefined) {
  if (value === "bandeja_institucional_demo") return "Bandeja institucional demo";
  if (value === "api_bidireccional") return "API bidireccional";
  if (value === "email_certificado") return "Email certificado";
  if (value === "sede_electronica") return "Sede electrónica";
  if (value === "carpeta_entidad") return "Carpeta entidad";
  return value ?? "—";
}

function estadoCanalLabel(value: string | null | undefined) {
  if (value === "registrada_no_enviada") return "Registrada, no enviada";
  if (value === "enviada") return "Enviada";
  if (value === "pendiente_respuesta") return "Pendiente respuesta";
  if (value === "respondida") return "Respondida";
  return value ?? "—";
}

function badgeClass(value: string | null | undefined) {
  const normalizado = String(value ?? "").toLowerCase();

  if (normalizado.includes("alta") || normalizado.includes("no_enviada")) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (normalizado.includes("media") || normalizado.includes("pendiente")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalizado.includes("emitida") || normalizado.includes("registrada")) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
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
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
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
  const [seleccionada, setSeleccionada] = useState<ActuacionEmitida | null>(null);
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

  const resumen = useMemo(() => {
    return filtradas.reduce(
      (acc, row) => {
        acc.riesgo += Number(row.importe_en_riesgo ?? 0);
        if (row.estado === "emitida") acc.emitidas++;
        if (row.estado_canal === "registrada_no_enviada") acc.registradasNoEnviadas++;
        if (row.canal_comunicacion === "bandeja_institucional_demo") acc.bandejaDemo++;
        return acc;
      },
      {
        riesgo: 0,
        emitidas: 0,
        registradasNoEnviadas: 0,
        bandejaDemo: 0,
      }
    );
  }, [filtradas]);

  function limpiarFiltros() {
    setBusqueda("");
    setCanalFiltro("todos");
    setEstadoFiltro("todos");
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
              Seguimiento técnico de requerimientos, revisiones y comunicaciones administrativas.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} visibles · {num(actuaciones.length)} registradas
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver al dashboard
            </Link>
            <Link href={accionesAdministrativasHref} className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Acciones administrativas
            </Link>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            Canal demo visible · API bidireccional prevista · técnico trazado
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-5">
          <Kpi label="Actuaciones" value={num(filtradas.length)} detail="emitidas/registradas" />
          <Kpi label="Emitidas" value={num(resumen.emitidas)} detail="acto administrativo registrado" />
          <Kpi label="Bandeja demo" value={num(resumen.bandejaDemo)} detail="canal visible en demo" />
          <Kpi label="No enviadas" value={num(resumen.registradasNoEnviadas)} detail="pendiente canal oficial" />
          <Kpi label="Riesgo asociado" value={euro(resumen.riesgo)} detail="importe del subexpediente" />
        </section>

        {tieneFiltroEntidad ? (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-950 shadow-sm">
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
              Ver todas las emitidas
            </Link>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.25fr_0.8fr_0.8fr_auto]">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, actuación, acción, técnico, canal, estado..."
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Canal
              </label>
              <select
                value={canalFiltro}
                onChange={(event) => setCanalFiltro(event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
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
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Estado canal
              </label>
              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
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
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-3 py-2">
            <h2 className="text-sm font-semibold">Registro técnico de actuaciones emitidas</h2>
            <p className="text-[11px] text-slate-500">
              Cada registro representa una actuación administrativa emitida por un técnico y preparada para canal institucional.
            </p>
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
                  <th className="px-2 py-2 text-right">Riesgo</th>
                  <th className="px-2 py-2">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{row.tipo_actuacion}</p>
                      <p className="text-[10px] text-slate-500">{row.asunto}</p>
                      <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.prioridad)}`}>
                        {row.prioridad}
                      </span>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{row.entidad_nombre ?? "—"}</p>
                      <p className="text-[10px] text-slate-500">{row.cif ?? "—"}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {row.codigo_accion ?? "—"} · {row.codigo_especialidad ?? "—"} · {row.tipo_oferta ?? "—"}
                      </p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{row.tecnico_nombre ?? "—"}</p>
                      <p className="text-[10px] text-slate-500">{row.tecnico_unidad ?? "—"}</p>
                      <p className="text-[10px] text-slate-500">{row.tecnico_email ?? "—"}</p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold">{canalLabel(row.canal_comunicacion)}</p>
                      <p className="text-[10px] text-slate-500">API bidireccional prevista</p>
                    </td>

                    <td className="px-2 py-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.estado_canal)}`}>
                        {estadoCanalLabel(row.estado_canal)}
                      </span>
                    </td>

                    <td className="px-2 py-1.5">{fecha(row.fecha_emision)}</td>
                    <td className="px-2 py-1.5">{fechaCorta(row.fecha_limite_respuesta)}</td>

                    <td className="px-2 py-1.5 text-right font-semibold text-red-700">
                      {euro(row.importe_en_riesgo)}
                    </td>

                    <td className="px-2 py-1.5">
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

                {filtradas.length === 0 ? (
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

      {seleccionada ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Detalle de actuación emitida
              </p>
              <h2 className="mt-1 text-lg font-semibold">{seleccionada.tipo_actuacion}</h2>
              <p className="mt-0.5 text-xs text-blue-100">
                {seleccionada.entidad_nombre} · {seleccionada.codigo_accion} · {seleccionada.codigo_especialidad}
              </p>
            </div>

            <div className="space-y-3 p-5">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Estado</p>
                  <p className="mt-1 text-sm font-semibold">{seleccionada.estado}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Técnico</p>
                  <p className="mt-1 text-sm font-semibold">{seleccionada.tecnico_nombre ?? "—"}</p>
                  <p className="text-[10px] text-slate-500">{seleccionada.tecnico_unidad ?? "—"}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Canal</p>
                  <p className="mt-1 text-sm font-semibold">{canalLabel(seleccionada.canal_comunicacion)}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Estado canal</p>
                  <p className="mt-1 text-sm font-semibold">{estadoCanalLabel(seleccionada.estado_canal)}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Referencia externa</p>
                  <p className="mt-1 text-sm font-semibold">{seleccionada.referencia_externa ?? "Pendiente"}</p>
                </div>
              </div>

              <section className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                <p className="font-semibold">Lectura de canal institucional</p>
                <p className="mt-1">
                  Esta actuación está registrada en bandeja institucional demo. En fase real, este registro puede actuar
                  como origen de comunicación mediante API bidireccional, sede electrónica, carpeta de entidad o canal oficial
                  que determine la Administración.
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Asunto</p>
                <p className="mt-1 text-sm font-semibold">{seleccionada.asunto}</p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mensaje emitido</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{seleccionada.mensaje}</p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Evidencia requerida</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {seleccionada.evidencia_requerida ?? "—"}
                </p>
              </section>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/subexpedientes-accion/${seleccionada.oferta_id}`}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver subexpediente
                </Link>

                <button
                  type="button"
                  onClick={() => setSeleccionada(null)}
                  className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
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