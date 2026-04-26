"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type ComunicacionCanal = {
  id: number;
  oferta_id: number;
  entidad_id: number;
  tecnico_nombre: string | null;
  tecnico_unidad: string | null;
  tipo_actuacion: string;
  prioridad: string;
  asunto: string;
  mensaje: string;
  evidencia_requerida: string | null;
  estado: string;
  fecha_emision: string | null;
  fecha_limite_respuesta: string | null;
  canal_comunicacion: string;
  estado_canal: string;
  referencia_externa: string | null;
  observacion_canal: string | null;
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

function estadoCanalLabel(value: string | null | undefined) {
  if (value === "registrada_no_enviada") return "Registrada, no enviada";
  if (value === "enviada") return "Enviada";
  if (value === "pendiente_respuesta") return "Pendiente respuesta";
  if (value === "respondida") return "Respondida";
  return value ?? "—";
}

function badgeClass(value: string | null | undefined) {
  const normalizado = String(value ?? "").toLowerCase();

  if (normalizado.includes("no_enviada") || normalizado.includes("alta")) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (normalizado.includes("pendiente") || normalizado.includes("media")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalizado.includes("registrada") || normalizado.includes("emitida")) {
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

export default function ComunicacionesCanalPage() {
  const [comunicaciones, setComunicaciones] = useState<ComunicacionCanal[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [canalFiltro, setCanalFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [seleccionada, setSeleccionada] = useState<ComunicacionCanal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadComunicaciones() {
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

      setComunicaciones((data ?? []) as ComunicacionCanal[]);
      setLoading(false);
    }

    loadComunicaciones();
  }, []);

  const canales = useMemo(() => {
    return Array.from(new Set(comunicaciones.map((row) => row.canal_comunicacion))).filter(Boolean);
  }, [comunicaciones]);

  const estados = useMemo(() => {
    return Array.from(new Set(comunicaciones.map((row) => row.estado_canal))).filter(Boolean);
  }, [comunicaciones]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return comunicaciones.filter((row) => {
      const texto = [
        row.entidad_nombre,
        row.cif,
        row.codigo_accion,
        row.codigo_especialidad,
        row.tipo_actuacion,
        row.asunto,
        row.canal_comunicacion,
        row.estado_canal,
        row.referencia_externa,
        row.tecnico_nombre,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaCanal = canalFiltro === "todos" || row.canal_comunicacion === canalFiltro;
      const pasaEstado = estadoFiltro === "todos" || row.estado_canal === estadoFiltro;

      return pasaBusqueda && pasaCanal && pasaEstado;
    });
  }, [comunicaciones, busqueda, canalFiltro, estadoFiltro]);

  const resumen = useMemo(() => {
    return filtradas.reduce(
      (acc, row) => {
        acc.riesgo += Number(row.importe_en_riesgo ?? 0);
        if (row.canal_comunicacion === "bandeja_institucional_demo") acc.bandeja++;
        if (row.estado_canal === "registrada_no_enviada") acc.noEnviada++;
        if (row.referencia_externa) acc.conReferencia++;
        return acc;
      },
      {
        riesgo: 0,
        bandeja: 0,
        noEnviada: 0,
        conReferencia: 0,
      }
    );
  }, [filtradas]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando comunicaciones y canal...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error cargando comunicaciones / canal</p>
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
            <h1 className="mt-1 text-xl font-semibold">Comunicaciones / canal</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Estado de comunicación institucional, canal previsto y referencia externa futura.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} comunicaciones visibles · {num(comunicaciones.length)} registradas
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver al dashboard
            </Link>
            <Link href="/actuaciones-emitidas" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Actuaciones emitidas
            </Link>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            Canal demo visible · API bidireccional prevista
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-5">
          <Kpi label="Comunicaciones" value={num(filtradas.length)} detail="actuaciones con canal" />
          <Kpi label="Bandeja demo" value={num(resumen.bandeja)} detail="canal interno visible" />
          <Kpi label="No enviadas" value={num(resumen.noEnviada)} detail="pendiente canal oficial" />
          <Kpi label="Referencia externa" value={num(resumen.conReferencia)} detail="API/sede todavía pendiente" />
          <Kpi label="Riesgo asociado" value={euro(resumen.riesgo)} detail="importe vinculado" />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.25fr_0.8fr_0.8fr_auto]">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, acción, actuación, canal, técnico..."
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
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estadoCanalLabel(estado)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setCanalFiltro("todos");
                  setEstadoFiltro("todos");
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-3 py-2">
            <h2 className="text-sm font-semibold">Bandeja de comunicaciones institucionales</h2>
            <p className="text-[11px] text-slate-500">
              Esta pantalla no simula envío externo: muestra el canal previsto y el estado real registrado en backend.
            </p>
          </div>

          <div className="max-h-[610px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Entidad destinataria</th>
                  <th className="px-2 py-2">Actuación</th>
                  <th className="px-2 py-2">Canal previsto</th>
                  <th className="px-2 py-2">Estado canal</th>
                  <th className="px-2 py-2">Referencia externa</th>
                  <th className="px-2 py-2">Fecha emisión</th>
                  <th className="px-2 py-2 text-right">Riesgo</th>
                  <th className="px-2 py-2">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{row.entidad_nombre ?? "—"}</p>
                      <p className="text-[10px] text-slate-500">{row.cif ?? "—"}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {row.codigo_accion ?? "—"} · {row.codigo_especialidad ?? "—"} · {row.tipo_oferta ?? "—"}
                      </p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{row.tipo_actuacion}</p>
                      <p className="text-[10px] text-slate-500">{row.asunto}</p>
                      <p className="text-[10px] text-slate-500">{row.tecnico_nombre ?? "—"}</p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold">{canalLabel(row.canal_comunicacion)}</p>
                      <p className="text-[10px] text-slate-500">Integración API prevista</p>
                    </td>

                    <td className="px-2 py-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.estado_canal)}`}>
                        {estadoCanalLabel(row.estado_canal)}
                      </span>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold">{row.referencia_externa ?? "Pendiente"}</p>
                      <p className="text-[10px] text-slate-500">{row.observacion_canal ?? "Sin observación de canal"}</p>
                    </td>

                    <td className="px-2 py-1.5">{fecha(row.fecha_emision)}</td>

                    <td className="px-2 py-1.5 text-right font-semibold text-red-700">
                      {euro(row.importe_en_riesgo)}
                    </td>

                    <td className="px-2 py-1.5">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setSeleccionada(row)}
                          className="rounded-lg bg-[#183B63] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                        >
                          Ver canal
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
                      No hay comunicaciones que coincidan con los filtros aplicados.
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
                Detalle de comunicación / canal
              </p>
              <h2 className="mt-1 text-lg font-semibold">{canalLabel(seleccionada.canal_comunicacion)}</h2>
              <p className="mt-0.5 text-xs text-blue-100">
                {seleccionada.entidad_nombre} · {seleccionada.codigo_accion} · {seleccionada.codigo_especialidad}
              </p>
            </div>

            <div className="space-y-3 p-5">
              <section className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Canal previsto</p>
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

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Técnico</p>
                  <p className="mt-1 text-sm font-semibold">{seleccionada.tecnico_nombre ?? "—"}</p>
                  <p className="text-[10px] text-slate-500">{seleccionada.tecnico_unidad ?? "—"}</p>
                </div>
              </section>

              <section className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                <p className="font-semibold">Lectura institucional del canal</p>
                <p className="mt-1">
                  Esta comunicación queda registrada en canal demo. En una implantación real, este registro sería
                  el origen técnico para integración bidireccional con API, sede electrónica, carpeta entidad o canal oficial.
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mensaje vinculado</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{seleccionada.mensaje}</p>
              </section>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
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
