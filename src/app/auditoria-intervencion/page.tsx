"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AuditoriaIntervencion = {
  id: number;
  oferta_id: number;
  entidad_id: number;
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
  created_at: string;
  updated_at: string;
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

function estadoLabel(value: string | null | undefined) {
  if (value === "emitida") return "Emitida";
  if (value === "borrador") return "Borrador";
  if (value === "registrada") return "Registrada";
  if (value === "pendiente") return "Pendiente";
  return value ?? "—";
}

function prioridadLabel(value: string | null | undefined) {
  if (value === "normal") return "Normal";
  if (value === "alta") return "Alta";
  if (value === "media") return "Media";
  if (value === "baja") return "Baja";
  return value ?? "—";
}

function badgeClass(value: string | null | undefined) {
  const normalizado = String(value ?? "").toLowerCase();

  if (normalizado.includes("alta")) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (normalizado.includes("media") || normalizado.includes("pendiente")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalizado.includes("emitida") || normalizado.includes("registrada")) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (normalizado.includes("normal") || normalizado.includes("ordinario")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function economicControlClass(value: number | null | undefined) {
  const amount = Number(value ?? 0);

  if (amount > 0) {
    return "text-red-700";
  }

  return "text-emerald-700";
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

export default function AuditoriaIntervencionPage() {
  const [registros, setRegistros] = useState<AuditoriaIntervencion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [prioridadFiltro, setPrioridadFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuditoria() {
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

      setRegistros((data ?? []) as AuditoriaIntervencion[]);
      setLoading(false);
    }

    loadAuditoria();
  }, []);

  const prioridades = useMemo(() => {
    return Array.from(new Set(registros.map((row) => row.prioridad))).filter(Boolean);
  }, [registros]);

  const estados = useMemo(() => {
    return Array.from(new Set(registros.map((row) => row.estado))).filter(Boolean);
  }, [registros]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return registros.filter((row) => {
      const texto = [
        row.tecnico_nombre,
        row.tecnico_email,
        row.tecnico_unidad,
        row.entidad_nombre,
        row.cif,
        row.codigo_accion,
        row.codigo_especialidad,
        row.denominacion,
        row.tipo_actuacion,
        row.prioridad,
        row.estado,
        row.canal_comunicacion,
        row.estado_canal,
        row.fuente_origen,
        row.tipo_dato,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaPrioridad = prioridadFiltro === "todos" || row.prioridad === prioridadFiltro;
      const pasaEstado = estadoFiltro === "todos" || row.estado === estadoFiltro;

      return pasaBusqueda && pasaPrioridad && pasaEstado;
    });
  }, [registros, busqueda, prioridadFiltro, estadoFiltro]);

  const resumen = useMemo(() => {
    const entidadesUnicas = new Set(filtradas.map((row) => row.entidad_id));
    const accionesUnicas = new Set(filtradas.map((row) => row.oferta_id));
    const tecnicosUnicos = new Set(filtradas.map((row) => row.tecnico_nombre ?? "Sin técnico"));

    return {
      actuaciones: filtradas.length,
      entidades: entidadesUnicas.size,
      acciones: accionesUnicas.size,
      tecnicos: tecnicosUnicos.size,
      controlEconomico: filtradas.reduce((acc, row) => acc + Number(row.importe_en_riesgo ?? 0), 0),
      alta: filtradas.filter((row) => row.prioridad === "alta").length,
    };
  }, [filtradas]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando auditoría de intervención...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error cargando auditoría de intervención</p>
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
            <h1 className="mt-1 text-xl font-semibold">Auditoría de intervención</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Control institucional de actuaciones registradas, técnico actuante, canal, trazabilidad y subexpediente.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} registros visibles · {num(registros.length)} auditables
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-1.5 px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver al dashboard
            </Link>
            <Link href="/actuaciones-emitidas" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Actuaciones emitidas
            </Link>
            <Link href="/comunicaciones-canal" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Comunicaciones / canal
            </Link>
            <Link href="/trazabilidad-tecnica" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Trazabilidad técnica
            </Link>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm">
            Control institucional · actuación trazada
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi label="Actuaciones" value={num(resumen.actuaciones)} detail="registros auditables" />
          <Kpi label="Control prioritario" value={num(resumen.alta)} detail="requieren revisión específica" />
          <Kpi label="Técnicos" value={num(resumen.tecnicos)} detail="autores trazados" />
          <Kpi label="Entidades" value={num(resumen.entidades)} detail="beneficiarias vinculadas" />
          <Kpi label="Subexpedientes" value={num(resumen.acciones)} detail="acciones vinculadas" />
          <Kpi
            label="Control económico"
            value={euro(resumen.controlEconomico)}
            detail={resumen.controlEconomico > 0 ? "importe en revisión" : "sin revisión económica activa"}
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr_auto]">
            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Técnico, entidad, CIF, acción, actuación, canal, fuente..."
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
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
                {prioridades.map((prioridad) => (
                  <option key={prioridad} value={prioridad}>
                    {prioridadLabel(prioridad)}
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
                    {estadoLabel(estado)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setPrioridadFiltro("todos");
                  setEstadoFiltro("todos");
                }}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-3 py-1.5">
            <h2 className="text-[14px] font-semibold leading-5">Registro de auditoría de intervención</h2>
            <p className="text-[10.5px] leading-4 text-slate-500">
              Control de actuación registrada, técnico actuante, expediente, canal y soporte técnico.
            </p>
          </div>

          <div className="max-h-[620px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[9.5px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Actuación</th>
                  <th className="px-2 py-1.5">Técnico</th>
                  <th className="px-2 py-1.5">Entidad</th>
                  <th className="px-2 py-1.5">Subexpediente</th>
                  <th className="px-2 py-1.5">Canal / estado</th>
                  <th className="px-2 py-1.5">Fuente</th>
                  <th className="px-2 py-1.5 text-right">Control económico</th>
                  <th className="px-2 py-1.5">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4 text-slate-950">{row.tipo_actuacion}</p>
                      <p className="line-clamp-1 text-[10px] leading-4 text-slate-500">{row.asunto}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.prioridad)}`}>
                          {prioridadLabel(row.prioridad)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.estado)}`}>
                          {estadoLabel(row.estado)}
                        </span>
                      </div>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4 text-slate-950">{row.tecnico_nombre ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.tecnico_unidad ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{fecha(row.fecha_emision)}</p>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4 text-slate-950">{row.entidad_nombre ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.cif ?? "—"}</p>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4">{row.codigo_accion ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">
                        {row.codigo_especialidad ?? "—"} · {row.tipo_oferta ?? "—"}
                      </p>
                      <p className="line-clamp-1 text-[10px] leading-4 text-slate-500">{row.denominacion ?? "—"}</p>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4">{canalLabel(row.canal_comunicacion)}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{estadoCanalLabel(row.estado_canal)}</p>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4">{row.fuente_origen ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.tipo_dato ?? "—"}</p>
                    </td>

                    <td className={`px-2 py-1 text-right font-semibold ${economicControlClass(row.importe_en_riesgo)}`}>
                      {euro(row.importe_en_riesgo)}
                    </td>

                    <td className="px-2 py-1">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/actuaciones-emitidas/${row.id}`}
                          className="rounded-md bg-[#183B63] px-2 py-1 text-center text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                        >
                          Ver trazabilidad
                        </Link>

                        <Link
                          href={`/subexpedientes-accion/${row.oferta_id}`}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Subexpediente
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay registros de auditoría que coincidan con los filtros aplicados.
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