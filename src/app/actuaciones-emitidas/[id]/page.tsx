"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

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
  canal_comunicacion: string | null;
  estado_canal: string | null;
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

  if (
    normalizado.includes("alta") ||
    normalizado.includes("riesgo") ||
    normalizado.includes("reintegro")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    normalizado.includes("media") ||
    normalizado.includes("pendiente") ||
    normalizado.includes("revisión") ||
    normalizado.includes("revision")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    normalizado.includes("emitida") ||
    normalizado.includes("registrada") ||
    normalizado.includes("enviada")
  ) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Kpi({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "risk" | "ok" | "warn";
}) {
  const toneClass =
    tone === "risk"
      ? "border-red-200"
      : tone === "ok"
        ? "border-emerald-200"
        : tone === "warn"
          ? "border-amber-200"
          : "border-slate-200";

  return (
    <div className={`rounded-lg border ${toneClass} bg-white px-3 py-1.5 shadow-sm`}>
      <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[14px] font-semibold leading-4 text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9.5px] leading-3 text-slate-500">{detail}</p>
    </div>
  );
}

export default function ActuacionEmitidaDetallePage() {
  const params = useParams();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const actuacionId = Number(idParam);

  const [actuacion, setActuacion] = useState<ActuacionEmitida | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarActuacion() {
      if (!Number.isFinite(actuacionId)) {
        setError("Identificador de actuación emitida no válido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("v_actuaciones_administrativas")
        .select("*")
        .eq("id", actuacionId)
        .maybeSingle();

      if (supabaseError) {
        setError(supabaseError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("No se ha encontrado la actuación emitida solicitada.");
        setLoading(false);
        return;
      }

      setActuacion(data as ActuacionEmitida);
      setLoading(false);
    }

    cargarActuacion();
  }, [actuacionId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando actuación emitida...</p>
        </section>
      </main>
    );
  }

  if (error || !actuacion) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error cargando actuación emitida
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se ha podido cargar la actuación emitida."}
          </pre>
          <Link
            href="/actuaciones-emitidas"
            className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Volver a actuaciones emitidas
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="border-b border-blue-950/20 bg-[#183B63] px-5 py-5 text-white shadow-sm">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold">Detalle de actuación emitida</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Registro técnico de comunicación administrativa, canal institucional y
              trazabilidad del subexpediente.
            </p>
          </div>

          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-right text-xs font-semibold text-blue-50">
            <p>
              {actuacion.codigo_accion ?? "—"} · {actuacion.codigo_especialidad ?? "—"}
            </p>
            <p className="mt-0.5 text-[10px] text-blue-100">
              Actuación #{actuacion.id}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-1.5 px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-blue-800">
            <Link href="/actuaciones-emitidas" className="hover:text-blue-950">
              ← Volver
            </Link>
            <Link href="/acciones" className="hover:text-blue-950">
              Acciones administrativas
            </Link>
            <Link
              href={`/subexpedientes-accion/${actuacion.oferta_id}`}
              className="hover:text-blue-950"
            >
              Ver subexpediente
            </Link>
          </div>

          <span
            className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold shadow-sm ${badgeClass(
              actuacion.prioridad
            )}`}
          >
            Prioridad: {actuacion.prioridad || "—"}
          </span>
        </div>

        <section className="grid gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm lg:grid-cols-[1.35fr_0.65fr_1fr] lg:items-center">
          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
              Entidad beneficiaria
            </p>
            <h2 className="mt-0.5 truncate text-[15px] font-semibold leading-5 text-slate-950">
              {actuacion.entidad_nombre ?? "—"}
            </h2>
            <p className="text-[10.5px] text-slate-500">{actuacion.cif ?? "—"}</p>
          </div>

          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
              Subexpediente
            </p>
            <p className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950">
              {actuacion.codigo_accion ?? "—"}
            </p>
            <p className="text-[10.5px] text-slate-500">
              {actuacion.tipo_oferta ?? "—"}
            </p>
          </div>

          <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
            <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
              Especialidad
            </p>
            <p className="mt-0.5 text-[14px] font-semibold leading-4 text-slate-950">
              {actuacion.codigo_especialidad ?? "—"}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[10.5px] leading-4 text-slate-600">
              {actuacion.denominacion ?? "—"}
            </p>
          </div>
        </section>

        <section className="grid gap-2 lg:grid-cols-5">
          <Kpi
            label="Estado"
            value={actuacion.estado || "—"}
            detail="estado administrativo"
            tone="ok"
          />
          <Kpi
            label="Canal"
            value={canalLabel(actuacion.canal_comunicacion)}
            detail="canal de comunicación"
          />
          <Kpi
            label="Estado canal"
            value={estadoCanalLabel(actuacion.estado_canal)}
            detail="situación de envío"
            tone="warn"
          />
          <Kpi
            label="Riesgo asociado"
            value={euro(actuacion.importe_en_riesgo)}
            detail="importe afectado"
            tone="risk"
          />
          <Kpi
            label="Referencia externa"
            value={actuacion.referencia_externa ?? "Pendiente"}
            detail="sede/API/carpeta"
          />
        </section>

        <section className="grid gap-2 lg:grid-cols-[0.62fr_1.38fr]">
          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Técnico asignado
              </p>
              <p className="mt-0.5 text-[12px] font-semibold leading-4 text-slate-950">
                {actuacion.tecnico_nombre ?? "—"}
              </p>
              <p className="text-[10px] leading-4 text-slate-500">
                {actuacion.tecnico_unidad ?? "—"}
              </p>
              <p className="text-[10px] leading-4 text-slate-500">
                {actuacion.tecnico_email ?? "—"}
              </p>
              <p className="text-[10px] leading-4 text-slate-500">
                {actuacion.tecnico_rol ?? "—"}
              </p>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Fechas
              </p>
              <div className="mt-1 grid gap-1 text-[10.5px]">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Emisión</span>
                  <span className="font-semibold text-slate-950">
                    {fecha(actuacion.fecha_emision)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Límite respuesta</span>
                  <span className="font-semibold text-slate-950">
                    {fecha(actuacion.fecha_limite_respuesta)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Origen del dato
              </p>
              <p className="mt-0.5 line-clamp-1 text-[12px] font-semibold leading-4 text-slate-950">
                {actuacion.fuente_origen ?? "—"}
              </p>
              <p className="text-[10px] leading-4 text-slate-500">
                {actuacion.tipo_dato ?? "—"}
              </p>
              <p className="text-[10px] leading-4 text-slate-500">
                Estado operativo: {actuacion.estado_operativo_administrativo ?? "—"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <section className="rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] leading-4 text-blue-950">
              <p className="font-semibold">Lectura de canal institucional</p>
              <p className="mt-0.5">
                Esta actuación está registrada en la bandeja institucional demo. En fase real, este registro puede actuar como origen de comunicación mediante API bidireccional, sede electrónica, carpeta de entidad o canal oficial que determine la Administración.
              </p>
            </section>

            <div className="grid gap-1.5 lg:grid-cols-[0.8fr_1.2fr]">
              <section className="rounded-md border border-slate-200 bg-white px-3 py-1.5">
                <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                  Tipo de actuación
                </p>
                <p className="mt-0.5 truncate text-[12px] font-semibold leading-4 text-slate-950">
                  {actuacion.tipo_actuacion}
                </p>
              </section>

              <section className="rounded-md border border-slate-200 bg-white px-3 py-1.5">
                <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                  Asunto
                </p>
                <p className="mt-0.5 truncate text-[12px] font-semibold leading-4 text-slate-950">
                  {actuacion.asunto}
                </p>
              </section>
            </div>

            <section className="rounded-md border border-slate-200 bg-white px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Mensaje emitido
              </p>
              <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap text-[11px] leading-4 text-slate-700">
                {actuacion.mensaje}
              </p>
            </section>

            <div className="grid gap-1.5 lg:grid-cols-2">
              <section className="rounded-md border border-slate-200 bg-white px-3 py-1.5">
                <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                  Evidencia requerida
                </p>
                <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-[11px] leading-4 text-slate-700">
                  {actuacion.evidencia_requerida ?? "—"}
                </p>
              </section>

              <section className="rounded-md border border-slate-200 bg-white px-3 py-1.5">
                <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                  Observación de canal
                </p>
                <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-[11px] leading-4 text-slate-700">
                  {actuacion.observacion_canal ?? "—"}
                </p>
              </section>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap justify-end gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <Link
            href={`/subexpedientes-accion/${actuacion.oferta_id}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver subexpediente
          </Link>

          <Link
            href="/actuaciones-emitidas"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Volver a actuaciones emitidas
          </Link>

          <Link
            href="/acciones"
            className="rounded-md bg-[#183B63] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#122f4f]"
          >
            Ir a acciones administrativas
          </Link>
        </section>
      </section>
    </main>
  );
}