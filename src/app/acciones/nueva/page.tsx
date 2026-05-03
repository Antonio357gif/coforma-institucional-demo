"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

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

function normalizarPrioridad(value: string | null | undefined): PrioridadActuacion {
  const normalizada = String(value ?? "").trim().toLowerCase();

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

function buildDefaultSubject(item: Actuacion) {
  return `${item.tipo} · ${item.codigoAccion} · ${item.especialidad}`;
}

function buildDefaultMessage(item: Actuacion) {
  return `Se comunica actuación administrativa vinculada al subexpediente ${item.codigoAccion} (${item.especialidad}) de la entidad ${item.entidad}.

Motivo:
${item.motivo}

Evidencia requerida:
${item.evidencia}

La entidad deberá aportar la documentación o aclaración correspondiente dentro del plazo indicado para continuar la revisión administrativa del expediente.`;
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
  tone?: "default" | "red" | "amber" | "green";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200"
      : tone === "amber"
        ? "border-amber-200"
        : tone === "green"
          ? "border-emerald-200"
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

function entidadQueryHref(basePath: string, actuacion: Actuacion | null) {
  if (!actuacion?.entidadId) return basePath;

  const params = new URLSearchParams();

  params.set("entidadId", String(actuacion.entidadId));

  if (actuacion.cif && actuacion.cif !== "—") {
    params.set("cif", actuacion.cif);
  }

  if (actuacion.entidad && actuacion.entidad !== "Entidad no informada") {
    params.set("entidad", actuacion.entidad);
  }

  return `${basePath}?${params.toString()}`;
}

function subexpedienteHref(actuacion: Actuacion | null, tipologiaParam: string | null) {
  if (!actuacion?.ofertaId) return "/acciones";

  const tipologia = tipologiaParam ?? actuacion.tipologiaCodigo;

  if (!tipologia) {
    return actuacion.destino ?? `/subexpedientes-accion/${actuacion.ofertaId}`;
  }

  return `/subexpedientes-accion/${actuacion.ofertaId}?tipologia=${encodeURIComponent(
    tipologia
  )}`;
}

async function cargarActuacionesAdministrativas() {
  const { data, error } = await supabase
    .from("v_acciones_administrativas_pendientes")
    .select("*");

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as AccionPendienteRow[];

  const actuaciones = rows.map(mapRowToActuacion);

  actuaciones.sort((a, b) => {
    const prioridadA =
      a.prioridad === "alta" ? 1 : a.prioridad === "media" ? 2 : a.prioridad === "baja" ? 3 : 4;
    const prioridadB =
      b.prioridad === "alta" ? 1 : b.prioridad === "media" ? 2 : b.prioridad === "baja" ? 3 : 4;

    if (prioridadA !== prioridadB) return prioridadA - prioridadB;
    return b.importeRiesgo - a.importeRiesgo;
  });

  return actuaciones;
}

function NuevaActuacionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const accionId = searchParams.get("accionId");
  const ofertaIdParam = searchParams.get("ofertaId");
  const tipoParam = searchParams.get("tipo");
  const origenParam = searchParams.get("origen");
  const tipologiaParam = searchParams.get("tipologia");

  const [actuacion, setActuacion] = useState<Actuacion | null>(null);
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [evidencia, setEvidencia] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [emitida, setEmitida] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ofertaIdInicial = ofertaIdParam ? Number(ofertaIdParam) : null;

  const accionesFiltradasHref = useMemo(
    () => entidadQueryHref("/acciones", actuacion),
    [actuacion]
  );

  const actuacionesEmitidasFiltradasHref = useMemo(
    () => entidadQueryHref("/actuaciones-emitidas", actuacion),
    [actuacion]
  );

  const subexpedienteFiltradoHref = useMemo(
    () => subexpedienteHref(actuacion, tipologiaParam),
    [actuacion, tipologiaParam]
  );

  useEffect(() => {
    let activo = true;

    async function loadActuacion() {
      setLoading(true);
      setError(null);

      try {
        const actuaciones = await cargarActuacionesAdministrativas();

        if (!activo) return;

        const encontrada =
          actuaciones.find((item) => item.id === accionId) ??
          actuaciones.find((item) => {
            const coincideOferta = ofertaIdInicial ? item.ofertaId === ofertaIdInicial : false;
            const coincideTipo = tipoParam ? item.tipo === tipoParam : true;
            const coincideOrigen = origenParam ? item.origen === origenParam : true;
            const coincideTipologia = tipologiaParam
              ? item.tipologiaCodigo === tipologiaParam
              : true;

            return coincideOferta && coincideTipo && coincideOrigen && coincideTipologia;
          }) ??
          null;

        if (!encontrada) {
          setActuacion(null);
          setError("No se encontró la actuación administrativa solicitada.");
          setLoading(false);
          return;
        }

        setActuacion(encontrada);
        setAsunto(buildDefaultSubject(encontrada));
        setMensaje(buildDefaultMessage(encontrada));
        setEvidencia(encontrada.evidencia);
        setFechaLimite("");
        setResultado(null);
        setEmitida(false);
        setLoading(false);
      } catch (err: any) {
        if (!activo) return;

        setError(err?.message ?? "No se pudo cargar la actuación administrativa.");
        setLoading(false);
      }
    }

    loadActuacion();

    return () => {
      activo = false;
    };
  }, [accionId, ofertaIdInicial, tipoParam, origenParam, tipologiaParam]);

  const puedeEmitir = useMemo(() => {
    return Boolean(
      actuacion?.ofertaId &&
        actuacion?.entidadId &&
        asunto.trim() &&
        mensaje.trim() &&
        evidencia.trim()
    );
  }, [actuacion, asunto, mensaje, evidencia]);

  async function emitirActuacion() {
    if (!actuacion || !actuacion.ofertaId || !actuacion.entidadId) {
      setResultado("No se puede emitir la actuación: falta oferta o entidad vinculada.");
      return;
    }

    if (!puedeEmitir) {
      setResultado("Revisa asunto, mensaje y evidencia antes de emitir la actuación.");
      return;
    }

    setGuardando(true);
    setResultado(null);

    const { error: insertError } = await supabase.from("actuaciones_administrativas").insert({
      oferta_id: actuacion.ofertaId,
      entidad_id: actuacion.entidadId,
      tipo_actuacion: actuacion.tipo,
      prioridad: actuacion.prioridad,
      asunto,
      mensaje,
      evidencia_requerida: evidencia,
      estado: "emitida",
      fecha_emision: new Date().toISOString(),
      fecha_limite_respuesta: fechaLimite || null,
      fuente_origen: actuacion.origen,
      tipo_dato: "simulacion_controlada_demo_institucional",
    });

    setGuardando(false);

    if (insertError) {
      setResultado(`Error al emitir actuación: ${insertError.message}`);
      return;
    }

    setEmitida(true);
    setResultado("Actuación administrativa emitida y registrada correctamente.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando emisión de actuación administrativa...</p>
        </section>
      </main>
    );
  }

  if (error || !actuacion) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            No se pudo preparar la actuación administrativa
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se encontró la actuación solicitada."}
          </pre>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver
            </button>

            <Link
              href="/acciones"
              className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white hover:bg-[#122f4f]"
            >
              Ir a acciones administrativas
            </Link>
          </div>
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
            <h1 className="mt-1 text-xl font-semibold">Emitir actuación administrativa</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Preparación, validación y registro de actuación sobre subexpediente fiscalizable.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {actuacion.codigoAccion} · {actuacion.especialidad}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-1.5 px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              ← Volver
            </button>

            <Link
              href={accionesFiltradasHref}
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Bandeja de acciones
            </Link>

            <Link
              href={actuacionesEmitidasFiltradasHref}
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Actuaciones emitidas
            </Link>

            {actuacion.ofertaId ? (
              <Link
                href={subexpedienteFiltradoHref}
                className="text-xs font-semibold text-blue-800 hover:text-blue-950"
              >
                Ver subexpediente
              </Link>
            ) : null}
          </div>

          <span
            className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold shadow-sm ${priorityClass(
              actuacion.prioridad
            )}`}
          >
            Prioridad: {actuacion.prioridad}
          </span>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.1fr_0.7fr_1fr] lg:items-center">
            <div>
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad beneficiaria
              </p>
              <h2 className="mt-0.5 truncate text-[15px] font-semibold leading-5 text-slate-950">
                {actuacion.entidad}
              </h2>
              <p className="text-[10.5px] text-slate-500">{actuacion.cif}</p>
            </div>

            <div>
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Subexpediente
              </p>
              <p className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950">
                {actuacion.codigoAccion}
              </p>
              <p className="text-[10.5px] text-slate-500">{actuacion.especialidad}</p>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Especialidad
              </p>
              <p className="mt-0.5 line-clamp-1 text-[13px] font-semibold leading-4 text-slate-950">
                {actuacion.denominacion}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-2 lg:grid-cols-4">
          <Kpi label="Tipo de actuación" value={actuacion.tipo} detail={actuacion.origen} />
          <Kpi label="Prioridad" value={actuacion.prioridad} detail="criterio backend" />
          <Kpi
            label="Importe en riesgo"
            value={euro(actuacion.importeRiesgo)}
            detail="importe afectado"
            tone="red"
          />
          <Kpi label="Estado origen" value={actuacion.estado} detail="situación detectada" tone="amber" />
        </section>

        <section className="grid gap-2 lg:grid-cols-[0.62fr_1.38fr]">
          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <section className="rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] leading-4 text-blue-950">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-blue-700">
                Lectura administrativa
              </p>
              <p className="mt-0.5">
                Esta pantalla prepara una actuación administrativa desde la vista backend de pendientes,
                manteniendo trazabilidad entre alerta, oferta, entidad beneficiaria y registro emitido.
              </p>
            </section>

            <section className="rounded-md border border-slate-200 bg-white px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Motivo detectado
              </p>
              <p className="mt-0.5 line-clamp-5 text-[11px] leading-4 text-slate-700">
                {actuacion.motivo}
              </p>
            </section>

            <section className="rounded-md border border-slate-200 bg-white px-3 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Evidencia base
              </p>
              <p className="mt-0.5 line-clamp-5 text-[11px] leading-4 text-slate-700">
                {actuacion.evidencia}
              </p>
            </section>
          </div>

          <section className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Asunto
              </label>
              <input
                value={asunto}
                onChange={(event) => setAsunto(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Mensaje a la entidad beneficiaria
              </label>
              <textarea
                value={mensaje}
                onChange={(event) => setMensaje(event.target.value)}
                rows={5}
                className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] leading-4 outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Evidencia requerida
              </label>
              <textarea
                value={evidencia}
                onChange={(event) => setEvidencia(event.target.value)}
                rows={2}
                className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] leading-4 outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div className="max-w-xs">
              <label className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-500">
                Fecha límite de respuesta
              </label>
              <input
                type="date"
                value={fechaLimite}
                onChange={(event) => setFechaLimite(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            {resultado ? (
              <div
                className={
                  emitida
                    ? "rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-900"
                    : "rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-900"
                }
              >
                {resultado}
              </div>
            ) : null}
          </section>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <div className="flex flex-wrap justify-end gap-2">
            {actuacion.ofertaId ? (
              <Link
                href={subexpedienteFiltradoHref}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver subexpediente
              </Link>
            ) : null}

            <Link
              href={accionesFiltradasHref}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver a acciones
            </Link>

            <Link
              href={actuacionesEmitidasFiltradasHref}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver actuaciones emitidas
            </Link>

            <button
              type="button"
              onClick={emitirActuacion}
              disabled={guardando || emitida || !puedeEmitir}
              className="rounded-md bg-[#183B63] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
            >
              {guardando ? "Emitiendo..." : emitida ? "Actuación emitida" : "Emitir y registrar actuación"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default function NuevaActuacionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
          <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Cargando emisión de actuación administrativa...</p>
          </section>
        </main>
      }
    >
      <NuevaActuacionContent />
    </Suspense>
  );
}