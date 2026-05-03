"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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
  porcentaje_importe_en_riesgo: number | null;
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

function euro(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(value ?? 0);
}

function pct(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value)} %`;
}

function badgeClass(value: string) {
  const normalizado = value.toLowerCase();

  if (normalizado.includes("alta") || normalizado.includes("alto")) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (normalizado.includes("media") || normalizado.includes("medio") || normalizado.includes("preventivo")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalizado.includes("bajo") || normalizado.includes("ordinario")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Kpi({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-lg font-semibold leading-6 text-slate-950">{value}</p>
      <p className="text-[10px] text-slate-500">{detail}</p>
    </Link>
  );
}

export default function EntidadesPage() {
  const router = useRouter();
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [riesgoFiltro, setRiesgoFiltro] = useState("todos");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEntidades() {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("v_fiscalizacion_ficha_entidad")
        .select("*")
        .order("importe_en_riesgo", { ascending: false });

      if (supabaseError) {
        setError(supabaseError.message);
        setLoading(false);
        return;
      }

      setEntidades((data ?? []) as Entidad[]);
      setLoading(false);
    }

    loadEntidades();
  }, []);

  const nivelesRiesgo = useMemo(() => {
    const set = new Set<string>();
    entidades.forEach((entidad) => {
      if (entidad.nivel_riesgo_global) set.add(entidad.nivel_riesgo_global);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [entidades]);

  const entidadesFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return entidades.filter((entidad) => {
      const texto = [
        entidad.entidad_nombre,
        entidad.cif,
        entidad.entidad_isla ?? "",
        entidad.entidad_municipio ?? "",
        entidad.decision_principal,
        entidad.prioridad_principal,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaRiesgo = riesgoFiltro === "todos" || entidad.nivel_riesgo_global === riesgoFiltro;

      return pasaBusqueda && pasaRiesgo;
    });
  }, [entidades, busqueda, riesgoFiltro]);

  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, riesgoFiltro, pageSize]);

  const totalPages = Math.max(1, Math.ceil(entidadesFiltradas.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const entidadesPaginadas = entidadesFiltradas.slice(startIndex, endIndex);

  const resumen = useMemo(() => {
    return entidadesFiltradas.reduce(
      (acc, entidad) => {
        acc.acciones += entidad.acciones_concedidas ?? 0;
        acc.importe += entidad.importe_concedido ?? 0;
        acc.riesgo += entidad.importe_en_riesgo ?? 0;
        acc.alertasAltas += entidad.alertas_altas ?? 0;
        acc.alertasMedias += entidad.alertas_medias ?? 0;
        return acc;
      },
      {
        acciones: 0,
        importe: 0,
        riesgo: 0,
        alertasAltas: 0,
        alertasMedias: 0,
      }
    );
  }, [entidadesFiltradas]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando entidades beneficiarias...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error cargando entidades beneficiarias
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
            <h1 className="mt-1 text-xl font-semibold">Entidades beneficiarias</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Expedientes principales de entidades con acciones concedidas, riesgo e incidencias.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(entidadesFiltradas.length)} entidades visibles · {num(entidades.length)} totales
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            ← Volver al dashboard
          </Link>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            Cada entidad es un expediente principal
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-5">
          <Kpi
            label="Entidades"
            value={num(entidadesFiltradas.length)}
            detail="expedientes visibles"
            href="/entidades"
          />
          <Kpi
            label="Acciones"
            value={num(resumen.acciones)}
            detail="AF/CP concedidas"
            href="/oferta-formativa"
          />
          <Kpi
            label="Importe concedido"
            value={euro(resumen.importe)}
            detail="total filtrado"
            href="/oferta-formativa"
          />
          <Kpi
            label="Importe en riesgo"
            value={euro(resumen.riesgo)}
            detail={`${num(resumen.alertasAltas)} alertas altas`}
            href="/acciones"
          />
          <Kpi
            label="Seguimiento"
            value={num(resumen.alertasMedias)}
            detail="alertas medias"
            href="/alertas"
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.4fr_0.7fr_auto]">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar entidad
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, isla, municipio, decisión..."
                className="mt-1 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Riesgo global
              </label>
              <select
                value={riesgoFiltro}
                onChange={(event) => setRiesgoFiltro(event.target.value)}
                className="mt-1 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                {nivelesRiesgo.map((riesgo) => (
                  <option key={riesgo} value={riesgo}>
                    {riesgo}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setRiesgoFiltro("todos");
                }}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Expedientes de entidad</h2>
              <p className="text-[11px] text-slate-500">
                Listado de entidades beneficiarias. El detalle del expediente se activará en el siguiente paso.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span className="font-semibold">
                Página {safeCurrentPage} de {totalPages}
              </span>

              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold outline-none"
              >
                <option value={25}>25 filas</option>
                <option value={50}>50 filas</option>
                <option value={100}>100 filas</option>
              </select>

              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="max-h-[610px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Entidad</th>
                  <th className="px-2 py-2">Ubicación</th>
                  <th className="px-2 py-2 text-right">Acciones</th>
                  <th className="px-2 py-2 text-right">Concedido</th>
                  <th className="px-2 py-2 text-right">Riesgo</th>
                  <th className="px-2 py-2 text-right">Alumnos activos</th>
                  <th className="px-2 py-2 text-right">Bajas</th>
                  <th className="px-2 py-2">Riesgo global</th>
                  <th className="px-2 py-2">Prioridad</th>
                </tr>
              </thead>

              <tbody>
                {entidadesPaginadas.map((entidad) => (
                  <tr
                    key={entidad.entidad_id}
                    onClick={() => router.push(`/entidades/${entidad.entidad_id}`)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-blue-50"
                  >
                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{entidad.entidad_nombre}</p>
                      <p className="text-[10px] text-slate-500">{entidad.cif}</p>
                    </td>
                    <td className="px-2 py-1.5">
                      <p>{entidad.entidad_isla ?? "Canarias"}</p>
                      <p className="text-[10px] text-slate-500">
                        {entidad.entidad_municipio ?? "Varios municipios"}
                      </p>
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium">
                      {num(entidad.acciones_concedidas)}
                      <p className="text-[10px] font-normal text-slate-500">
                        {num(entidad.acciones_af)} AF · {num(entidad.acciones_cp)} CP
                      </p>
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium">
                      {euro(entidad.importe_concedido)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium text-red-700">
                      {euro(entidad.importe_en_riesgo)}
                      <p className="text-[10px] font-normal text-slate-500">
                        {pct(entidad.porcentaje_importe_en_riesgo)}
                      </p>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {num(entidad.alumnos_activos)}
                      <p className="text-[10px] text-slate-500">
                        {pct(entidad.porcentaje_alumnos_activos)}
                      </p>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {num(entidad.bajas)}
                      <p className="text-[10px] text-slate-500">{pct(entidad.porcentaje_bajas)}</p>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(entidad.nivel_riesgo_global)}`}>
                        {entidad.nivel_riesgo_global}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(entidad.prioridad_principal)}`}>
                        {entidad.prioridad_principal}
                      </span>
                    </td>
                  </tr>
                ))}

                {entidadesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay entidades que coincidan con los filtros aplicados.
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