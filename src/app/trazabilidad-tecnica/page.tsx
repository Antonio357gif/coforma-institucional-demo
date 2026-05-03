"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type TrazaTecnica = {
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
  importe_en_riesgo: number | null;
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
    <div className="min-h-[62px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
      <p className="truncate text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[15px] font-semibold leading-5 text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">{detail}</p>
    </div>
  );
}

export default function TrazabilidadTecnicaPage() {
  const [trazas, setTrazas] = useState<TrazaTecnica[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tecnicoFiltro, setTecnicoFiltro] = useState("todos");
  const [seleccionada, setSeleccionada] = useState<TrazaTecnica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrazas() {
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

      setTrazas((data ?? []) as TrazaTecnica[]);
      setLoading(false);
    }

    loadTrazas();
  }, []);

  const tecnicos = useMemo(() => {
    return Array.from(new Set(trazas.map((row) => row.tecnico_nombre ?? "Sin técnico"))).filter(Boolean);
  }, [trazas]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return trazas.filter((row) => {
      const tecnico = row.tecnico_nombre ?? "Sin técnico";
      const texto = [
        row.tecnico_nombre,
        row.tecnico_email,
        row.tecnico_unidad,
        row.tecnico_rol,
        row.entidad_nombre,
        row.cif,
        row.codigo_accion,
        row.codigo_especialidad,
        row.tipo_actuacion,
        row.asunto,
        row.estado,
        row.canal_comunicacion,
        row.fuente_origen,
        row.tipo_dato,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaTecnico = tecnicoFiltro === "todos" || tecnico === tecnicoFiltro;

      return pasaBusqueda && pasaTecnico;
    });
  }, [trazas, busqueda, tecnicoFiltro]);

  const resumen = useMemo(() => {
    const tecnicosUnicos = new Set(filtradas.map((row) => row.tecnico_nombre ?? "Sin técnico"));
    const entidadesUnicas = new Set(filtradas.map((row) => row.entidad_id));
    const accionesUnicas = new Set(filtradas.map((row) => row.oferta_id));

    return {
      tecnicos: tecnicosUnicos.size,
      entidades: entidadesUnicas.size,
      acciones: accionesUnicas.size,
      riesgo: filtradas.reduce((acc, row) => acc + Number(row.importe_en_riesgo ?? 0), 0),
    };
  }, [filtradas]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando trazabilidad técnica...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error cargando trazabilidad técnica</p>
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
            <h1 className="mt-1 text-xl font-semibold">Trazabilidad técnica</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Quién actuó, cuándo, sobre qué entidad, qué subexpediente y bajo qué motivo administrativo.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} trazas visibles · {num(trazas.length)} registradas
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-2 px-5 py-3">
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
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm">
            Autoría técnica trazada · demo institucional
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-5">
          <Kpi label="Intervenciones" value={num(filtradas.length)} detail="actuaciones trazadas" />
          <Kpi label="Técnicos" value={num(resumen.tecnicos)} detail="autores identificados" />
          <Kpi label="Entidades" value={num(resumen.entidades)} detail="destinatarios afectados" />
          <Kpi label="Subexpedientes" value={num(resumen.acciones)} detail="acciones auditadas" />
          <Kpi label="Riesgo asociado" value={euro(resumen.riesgo)} detail="importe bajo seguimiento" />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.4fr_0.8fr_auto]">
            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Técnico, unidad, entidad, CIF, acción, motivo, canal..."
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Técnico
              </label>
              <select
                value={tecnicoFiltro}
                onChange={(event) => setTecnicoFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico} value={tecnico}>
                    {tecnico}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setTecnicoFiltro("todos");
                }}
                className="h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-3 py-1.5">
            <h2 className="text-[14px] font-semibold leading-5">Secuencia de intervención técnica</h2>
            <p className="text-[10.5px] leading-4 text-slate-500">
              Trazabilidad mínima: técnico, unidad, fecha, actuación, entidad, subexpediente y canal.
            </p>
          </div>

          <div className="max-h-[590px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[9.5px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Técnico / unidad</th>
                  <th className="px-2 py-1.5">Fecha</th>
                  <th className="px-2 py-1.5">Actuación</th>
                  <th className="px-2 py-1.5">Entidad / subexpediente</th>
                  <th className="px-2 py-1.5">Canal</th>
                  <th className="px-2 py-1.5">Estado</th>
                  <th className="px-2 py-1.5 text-right">Riesgo</th>
                  <th className="px-2 py-1.5">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4 text-slate-950">{row.tecnico_nombre ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.tecnico_unidad ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.tecnico_email ?? "—"}</p>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4">{fecha(row.fecha_emision)}</p>
                      <p className="text-[10px] leading-4 text-slate-500">Creación: {fecha(row.created_at)}</p>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4 text-slate-950">{row.tipo_actuacion}</p>
                      <p className="line-clamp-1 text-[10px] leading-4 text-slate-500">{row.asunto}</p>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4 text-slate-950">{row.entidad_nombre ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.cif ?? "—"}</p>
                      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                        {row.codigo_accion ?? "—"} · {row.codigo_especialidad ?? "—"} · {row.tipo_oferta ?? "—"}
                      </p>
                    </td>

                    <td className="px-2 py-1">
                      <p className="font-semibold leading-4">{canalLabel(row.canal_comunicacion)}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.estado_canal}</p>
                    </td>

                    <td className="px-2 py-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.estado)}`}>
                        {row.estado}
                      </span>
                    </td>

                    <td className="px-2 py-1 text-right font-semibold text-red-700">
                      {euro(row.importe_en_riesgo)}
                    </td>

                    <td className="px-2 py-1">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setSeleccionada(row)}
                          className="rounded-lg bg-[#183B63] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                        >
                          Ver traza
                        </button>

                        <Link
                          href={`/oferta-formativa/${row.oferta_id}`}
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
                    <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay trazas técnicas que coincidan con los filtros aplicados.
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
          <section className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Detalle de trazabilidad técnica
              </p>
              <h2 className="mt-0.5 text-base font-semibold">
                {seleccionada.tecnico_nombre ?? "Técnico no identificado"}
              </h2>
              <p className="mt-0.5 text-[11px] text-blue-100">
                {seleccionada.tecnico_unidad ?? "Unidad no indicada"} · {fecha(seleccionada.fecha_emision)}
              </p>
            </div>

            <div className="space-y-2 p-3">
              <section className="grid gap-2 md:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase text-slate-500">Técnico</p>
                  <p className="mt-0.5 text-[13px] font-semibold">{seleccionada.tecnico_nombre ?? "—"}</p>
                  <p className="text-[10px] text-slate-500">{seleccionada.tecnico_email ?? "—"}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase text-slate-500">Unidad</p>
                  <p className="mt-0.5 text-[13px] font-semibold">{seleccionada.tecnico_unidad ?? "—"}</p>
                  <p className="text-[10px] text-slate-500">{seleccionada.tecnico_rol ?? "—"}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase text-slate-500">Fecha actuación</p>
                  <p className="mt-0.5 text-[13px] font-semibold">{fecha(seleccionada.fecha_emision)}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase text-slate-500">Canal</p>
                  <p className="mt-0.5 text-[13px] font-semibold">{canalLabel(seleccionada.canal_comunicacion)}</p>
                </div>
              </section>

              <section className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] leading-5 text-blue-950">
                <p className="font-semibold">Lectura de trazabilidad</p>
                <p className="mt-0.5">
                  Esta pantalla permite defender quién emitió la actuación, cuándo lo hizo, sobre qué entidad y subexpediente,
                  con qué motivo y a través de qué canal quedó registrada la comunicación.
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Actuación</p>
                <p className="mt-0.5 text-[13px] font-semibold">{seleccionada.tipo_actuacion}</p>
                <p className="mt-1 text-[12px] leading-5 text-slate-700">{seleccionada.asunto}</p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  Entidad y subexpediente
                </p>
                <p className="mt-0.5 text-[13px] font-semibold">{seleccionada.entidad_nombre}</p>
                <p className="mt-1 text-[12px] leading-5 text-slate-700">
                  {seleccionada.codigo_accion} · {seleccionada.codigo_especialidad} · {seleccionada.tipo_oferta}
                </p>
              </section>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
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