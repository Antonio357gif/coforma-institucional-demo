"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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

type Decision = {
  decision_recomendada: string;
  prioridad_operativa: string;
  acciones: number;
  acciones_af: number;
  acciones_cp: number;
  entidades_afectadas: number;
  importe_concedido: number;
  importe_ejecutado: number;
  importe_en_riesgo: number;
  alumnos_inicio: number;
  alumnos_activos: number;
  bajas: number;
  media_porcentaje_alumnos_activos: number | null;
  media_porcentaje_bajas: number | null;
  media_porcentaje_importe_en_riesgo: number | null;
};

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
  porcentaje_importe_en_riesgo: number;
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

type Accion = {
  oferta_id: number;
  entidad_id: number;
  entidad_nombre: string;
  cif: string;
  codigo_accion: string;
  tipo_oferta: string;
  codigo_especialidad: string;
  denominacion: string;
  familia_profesional: string | null;
  modalidad: string | null;
  horas: number | null;
  importe_concedido: number;
  importe_ejecutado: number;
  importe_en_riesgo: number;
  porcentaje_importe_en_riesgo: number;
  alumnos_inicio: number;
  alumnos_activos: number;
  bajas: number;
  porcentaje_alumnos_activos: number | null;
  porcentaje_bajas: number | null;
  estado_ejecucion: string;
  nivel_riesgo: string;
  alerta: string;
  decision_recomendada: string;
  prioridad_operativa: string;
};

