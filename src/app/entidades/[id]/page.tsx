"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

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

type OfertaRow = Record<string, any>;

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

function pct(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value)} %`;
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

function formatEstado(value: string) {
  const normalizado = value.trim().toLowerCase();

  const estados: Record<string, string> = {
    en_ejecucion: "En ejecución",
    pendiente_ejecutar: "Pendiente de ejecutar",
    no_iniciada: "No iniciada",
    finalizada: "Finalizada",
    en_ejecucion_con_incidencia: "En ejecución con incidencia",
    finalizada_pendiente_justificacion: "Finalizada pendiente de justificación",
    riesgo_reintegro: "Riesgo de reintegro",
    justificada: "Justificada",
    incidencia: "Incidencia",
    programada: "Programada",
    sin_estado: "Sin estado",
  };

  if (estados[normalizado]) {
    return estados[normalizado];
  }

  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function badgeClass(value: string) {
  const normalizado = value.toLowerCase();

  if (normalizado.includes("alta") || normalizado.includes("alto") || normalizado.includes("riesgo")) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (normalizado.includes("media") || normalizado.includes("medio") || normalizado.includes("preventivo")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalizado.includes("bajo") || normalizado.includes("ordinario") || normalizado.includes("ejecucion")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (normalizado.includes("pendiente")) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function economicControlClass(value: number | null | undefined) {
  const amount = value ?? 0;

  if (amount > 0) {
    return "text-red-700";
  }

  return "text-emerald-700";
}

function DataCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
      <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[14px] font-semibold leading-4 text-slate-950">
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export default function ExpedienteEntidadPage() {
  const params = useParams();
  const entidadId = Number(params.id);

  const [entidad, setEntidad] = useState<Entidad | null>(null);
  const [acciones, setAcciones] = useState<OfertaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEntidad() {
      setLoading(true);
      setError(null);

      const [entidadRes, accionesRes] = await Promise.all([
        supabase
          .from("v_fiscalizacion_ficha_entidad")
          .select("*")
          .eq("entidad_id", entidadId)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("v_oferta_formativa_institucional")
          .select("*")
          .eq("entidad_id", entidadId)
          .order("importe_en_riesgo", { ascending: false }),
      ]);

      const firstError = entidadRes.error || accionesRes.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      if (!entidadRes.data) {
        setError("No se encontró la entidad solicitada.");
        setLoading(false);
        return;
      }

      setEntidad(entidadRes.data as Entidad);
      setAcciones((accionesRes.data ?? []) as OfertaRow[]);
      setLoading(false);
    }

    if (!Number.isNaN(entidadId)) {
      loadEntidad();
    } else {
      setError("Identificador de entidad no válido.");
      setLoading(false);
    }
  }, [entidadId]);

  const accionesConControlEspecifico = useMemo(() => {
    return acciones.filter((row) => {
      const estado = text(row, ["estado_operativo_administrativo", "estado_operativo", "estado_ejecucion", "estado"], "").toLowerCase();
      const riesgo = numberValue(row, ["importe_en_riesgo", "riesgo_economico"]);
      const incidencias = numberValue(row, ["incidencias_abiertas"]);
      return estado.includes("riesgo") || estado.includes("incidencia") || riesgo > 0 || incidencias > 0;
    });
  }, [acciones]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando expediente de entidad...</p>
        </section>
      </main>
    );
  }

  if (error || !entidad) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <Link href="/entidades" className="text-xs font-semibold text-blue-800">
            ← Volver a entidades
          </Link>
          <p className="mt-4 text-sm font-semibold text-red-700">Error cargando expediente</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se pudo cargar la entidad."}
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
            <h1 className="mt-1 text-xl font-semibold">Expediente de entidad beneficiaria</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              {entidad.entidad_nombre} · {entidad.cif}
            </p>
          </div>

          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(entidad.prioridad_principal)}`}>
            {entidad.prioridad_principal}
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-1.5 px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/entidades" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            ← Volver a entidades
          </Link>

          <span className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold ${badgeClass(entidad.nivel_riesgo_global)}`}>
            Nivel de control: {entidad.nivel_riesgo_global}
          </span>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1fr_1.25fr] lg:items-center">
            <div>
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad beneficiaria
              </p>
              <h2 className="mt-0.5 truncate text-[15px] font-semibold leading-5 text-slate-950">
                {entidad.entidad_nombre}
              </h2>
              <p className="text-[10.5px] text-slate-500">
                {entidad.cif} · {entidad.entidad_isla ?? "Canarias"} ·{" "}
                {entidad.entidad_municipio ?? "Varios municipios"}
              </p>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] leading-4 text-slate-700">
              {entidad.resumen_operativo}
            </div>
          </div>
        </section>

        <section className="grid gap-2 lg:grid-cols-5">
          <DataCard
            label="Acciones concedidas"
            value={num(entidad.acciones_concedidas)}
            detail={`${num(entidad.acciones_af)} AF · ${num(entidad.acciones_cp)} CP`}
          />
          <DataCard label="Importe concedido" value={euro(entidad.importe_concedido)} />
          <DataCard
            label="Control económico"
            value={euro(entidad.importe_en_riesgo)}
            detail={
              entidad.importe_en_riesgo > 0
                ? pct(entidad.porcentaje_importe_en_riesgo)
                : "sin revisión económica activa"
            }
          />
          <DataCard
            label="Alumnado activo"
            value={num(entidad.alumnos_activos)}
            detail={`${num(entidad.alumnos_inicio)} inicio · ${pct(entidad.porcentaje_alumnos_activos)}`}
          />
          <DataCard
            label="Bajas"
            value={num(entidad.bajas)}
            detail={pct(entidad.porcentaje_bajas)}
          />
        </section>

        <section className="grid gap-2 lg:grid-cols-[0.55fr_1.45fr]">
          <div className="space-y-1.5">
            <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <h3 className="text-[13px] font-semibold leading-5">Lectura institucional</h3>
              <p className="mt-1 line-clamp-4 text-[11px] leading-4 text-slate-700">
                {entidad.decision_principal}
              </p>

              <div className="mt-2 grid gap-1.5">
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
                  <p className="text-[8.5px] font-semibold uppercase text-slate-500">Controles críticos activos</p>
                  <p className={`mt-0.5 text-[14px] font-semibold leading-4 ${entidad.alertas_altas > 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {num(entidad.alertas_altas)}
                  </p>
                </div>

                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
                  <p className="text-[8.5px] font-semibold uppercase text-slate-500">Seguimientos preventivos</p>
                  <p className={`mt-0.5 text-[14px] font-semibold leading-4 ${entidad.alertas_medias > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {num(entidad.alertas_medias)}
                  </p>
                </div>

                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
                  <p className="text-[8.5px] font-semibold uppercase text-slate-500">Controles específicos</p>
                  <p className={`mt-0.5 text-[14px] font-semibold leading-4 ${accionesConControlEspecifico.length > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {num(accionesConControlEspecifico.length)}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-3 py-1.5">
              <h3 className="text-[14px] font-semibold leading-5">Subexpedientes de acción asociados</h3>
              <p className="text-[10.5px] leading-4 text-slate-500">
                Clic en una acción para abrir su subexpediente individual.
              </p>
            </div>

            <div className="max-h-[640px] overflow-auto">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9.5px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">Código</th>
                    <th className="px-2 py-1.5">Tipo</th>
                    <th className="px-2 py-1.5">Especialidad</th>
                    <th className="px-2 py-1.5">Denominación</th>
                    <th className="px-2 py-1.5">Estado</th>
                    <th className="px-2 py-1.5 text-right">Concedido</th>
                    <th className="px-2 py-1.5 text-right">Control económico</th>
                  </tr>
                </thead>

                <tbody>
                  {acciones.map((row, index) => {
                    const ofertaId = text(row, ["oferta_id", "id"], String(index));
                    const estado = text(row, ["estado_operativo_administrativo", "estado_operativo", "estado_ejecucion", "estado"], "sin estado");
                    const controlEconomico = numberValue(row, ["importe_en_riesgo", "riesgo_economico"]);

                    return (
                      <tr
                        key={`${ofertaId}-${index}`}
                        className="cursor-pointer border-t border-slate-100 hover:bg-blue-50"
                        onClick={() => {
                          if (ofertaId) window.location.href = `/subexpedientes-accion/${ofertaId}`;
                        }}
                      >
                        <td className="px-2 py-1 font-semibold leading-4">
                          {text(row, ["codigo_accion", "codigo_administrativo"])}
                        </td>
                        <td className="px-2 py-1 leading-4">
                          {text(row, ["tipo_oferta", "tipo", "tipo_accion"])}
                        </td>
                        <td className="px-2 py-1 font-medium leading-4">
                          {text(row, ["codigo_especialidad", "especialidad"])}
                        </td>
                        <td className="max-w-[260px] px-2 py-1">
                          <p className="line-clamp-1 leading-4">
                            {text(row, ["denominacion", "nombre_accion", "nombre"])}
                          </p>
                        </td>
                        <td className="px-2 py-1">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(estado)}`}>
                            {formatEstado(estado)}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-right font-medium">
                          {euro(numberValue(row, ["importe_concedido", "importe_total_concedido"]))}
                        </td>
                        <td className={`px-2 py-1 text-right font-medium ${economicControlClass(controlEconomico)}`}>
                          {euro(controlEconomico)}
                        </td>
                      </tr>
                    );
                  })}

                  {acciones.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-xs text-slate-500">
                        Esta entidad no tiene acciones asociadas en la vista institucional.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}