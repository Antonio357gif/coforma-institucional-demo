"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type AnyRow = Record<string, any>;

type Actuacion = {
  id: string;
  tipo: string;
  prioridad: "alta" | "media" | "normal";
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

function text(row: AnyRow, keys: string[], fallback = "—") {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function numberValue(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return 0;
}

function priorityClass(prioridad: string) {
  if (prioridad === "alta") return "border-red-200 bg-red-50 text-red-800";
  if (prioridad === "media") return "border-amber-200 bg-amber-50 text-amber-800";
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
    <div className={`rounded-xl border ${toneClass} bg-white px-3 py-3 shadow-sm`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

async function cargarActuacionesAdministrativas(ofertaIdSolicitada: number | null = null) {
  const [alertasRes, ofertaRes] = await Promise.all([
    supabase.from("v_alertas_institucionales_tipificadas").select("*"),
    supabase.from("v_oferta_formativa_institucional").select("*"),
  ]);

  const firstError = alertasRes.error || ofertaRes.error;

  if (firstError) {
    throw firstError;
  }

  const alertas = (alertasRes.data ?? []) as AnyRow[];
  const ofertas = (ofertaRes.data ?? []) as AnyRow[];

  const desdeAlertas: Actuacion[] = alertas.map((row, index) => {
    const tipologia = text(row, ["tipologia_codigo"], "");
    const ofertaId = numberValue(row, ["oferta_id"]);
    const nivel = text(row, ["nivel_aplicado", "nivel_riesgo"], "medio");

    let tipo = "Abrir revisión prioritaria";

    if (tipologia === "PAGOS_ANTICIPADOS") {
      tipo = "Revisar posible reintegro";
    }

    if (tipologia === "DISCREPANCIAS_FORMACION") {
      tipo = "Revisar asistencia / alumnado";
    }

    if (tipologia === "SUPLANTACION_ALUMNOS") {
      tipo = "Abrir revisión prioritaria";
    }

    return {
      id: `alerta-${ofertaId}-${tipologia}-${index}`,
      tipo,
      prioridad: nivel === "alto" ? "alta" : "media",
      entidadId: numberValue(row, ["entidad_id"]),
      entidad: text(row, ["entidad_nombre"]),
      cif: text(row, ["cif"]),
      ofertaId,
      codigoAccion: text(row, ["codigo_accion"]),
      especialidad: text(row, ["codigo_especialidad"]),
      denominacion: text(row, ["denominacion"]),
      motivo: text(row, ["descripcion_caso", "alerta"]),
      evidencia: text(row, ["evidencia_requerida", "regla_alerta_aplicada"]),
      origen: text(row, ["tipologia_nombre"], "Alerta institucional tipificada"),
      destino: ofertaId ? `/subexpedientes-accion/${ofertaId}` : "/acciones",
      importeRiesgo: numberValue(row, ["importe_en_riesgo"]),
      estado: text(row, ["estado_revision"], "pendiente_revision"),
    };
  });

  const desdeOferta: Actuacion[] = ofertas
    .map((row, index) => {
      const estado = text(
        row,
        ["estado_operativo_administrativo", "estado_operativo", "estado_ejecucion", "estado"],
        ""
      );

      const ofertaId = numberValue(row, ["oferta_id", "id"]);
      const incidencias = numberValue(row, ["incidencias_abiertas"]);
      const requerimientos = numberValue(row, ["requerimientos_pendientes"]);
      const riesgo = numberValue(row, ["importe_en_riesgo", "riesgo_economico"]);

      let tipo = "";
      let prioridad: "alta" | "media" | "normal" = "normal";
      let motivo = "";
      let evidenciaRequerida = "";

      if (estado === "en_ejecucion_con_incidencia" || incidencias > 0) {
        tipo = "Requerir documentación";
        prioridad = "media";
        motivo = "Acción en ejecución con incidencia abierta o seguimiento operativo pendiente.";
        evidenciaRequerida =
          "Revisar documentación de ejecución, asistencia, seguimiento y comunicación de incidencias.";
      }

      if (estado === "riesgo_reintegro" || riesgo > 0) {
        tipo = "Revisar posible reintegro";
        prioridad = "alta";
        motivo = "Acción con importe en riesgo o señal de posible reintegro.";
        evidenciaRequerida =
          "Revisar causa del riesgo, alumnado activo, bajas, documentación justificativa y resolución administrativa.";
      }

      if (estado === "finalizada_pendiente_justificacion" || requerimientos > 0) {
        tipo = "Validar cierre / justificación";
        prioridad = prioridad === "alta" ? "alta" : "normal";
        motivo = "Acción finalizada o con requerimiento pendiente de justificación.";
        evidenciaRequerida =
          "Revisar memoria, asistencia, evaluación, documentación final y justificación económica.";
      }

      if (estado === "pendiente_ejecutar") {
        tipo = "Control de inicio";
        prioridad = "normal";
        motivo = "Acción pendiente de ejecución o inicio administrativo.";
        evidenciaRequerida =
          "Comprobar comunicación de inicio, planificación, disponibilidad de alumnado, aula/docente y calendario.";
      }

      if (!tipo && ofertaIdSolicitada && ofertaId === ofertaIdSolicitada) {
        tipo = "Seguimiento ordinario";
        prioridad = "normal";
        motivo = "Actuación administrativa ordinaria solicitada desde el subexpediente.";
        evidenciaRequerida =
          "Registrar seguimiento ordinario del subexpediente, dejando trazabilidad de la revisión técnica.";
      }

      if (!tipo) return null;

      return {
        id: `oferta-${ofertaId}-${estado}-${index}`,
        tipo,
        prioridad,
        entidadId: numberValue(row, ["entidad_id"]),
        entidad: text(row, ["entidad_nombre"]),
        cif: text(row, ["cif"]),
        ofertaId,
        codigoAccion: text(row, ["codigo_accion"]),
        especialidad: text(row, ["codigo_especialidad"]),
        denominacion: text(row, ["denominacion"]),
        motivo,
        evidencia: evidenciaRequerida,
        origen: "Oferta formativa institucional",
        destino: ofertaId ? `/subexpedientes-accion/${ofertaId}` : "/acciones",
        importeRiesgo: riesgo,
        estado: estado || "pendiente_revision",
      };
    })
    .filter(Boolean) as Actuacion[];

  const combinadas = [...desdeAlertas, ...desdeOferta];

  const unicas = Array.from(
    new Map(
      combinadas.map((item) => [
        `${item.tipo}-${item.ofertaId}-${item.origen}`,
        item,
      ])
    ).values()
  );

  unicas.sort((a, b) => {
    const prioridadA = a.prioridad === "alta" ? 1 : a.prioridad === "media" ? 2 : 3;
    const prioridadB = b.prioridad === "alta" ? 1 : b.prioridad === "media" ? 2 : 3;

    if (prioridadA !== prioridadB) return prioridadA - prioridadB;
    return b.importeRiesgo - a.importeRiesgo;
  });

  return unicas;
}

function NuevaActuacionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const accionId = searchParams.get("accionId");
  const ofertaIdParam = searchParams.get("ofertaId");
  const tipoParam = searchParams.get("tipo");
  const origenParam = searchParams.get("origen");

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

  useEffect(() => {
    let activo = true;

    async function loadActuacion() {
      setLoading(true);
      setError(null);

      try {
        const actuaciones = await cargarActuacionesAdministrativas(ofertaIdInicial);

        if (!activo) return;

        const encontrada =
          actuaciones.find((item) => item.id === accionId) ??
          actuaciones.find((item) => {
            const coincideOferta = ofertaIdInicial ? item.ofertaId === ofertaIdInicial : false;
            const coincideTipo = tipoParam ? item.tipo === tipoParam : true;
            const coincideOrigen = origenParam ? item.origen === origenParam : true;

            return coincideOferta && coincideTipo && coincideOrigen;
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
  }, [accionId, ofertaIdInicial, tipoParam, origenParam]);

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

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              ← Volver
            </button>

            <Link href="/acciones" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Bandeja de acciones
            </Link>

            <Link
              href="/actuaciones-emitidas"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Actuaciones emitidas
            </Link>

            {actuacion.ofertaId ? (
              <Link
                href={`/subexpedientes-accion/${actuacion.ofertaId}`}
                className="text-xs font-semibold text-blue-800 hover:text-blue-950"
              >
                Ver subexpediente
              </Link>
            ) : null}
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm ${priorityClass(
              actuacion.prioridad
            )}`}
          >
            Prioridad: {actuacion.prioridad}
          </span>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.7fr_1fr]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad beneficiaria
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{actuacion.entidad}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{actuacion.cif}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Subexpediente
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950">
                {actuacion.codigoAccion}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{actuacion.especialidad}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Especialidad
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {actuacion.denominacion}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-2 lg:grid-cols-4">
          <Kpi label="Tipo de actuación" value={actuacion.tipo} detail={actuacion.origen} />
          <Kpi label="Prioridad" value={actuacion.prioridad} detail="criterio de intervención" />
          <Kpi
            label="Importe en riesgo"
            value={euro(actuacion.importeRiesgo)}
            detail="importe afectado"
            tone="red"
          />
          <Kpi label="Estado origen" value={actuacion.estado} detail="situación detectada" tone="amber" />
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.85fr_1.35fr]">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <section className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                Lectura administrativa
              </p>
              <p className="mt-1">
                Esta pantalla prepara una actuación administrativa vinculada al subexpediente,
                manteniendo trazabilidad entre alerta, oferta, entidad beneficiaria y registro emitido.
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Motivo detectado
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{actuacion.motivo}</p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Evidencia base
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{actuacion.evidencia}</p>
            </section>
          </div>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Asunto
              </label>
              <input
                value={asunto}
                onChange={(event) => setAsunto(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Mensaje a la entidad beneficiaria
              </label>
              <textarea
                value={mensaje}
                onChange={(event) => setMensaje(event.target.value)}
                rows={8}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Evidencia requerida
              </label>
              <textarea
                value={evidencia}
                onChange={(event) => setEvidencia(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div className="max-w-xs">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Fecha límite de respuesta
              </label>
              <input
                type="date"
                value={fechaLimite}
                onChange={(event) => setFechaLimite(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            {resultado ? (
              <div
                className={
                  emitida
                    ? "rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900"
                    : "rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold text-blue-900"
                }
              >
                {resultado}
              </div>
            ) : null}
          </section>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap justify-end gap-2">
            {actuacion.ofertaId ? (
              <Link
                href={`/subexpedientes-accion/${actuacion.ofertaId}`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver subexpediente
              </Link>
            ) : null}

            <Link
              href="/acciones"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver a acciones
            </Link>

            <Link
              href="/actuaciones-emitidas"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver actuaciones emitidas
            </Link>

            <button
              type="button"
              onClick={emitirActuacion}
              disabled={guardando || emitida || !puedeEmitir}
              className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
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