type Trazabilidad = Accion & {
  evidencia_a_revisar: string;
  lectura_institucional: string;
  recomendacion_institucional: string;
  estado_trazabilidad_resolucion: string;
  estado_trazabilidad_ejecucion: string;
  regla_alerta_aplicada: string | null;
  fuente_resolucion: string | null;
  fuente_ejecucion: string | null;
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
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value)} %`;
}

function riskClass(risk: string) {
  if (risk === "alto") return "border-red-200 bg-red-50 text-red-800";
  if (risk === "medio") return "border-amber-200 bg-amber-50 text-amber-800";
  if (risk === "sin_datos") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function priorityClass(priority: string) {
  if (priority === "Prioridad alta") return "border-red-200 bg-red-50 text-red-800";
  if (priority === "Prioridad media") return "border-amber-200 bg-amber-50 text-amber-800";
  if (priority === "Pendiente de inicio") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function Home() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [decisiones, setDecisiones] = useState<Decision[]>([]);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [trazabilidad, setTrazabilidad] = useState<Trazabilidad[]>([]);
  const [selectedEntidadId, setSelectedEntidadId] = useState<number | null>(null);
  const [selectedOfertaId, setSelectedOfertaId] = useState<number | null>(null);
  const [riskFilter, setRiskFilter] = useState<"todos" | "alto" | "medio" | "bajo">("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      const [resumenRes, decisionesRes, entidadesRes, accionesRes, trazabilidadRes] = await Promise.all([
        supabase.from("v_fiscalizacion_resumen").select("*").single(),
        supabase.from("v_fiscalizacion_decisiones").select("*"),
        supabase.from("v_fiscalizacion_ficha_entidad").select("*").order("importe_en_riesgo", { ascending: false }),
        supabase.from("v_fiscalizacion_acciones_operativas").select("*").order("importe_en_riesgo", { ascending: false }),
        supabase.from("v_fiscalizacion_trazabilidad_accion").select("*").order("importe_en_riesgo", { ascending: false }),
      ]);

      const firstError =
        resumenRes.error ||
        decisionesRes.error ||
        entidadesRes.error ||
        accionesRes.error ||
        trazabilidadRes.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const loadedResumen = resumenRes.data as Resumen;
      const loadedDecisiones = (decisionesRes.data ?? []) as Decision[];
      const loadedEntidades = (entidadesRes.data ?? []) as Entidad[];
      const loadedAcciones = (accionesRes.data ?? []) as Accion[];
      const loadedTrazabilidad = (trazabilidadRes.data ?? []) as Trazabilidad[];

      setResumen(loadedResumen);
      setDecisiones(loadedDecisiones);
      setEntidades(loadedEntidades);
      setAcciones(loadedAcciones);
      setTrazabilidad(loadedTrazabilidad);

      const firstEntity = loadedEntidades[0];
      if (firstEntity) {
        setSelectedEntidadId(firstEntity.entidad_id);
        const firstAction = loadedAcciones.find((a) => a.entidad_id === firstEntity.entidad_id);
        if (firstAction) setSelectedOfertaId(firstAction.oferta_id);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const selectedEntidad = useMemo(
    () => entidades.find((entidad) => entidad.entidad_id === selectedEntidadId) ?? null,
    [entidades, selectedEntidadId]
  );

  const accionesEntidad = useMemo(() => {
    return acciones
      .filter((accion) => accion.entidad_id === selectedEntidadId)
      .filter((accion) => riskFilter === "todos" || accion.nivel_riesgo === riskFilter);
  }, [acciones, selectedEntidadId, riskFilter]);

  const selectedAccion = useMemo(
    () => trazabilidad.find((accion) => accion.oferta_id === selectedOfertaId) ?? null,
    [trazabilidad, selectedOfertaId]
  );

  function selectEntidad(entidadId: number) {
    setSelectedEntidadId(entidadId);
    const firstAction = acciones.find((accion) => accion.entidad_id === entidadId);
    setSelectedOfertaId(firstAction?.oferta_id ?? null);
    setRiskFilter("todos");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/10 p-8">
          Cargando mesa de fiscalización institucional...
        </div>
      </main>
    );
  }

  if (error || !resumen) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <section className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error conectando con Supabase</p>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se pudo cargar el resumen institucional."}
          </pre>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <section className="bg-[#183B63] px-6 py-6 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Mesa de fiscalización FPED 2025</h1>
            <p className="mt-1 text-sm text-blue-100">
              {resumen.convocatoria_codigo} · {resumen.convocatoria_nombre}
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm">
            <p className="font-semibold">Resolución oficial + ejecución trazada</p>
            <p className="text-xs text-blue-100">
              Concesión oficial cargada · Ejecución marcada como simulación demo
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-5 px-6 py-5">
        <section className="grid gap-3 lg:grid-cols-6">
          <button className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Entidades</p>
            <p className="mt-2 text-2xl font-semibold">{num(resumen.entidades_beneficiarias)}</p>
            <p className="text-xs text-slate-500">beneficiarias</p>
          </button>

          <button className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Acciones</p>
            <p className="mt-2 text-2xl font-semibold">{num(resumen.acciones_concedidas)}</p>
            <p className="text-xs text-slate-500">{num(resumen.acciones_af)} AF · {num(resumen.acciones_cp)} CP</p>
          </button>

          <button className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Concedido</p>
            <p className="mt-2 text-xl font-semibold">{euro(resumen.importe_total_concedido)}</p>
            <p className="text-xs text-slate-500">cuadrado al céntimo</p>
          </button>

          <button className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Ejecutado</p>
            <p className="mt-2 text-xl font-semibold">{euro(resumen.importe_total_ejecutado)}</p>
            <p className="text-xs text-slate-500">simulado demo</p>
          </button>

          <button
            onClick={() => setRiskFilter("alto")}
            className="rounded-2xl border border-red-200 bg-white p-4 text-left shadow-sm hover:border-red-400"
          >
            <p className="text-[11px] font-semibold uppercase text-slate-500">Riesgo</p>
            <p className="mt-2 text-xl font-semibold text-red-700">{euro(resumen.importe_total_en_riesgo)}</p>
            <p className="text-xs text-slate-500">{num(resumen.alertas_altas)} alertas altas</p>
          </button>

          <button
            onClick={() => setRiskFilter("medio")}
            className="rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-sm hover:border-amber-400"
          >
            <p className="text-[11px] font-semibold uppercase text-slate-500">Seguimiento</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">{num(resumen.alertas_medias)}</p>
            <p className="text-xs text-slate-500">incidencias medias</p>
          </button>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_1.45fr]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-semibold">Ranking de entidades</h2>
              <p className="text-xs text-slate-500">
                Clic sobre una entidad para abrir su ficha operativa.
              </p>
            </div>

            <div className="max-h-[720px] overflow-auto">
              {entidades.map((entidad) => (
                <button
                  key={entidad.entidad_id}
                  onClick={() => selectEntidad(entidad.entidad_id)}
                  className={`w-full border-b border-slate-100 p-4 text-left hover:bg-blue-50 ${
                    selectedEntidadId === entidad.entidad_id ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{entidad.entidad_nombre}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{entidad.cif}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${riskClass(entidad.nivel_riesgo_global)}`}>
                      {entidad.nivel_riesgo_global}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p className="text-slate-500">Acciones</p>
                      <p className="font-semibold">{num(entidad.acciones_concedidas)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Riesgo</p>
                      <p className="font-semibold text-red-700">{euro(entidad.importe_en_riesgo)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Prioridad</p>
                      <p className="font-semibold">{entidad.prioridad_principal}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {selectedEntidad && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Ficha operativa de entidad</p>
                    <h2 className="mt-1 text-lg font-semibold">{selectedEntidad.entidad_nombre}</h2>
                    <p className="text-xs text-slate-500">
                      {selectedEntidad.cif} · {selectedEntidad.entidad_isla ?? "Canarias"} · {selectedEntidad.entidad_municipio ?? "varios municipios"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityClass(selectedEntidad.prioridad_principal)}`}>
                    {selectedEntidad.prioridad_principal}
                  </span>
                </div>

                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  {selectedEntidad.resumen_operativo}
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-500">Concedido</p>
                    <p className="text-sm font-semibold">{euro(selectedEntidad.importe_concedido)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-500">Ejecutado</p>
                    <p className="text-sm font-semibold">{euro(selectedEntidad.importe_ejecutado)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-500">En riesgo</p>
                    <p className="text-sm font-semibold text-red-700">{euro(selectedEntidad.importe_en_riesgo)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-500">Alumnado activo</p>
                    <p className="text-sm font-semibold">{num(selectedEntidad.alumnos_activos)} · {pct(selectedEntidad.porcentaje_alumnos_activos)}</p>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Acciones de la entidad</h2>
                  <p className="text-xs text-slate-500">
                    Clic sobre una acción para abrir su trazabilidad institucional.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["todos", "alto", "medio", "bajo"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRiskFilter(filter)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        riskFilter === filter ? "border-blue-400 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[360px] overflow-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Curso</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Denominación</th>
                      <th className="px-3 py-2">Concedido</th>
                      <th className="px-3 py-2">Riesgo</th>
                      <th className="px-3 py-2">Nivel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accionesEntidad.map((accion) => (
                      <tr
                        key={accion.oferta_id}
                        onClick={() => setSelectedOfertaId(accion.oferta_id)}
                        className={`cursor-pointer border-t border-slate-100 hover:bg-blue-50 ${
                          selectedOfertaId === accion.oferta_id ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-3 py-2 font-semibold">{accion.codigo_accion}</td>
                        <td className="px-3 py-2">{accion.tipo_oferta}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{accion.codigo_especialidad}</p>
                          <p className="line-clamp-1 text-slate-500">{accion.denominacion}</p>
                        </td>
                        <td className="px-3 py-2">{euro(accion.importe_concedido)}</td>
                        <td className="px-3 py-2 text-red-700">{euro(accion.importe_en_riesgo)}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${riskClass(accion.nivel_riesgo)}`}>
                            {accion.nivel_riesgo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedAccion && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Trazabilidad institucional por acción</p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {selectedAccion.codigo_accion} · {selectedAccion.codigo_especialidad}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">{selectedAccion.denominacion}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityClass(selectedAccion.prioridad_operativa)}`}>
                    {selectedAccion.prioridad_operativa}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-500">Importe concedido</p>
                    <p className="text-sm font-semibold">{euro(selectedAccion.importe_concedido)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-500">Importe ejecutado</p>
                    <p className="text-sm font-semibold">{euro(selectedAccion.importe_ejecutado)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-500">Importe en riesgo</p>
                    <p className="text-sm font-semibold text-red-700">{euro(selectedAccion.importe_en_riesgo)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-500">Bajas</p>
                    <p className="text-sm font-semibold">{num(selectedAccion.bajas)} · {pct(selectedAccion.porcentaje_bajas)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-800">Decisión recomendada</p>
                    <p className="mt-1 text-sm text-slate-700">{selectedAccion.decision_recomendada}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-800">Evidencia a revisar</p>
                    <p className="mt-1 text-sm text-slate-700">{selectedAccion.evidencia_a_revisar}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-800">Recomendación institucional</p>
                    <p className="mt-1 text-sm text-slate-700">{selectedAccion.recomendacion_institucional}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
                  <p className="font-semibold">Lectura institucional</p>
                  <p className="mt-1">{selectedAccion.lectura_institucional}</p>
                  <p className="mt-2">
                    {selectedAccion.estado_trazabilidad_resolucion} · {selectedAccion.estado_trazabilidad_ejecucion}
                  </p>
                </div>
              </section>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Carga administrativa por decisión</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            {decisiones.map((decision) => (
              <div key={`${decision.decision_recomendada}-${decision.prioridad_operativa}`} className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-semibold">{decision.decision_recomendada}</p>
                <p className="mt-2 text-2xl font-semibold">{num(decision.acciones)}</p>
                <p className="text-[11px] text-slate-500">{num(decision.entidades_afectadas)} entidades afectadas</p>
                <p className="mt-2 text-[11px] text-red-700">{euro(decision.importe_en_riesgo)} en riesgo</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-800">Trazabilidad</p>
          <p className="mt-1">{resumen.nota_trazabilidad}</p>
        </footer>
      </section>
    </main>
  );
}
