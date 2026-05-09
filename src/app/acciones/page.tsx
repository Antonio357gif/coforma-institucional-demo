"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type PrioridadActuacion = "alta" | "media" | "baja" | "normal";

type AccionPendienteRow = {
  accion_pendiente_id: string;
  fuente_pendiente: string;
  oferta_id: number | null;
  convocatoria_id: number | null;
  convocatoria_codigo: string | null;
  entidad_id: number | null;
  entidad_nombre: string | null;
  cif: string | null;
  codigo_accion: string | null;
  tipo_oferta: string | null;
  codigo_especialidad: string | null;
  denominacion: string | null;
  importe_concedido: number | null;
  importe_en_riesgo: number | null;
  estado_origen: string | null;
  tipologia_codigo: string | null;
  tipologia_nombre: string | null;
  tipo_actuacion: string | null;
  prioridad_operativa: string | null;
  motivo: string | null;
  evidencia_requerida: string | null;
  estado_revision: string | null;
  origen: string | null;
  destino_subexpediente: string | null;
};

type Actuacion = {
  id: string;
  fuentePendiente: string;
  tipo: string;
  prioridad: PrioridadActuacion;
  entidadId: number | null;
  entidad: string;
  cif: string;
  ofertaId: number | null;
  codigoAccion: string;
  especialidad: string;
  denominacion: string;
  motivo: string;
  evidencia: string;
  origen: string;
  destino: string;
  importeRiesgo: number;
  estado: string;
  tipologiaCodigo: string | null;
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

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function label(value: string | null | undefined) {
  return String(value ?? "—").replaceAll("_", " ");
}

function normalizarPrioridad(value: string | null | undefined): PrioridadActuacion {
  const normalizada = normalizarTexto(value);

  if (normalizada === "alta") return "alta";
  if (normalizada === "media") return "media";
  if (normalizada === "baja") return "baja";
  if (normalizada === "normal") return "normal";

  return "normal";
}

function priorityClass(prioridad: string) {
  if (prioridad === "alta") return "border-red-200 bg-red-50 text-red-800";
  if (prioridad === "media") return "border-amber-200 bg-amber-50 text-amber-800";
  if (prioridad === "baja") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function riesgoClass(value: number | null | undefined) {
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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
      <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
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

function mapRowToActuacion(row: AccionPendienteRow): Actuacion {
  return {
    id: row.accion_pendiente_id,
    fuentePendiente: row.fuente_pendiente ?? "pendiente_backend",
    tipo: row.tipo_actuacion ?? "Actuación administrativa",
    prioridad: normalizarPrioridad(row.prioridad_operativa),
    entidadId: row.entidad_id,
    entidad: row.entidad_nombre ?? "Entidad no informada",
    cif: row.cif ?? "—",
    ofertaId: row.oferta_id,
    codigoAccion: row.codigo_accion ?? "—",
    especialidad: row.codigo_especialidad ?? "—",
    denominacion: row.denominacion ?? "—",
    motivo: row.motivo ?? "Actuación administrativa pendiente de revisión.",
    evidencia: row.evidencia_requerida ?? "Revisar evidencia asociada al expediente.",
    origen: row.origen ?? "Acción administrativa pendiente",
    destino:
      row.destino_subexpediente ??
      (row.oferta_id ? `/subexpedientes-accion/${row.oferta_id}` : "/acciones"),
    importeRiesgo: Number(row.importe_en_riesgo ?? 0),
    estado: row.estado_revision ?? row.estado_origen ?? "pendiente_revision",
    tipologiaCodigo: row.tipologia_codigo,
  };
}

function prioridadOrden(prioridad: PrioridadActuacion) {
  if (prioridad === "alta") return 1;
  if (prioridad === "media") return 2;
  if (prioridad === "baja") return 3;
  return 4;
}

function accionNuevaHref(item: Actuacion) {
  const params = new URLSearchParams();

  params.set("accionId", item.id);

  if (item.ofertaId) {
    params.set("ofertaId", String(item.ofertaId));
  }

  if (item.entidadId) {
    params.set("entidadId", String(item.entidadId));
  }

  if (item.cif && item.cif !== "—") {
    params.set("cif", item.cif);
  }

  params.set("tipo", item.tipo);
  params.set("origen", item.origen);

  if (item.tipologiaCodigo) {
    params.set("tipologia", item.tipologiaCodigo);
  }

  return `/acciones/nueva?${params.toString()}`;
}

function AccionesPageContent() {
  const searchParams = useSearchParams();

  const ofertaIdParam = searchParams.get("ofertaId");
  const entidadIdParam = searchParams.get("entidadId");
  const cifParam = searchParams.get("cif");

  const ofertaIdInicial = ofertaIdParam ? Number(ofertaIdParam) : null;
  const entidadIdInicial = entidadIdParam ? Number(entidadIdParam) : null;
  const cifInicial = cifParam ? cifParam.trim() : "";

  const [actuaciones, setActuaciones] = useState<Actuacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [prioridadFiltro, setPrioridadFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccionesAdministrativas() {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("v_acciones_administrativas_pendientes")
        .select("*")
        .order("prioridad_operativa", { ascending: true })
        .order("importe_en_riesgo", { ascending: false });

      if (supabaseError) {
        setError(supabaseError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as AccionPendienteRow[];
      const mapped = rows.map(mapRowToActuacion);

      mapped.sort((a, b) => {
        const ordenA = prioridadOrden(a.prioridad);
        const ordenB = prioridadOrden(b.prioridad);

        if (ordenA !== ordenB) return ordenA - ordenB;
        return b.importeRiesgo - a.importeRiesgo;
      });

      setActuaciones(mapped);
      setLoading(false);
    }

    loadAccionesAdministrativas();
  }, []);

  const entidadFiltradaPorUrl = useMemo(() => {
    if (!entidadIdInicial && !cifInicial) return null;

    return (
      actuaciones.find((item) => {
        const coincideEntidadId =
          entidadIdInicial !== null && item.entidadId === entidadIdInicial;

        const coincideCif =
          cifInicial !== "" &&
          normalizarTexto(item.cif) === normalizarTexto(cifInicial);

        return coincideEntidadId || coincideCif;
      }) ?? null
    );
  }, [actuaciones, entidadIdInicial, cifInicial]);

  const tipos = useMemo(() => {
    return Array.from(new Set(actuaciones.map((item) => item.tipo))).sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, [actuaciones]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return actuaciones.filter((item) => {
      const pasaOfertaInicial = !ofertaIdInicial || item.ofertaId === ofertaIdInicial;

      const pasaEntidadInicial =
        !entidadIdInicial || item.entidadId === entidadIdInicial;

      const pasaCifInicial =
        !cifInicial || normalizarTexto(item.cif) === normalizarTexto(cifInicial);

      const texto = [
        item.tipo,
        item.entidad,
        item.cif,
        item.codigoAccion,
        item.especialidad,
        item.denominacion,
        item.motivo,
        item.evidencia,
        item.origen,
        item.estado,
        item.tipologiaCodigo,
        item.fuentePendiente,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaTipo = tipoFiltro === "todos" || item.tipo === tipoFiltro;
      const pasaPrioridad =
        prioridadFiltro === "todos" || item.prioridad === prioridadFiltro;

      return (
        pasaOfertaInicial &&
        pasaEntidadInicial &&
        pasaCifInicial &&
        pasaBusqueda &&
        pasaTipo &&
        pasaPrioridad
      );
    });
  }, [
    actuaciones,
    busqueda,
    tipoFiltro,
    prioridadFiltro,
    ofertaIdInicial,
    entidadIdInicial,
    cifInicial,
  ]);

  const resumen = useMemo(() => {
    return filtradas.reduce(
      (acc, item) => {
        acc.riesgo += item.importeRiesgo;
        if (item.prioridad === "alta") acc.alta++;
        if (item.prioridad === "media") acc.media++;
        if (item.prioridad === "baja") acc.baja++;
        if (item.prioridad === "normal") acc.normal++;
        return acc;
      },
      {
        riesgo: 0,
        alta: 0,
        media: 0,
        baja: 0,
        normal: 0,
      }
    );
  }, [filtradas]);

  function limpiarFiltros() {
    setBusqueda("");
    setTipoFiltro("todos");
    setPrioridadFiltro("todos");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando acciones administrativas...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error cargando acciones administrativas
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
              Acciones administrativas pendientes
            </h1>

            <p className="mt-0.5 text-xs text-blue-100">
              Bandeja calculada desde backend para preparar actuaciones sobre subexpedientes.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} acciones visibles · {num(actuaciones.length)} totales
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-1.5 px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-blue-800 hover:text-blue-950"
          >
            ← Volver al dashboard
          </Link>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm">
            Vista backend · actuación preparada antes de envío oficial
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi label="Actuaciones" value={num(filtradas.length)} detail="pendientes visibles" />
          <Kpi label="Prioridad alta" value={num(resumen.alta)} detail="revisión/riesgo" />
          <Kpi label="Prioridad media" value={num(resumen.media)} detail="incidencia técnica" />
          <Kpi label="Prioridad baja" value={num(resumen.baja)} detail="subsanación documental" />
          <Kpi label="Prioridad normal" value={num(resumen.normal)} detail="tramitación ordinaria" />
          <Kpi label="Revisión/Riesgo" value={euro(resumen.riesgo)} detail="importe afectado" />
        </section>

        {ofertaIdInicial ? (
          <section className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] leading-4 text-blue-950 shadow-sm">
            <p className="font-semibold">Filtro activo por subexpediente</p>
            <p className="mt-0.5">
              Mostrando solo actuaciones vinculadas a la oferta seleccionada.
            </p>
          </section>
        ) : null}

        {entidadIdInicial || cifInicial ? (
          <section className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] leading-4 text-blue-950 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Filtro activo por entidad beneficiaria</p>
                <p className="mt-0.5">
                  {entidadFiltradaPorUrl
                    ? `${entidadFiltradaPorUrl.entidad} · ${entidadFiltradaPorUrl.cif}`
                    : `EntidadId ${entidadIdInicial ?? "—"} · CIF ${cifInicial || "—"}`}
                </p>
              </div>

              <Link
                href="/acciones"
                className="rounded-md border border-blue-200 bg-white px-3 py-1 text-[10px] font-semibold text-blue-800 hover:bg-blue-50"
              >
                Ver todas las acciones
              </Link>
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.2fr_0.9fr_0.65fr_auto]">
            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, acción, motivo, evidencia, actuación..."
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Tipo de actuación
              </label>
              <select
                value={tipoFiltro}
                onChange={(event) => setTipoFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todas</option>
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Prioridad
              </label>
              <select
                value={prioridadFiltro}
                onChange={(event) => setPrioridadFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todas</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
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

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-3 py-1.5">
            <h2 className="text-[13px] font-semibold leading-5">
              Bandeja de actuación administrativa
            </h2>

            <p className="text-[10.5px] leading-4 text-slate-500">
              Actuaciones derivadas de la vista backend de pendientes administrativos. La emisión se prepara en ficha independiente.
            </p>
          </div>

          <div className="max-h-[640px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[9.5px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Prioridad</th>
                  <th className="px-2 py-1.5">Actuación</th>
                  <th className="px-2 py-1.5">Entidad / acción</th>
                  <th className="px-2 py-1.5">Motivo</th>
                  <th className="px-2 py-1.5">Evidencia requerida</th>
                  <th className="px-2 py-1.5 text-right">Rev./Riesgo</th>
                  <th className="px-2 py-1.5">Acción</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1 align-top">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityClass(
                          item.prioridad
                        )}`}
                      >
                        {item.prioridad}
                      </span>
                    </td>

                    <td className="px-2 py-1 align-top">
                      <p className="font-semibold leading-4 text-slate-950">{item.tipo}</p>
                      <p className="line-clamp-1 text-[10px] leading-4 text-slate-500">
                        {item.origen}
                      </p>
                      {item.tipologiaCodigo ? (
                        <p className="text-[10px] leading-4 text-slate-400">
                          {item.tipologiaCodigo}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-2 py-1 align-top">
                      <p className="font-semibold leading-4 text-slate-950">{item.entidad}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{item.cif}</p>
                      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                        {item.codigoAccion} · {item.especialidad}
                      </p>
                    </td>

                    <td className="max-w-[250px] px-2 py-1 align-top">
                      <p className="line-clamp-2 text-[10.5px] leading-4 text-slate-700">
                        {item.motivo}
                      </p>
                    </td>

                    <td className="max-w-[260px] px-2 py-1 align-top">
                      <p className="line-clamp-2 text-[10.5px] leading-4 text-slate-700">
                        {item.evidencia}
                      </p>
                    </td>

                    <td className={`px-2 py-1 text-right align-top font-semibold ${riesgoClass(item.importeRiesgo)}`}>
                      {euro(item.importeRiesgo)}
                    </td>

                    <td className="px-2 py-1 align-top">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={accionNuevaHref(item)}
                          className="rounded-md bg-[#183B63] px-2 py-1 text-center text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                        >
                          Preparar
                        </Link>

                        <Link
                          href={item.destino}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Ver subexpediente
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay actuaciones que coincidan con los filtros aplicados.
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

export default function AccionesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
          <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">
              Cargando acciones administrativas...
            </p>
          </section>
        </main>
      }
    >
      <AccionesPageContent />
    </Suspense>
  );
}