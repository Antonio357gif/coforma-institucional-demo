"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type AccionDetalle = {
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
  porcentaje_importe_en_riesgo: number | null;
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
  evidencia_a_revisar: string;
  lectura_institucional: string;
  recomendacion_institucional: string;
  estado_trazabilidad_resolucion: string;
  estado_trazabilidad_ejecucion: string;
  regla_alerta_aplicada: string | null;
  fuente_resolucion: string | null;
  fuente_ejecucion: string | null;
};

type AlertaTipificada = {
  oferta_id: number;
  tipologia_codigo: string;
  tipologia_nombre: string;
  nivel_aplicado: string;
  evidencia_requerida: string;
  descripcion_caso: string;
  estado_revision: string;
};

type SubexpedientePago = {
  id: number;
  oferta_concedida_id: number;
  estado_operativo_administrativo: string | null;
  documentacion_estado: string | null;
  estado_pago_administrativo: string | null;
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

function pct(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(Number(value))} %`;
}

function normalizar(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function textoPlano(value: string | null | undefined) {
  return String(value ?? "—").replaceAll("_", " ");
}

function estadoOperativoLabel(value: string | null | undefined) {
  const estado = normalizar(value);

  if (estado === "en_ejecucion") return "En ejecución";
  if (estado === "finalizada") return "Finalizada";
  if (estado === "pendiente_ejecutar") return "Pendiente de ejecutar";
  if (estado === "en_ejecucion_con_incidencia") return "Revisión/Riesgo";
  if (estado === "riesgo_reintegro") return "Revisión/Riesgo";
  if (estado === "finalizada_pendiente_justificacion") return "Finalizada";
  if (!estado) return "Sin estado";

  return textoPlano(value);
}

function estadoOperativoClass(value: string | null | undefined) {
  const estado = normalizar(value);

  if (estado.includes("riesgo") || estado.includes("incidencia")) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (estado.includes("pendiente")) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (estado.includes("finalizada") || estado.includes("justificacion")) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (estado.includes("ejecucion")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function pagoLabel(value: string | null | undefined) {
  const estado = normalizar(value);

  if (estado === "pagado") return "Pagado";
  if (estado === "en_ejecucion_no_abonado") return "En ejecución · pendiente de devengo";
  if (estado === "en_revision_parcial") return "En revisión parcial";
  if (estado === "no_devengado") return "No devengado";
  if (estado === "retenido_revision") return "Retenido por revisión";
  if (estado === "retenido_riesgo") return "Retenido por riesgo";
  if (!estado) return "Sin estado de pago";

  return textoPlano(value);
}

function pagoBadgeClass(value: string | null | undefined) {
  const estado = normalizar(value);

  if (estado === "pagado") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (estado === "en_ejecucion_no_abonado") return "border-blue-200 bg-blue-50 text-blue-800";
  if (estado === "en_revision_parcial") return "border-amber-200 bg-amber-50 text-amber-800";
  if (estado === "no_devengado") return "border-slate-200 bg-slate-50 text-slate-700";
  if (estado.includes("retenido")) return "border-red-200 bg-red-50 text-red-800";

  return "border-slate-200 bg-white text-slate-700";
}

function badgeClass(value: string | null | undefined) {
  const normalizado = normalizar(value);

  if (
    normalizado.includes("alta") ||
    normalizado.includes("alto") ||
    normalizado.includes("riesgo") ||
    normalizado.includes("reintegro")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    normalizado.includes("media") ||
    normalizado.includes("medio") ||
    normalizado.includes("preventivo")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalizado.includes("inicio") || normalizado.includes("pendiente")) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function controlBadgeClass(accion: AccionDetalle, alertaTipificada: AlertaTipificada | null) {
  if (alertaTipificada) return badgeClass(alertaTipificada.nivel_aplicado);

  const importeRiesgo = Number(accion.importe_en_riesgo ?? 0);
  const alerta = normalizar(accion.alerta);
  const nivel = normalizar(accion.nivel_riesgo);

  const sinAlertaCritica =
    alerta.includes("sin alerta crítica") ||
    alerta.includes("sin alerta critica");

  if (
    importeRiesgo > 0 ||
    nivel.includes("alto") ||
    (alerta.includes("crítica") && !sinAlertaCritica) ||
    (alerta.includes("critica") && !sinAlertaCritica)
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function controlLabel(accion: AccionDetalle, alertaTipificada: AlertaTipificada | null) {
  if (alertaTipificada) {
    return `Alerta ${textoPlano(alertaTipificada.nivel_aplicado)}`;
  }

  const importeRiesgo = Number(accion.importe_en_riesgo ?? 0);
  if (importeRiesgo > 0) return "Revisión/Riesgo";

  return "Control ordinario";
}

function lecturaRiesgo(accion: AccionDetalle, alertaTipificada: AlertaTipificada | null) {
  if (alertaTipificada) return alertaTipificada.tipologia_nombre;

  const alerta = normalizar(accion.alerta);
  const importeRiesgo = Number(accion.importe_en_riesgo ?? 0);

  if (!alerta || alerta === "sin alerta crítica" || importeRiesgo <= 0) {
    return "Sin alerta crítica activa";
  }

  return accion.alerta;
}

function evidenciaTexto(accion: AccionDetalle, alertaTipificada: AlertaTipificada | null) {
  if (alertaTipificada?.evidencia_requerida) return alertaTipificada.evidencia_requerida;

  return (
    accion.evidencia_a_revisar ||
    "Mantener seguimiento ordinario de asistencia, alumnado activo y ejecución económica."
  );
}

function decisionTexto(accion: AccionDetalle, alertaTipificada: AlertaTipificada | null) {
  if (alertaTipificada) {
    return alertaTipificada.estado_revision === "regularizada"
      ? "Registro regularizado. Mantener trazabilidad del subexpediente."
      : "Revisar alerta tipificada y documentar actuación administrativa si procede.";
  }

  return accion.decision_recomendada || "Seguimiento ordinario";
}

function documentacionLabel(value: string | null | undefined) {
  const estado = normalizar(value);

  if (estado === "validada") return "documentación validada";
  if (estado === "en_revision_ordinaria") return "documentación en revisión ordinaria";
  if (estado === "en_revision") return "documentación en revisión";
  if (estado === "pendiente") return "documentación pendiente";
  if (!estado) return "documentación sin estado";

  return textoPlano(value);
}

function evidenciaTextoOperativa(
  accion: AccionDetalle,
  alertaTipificada: AlertaTipificada | null,
  subexpedientePago: SubexpedientePago | null
) {
  if (alertaTipificada?.evidencia_requerida) return alertaTipificada.evidencia_requerida;

  const estadoOperativo = normalizar(
    subexpedientePago?.estado_operativo_administrativo ?? accion.estado_ejecucion
  );
  const estadoDocumental = normalizar(subexpedientePago?.documentacion_estado);
  const estadoPago = normalizar(subexpedientePago?.estado_pago_administrativo);

  if (estadoOperativo === "finalizada") {
    if (estadoDocumental === "validada" && estadoPago === "pagado") {
      return "Acción finalizada, expediente documental validado y pago registrado. Mantener trazabilidad y revisar solo si existe incidencia sobrevenida.";
    }

    if (estadoDocumental === "validada") {
      return "Acción finalizada y expediente documental validado. La revisión económica debe confirmar si procede pago, retención o cierre administrativo.";
    }

    return `Acción finalizada por fecha, con ${documentacionLabel(
      subexpedientePago?.documentacion_estado
    )}. Completar o revisar la mesa documental antes de considerar cierre económico defendible.`;
  }

  return evidenciaTexto(accion, alertaTipificada);
}

function decisionTextoOperativa(
  accion: AccionDetalle,
  alertaTipificada: AlertaTipificada | null,
  subexpedientePago: SubexpedientePago | null
) {
  if (alertaTipificada) return decisionTexto(accion, alertaTipificada);

  const estadoOperativo = normalizar(
    subexpedientePago?.estado_operativo_administrativo ?? accion.estado_ejecucion
  );
  const estadoDocumental = normalizar(subexpedientePago?.documentacion_estado);
  const estadoPago = normalizar(subexpedientePago?.estado_pago_administrativo);

  if (estadoOperativo === "finalizada") {
    if (estadoDocumental === "validada" && estadoPago === "pagado") {
      return "Pago ya registrado. Mantener trazabilidad y revisar solo si existe incidencia sobrevenida.";
    }

    if (estadoDocumental === "validada") {
      return "Acción finalizada con documentación validada. Revisar estado de pago para decisión económica superior.";
    }

    return "Acción finalizada con documentación pendiente. Revisar mesa documental antes de autorizar o confirmar cierre económico.";
  }

  return decisionTexto(accion, alertaTipificada);
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
    <div className="min-h-[68px] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950">{value}</p>
      {detail ? <p className="mt-0.5 text-[10px] leading-3 text-slate-500">{detail}</p> : null}
    </div>
  );
}

function SubexpedienteAccionContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const ofertaId = Number(params.id);
  const tipologiaParam = searchParams.get("tipologia");

  const [accion, setAccion] = useState<AccionDetalle | null>(null);
  const [subexpedientePago, setSubexpedientePago] = useState<SubexpedientePago | null>(null);
  const [alertaTipificada, setAlertaTipificada] = useState<AlertaTipificada | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const justificacionHref = useMemo(() => {
    return Number.isNaN(ofertaId)
      ? "/justificacion-economica"
      : `/justificacion-economica?ofertaId=${ofertaId}`;
  }, [ofertaId]);

  const estadoPagoHref = subexpedientePago
    ? `/estado-pago/${subexpedientePago.id}`
    : null;

  useEffect(() => {
    async function loadAccion() {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("v_fiscalizacion_trazabilidad_accion")
        .select("*")
        .eq("oferta_id", ofertaId)
        .limit(1)
        .maybeSingle();

      if (supabaseError) {
        setError(supabaseError.message);
        setLoading(false);
        return;
      }

      setAccion(data as AccionDetalle);

      const { data: subexpedienteData, error: subexpedienteError } = await supabase
        .from("subexpedientes_accion")
        .select(
          "id, oferta_concedida_id, estado_operativo_administrativo, documentacion_estado, estado_pago_administrativo"
        )
        .eq("oferta_concedida_id", ofertaId)
        .limit(1)
        .maybeSingle();

      if (!subexpedienteError && subexpedienteData) {
        setSubexpedientePago(subexpedienteData as SubexpedientePago);
      } else {
        setSubexpedientePago(null);
      }

      if (tipologiaParam) {
        const { data: alertaData, error: alertaError } = await supabase
          .from("v_alertas_institucionales_tipificadas")
          .select("*")
          .eq("oferta_id", ofertaId)
          .eq("tipologia_codigo", tipologiaParam)
          .limit(1)
          .maybeSingle();

        if (!alertaError && alertaData) {
          setAlertaTipificada(alertaData as AlertaTipificada);
        } else {
          setAlertaTipificada(null);
        }
      } else {
        setAlertaTipificada(null);
      }

      setLoading(false);
    }

    if (!Number.isNaN(ofertaId)) {
      loadAccion();
    } else {
      setError("Identificador de acción no válido.");
      setLoading(false);
    }
  }, [ofertaId, tipologiaParam]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-6 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-600">Cargando subexpediente de acción...</p>
        </section>
      </main>
    );
  }

  if (error || !accion) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-6 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-lg border border-red-200 bg-white p-3 shadow-sm">
          <Link href="/oferta-formativa" className="text-xs font-semibold text-blue-800">
            ← Volver a oferta formativa
          </Link>
          <p className="mt-4 text-sm font-semibold text-red-700">
            Error cargando subexpediente
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-xs text-red-800">
            {error ?? "No se pudo cargar la acción."}
          </pre>
        </section>
      </main>
    );
  }

  const estadoOperativoFuente =
    subexpedientePago?.estado_operativo_administrativo ?? accion.estado_ejecucion;
  const estadoVisible = estadoOperativoLabel(estadoOperativoFuente);
  const evidenciaVisible = evidenciaTextoOperativa(
    accion,
    alertaTipificada,
    subexpedientePago
  );
  const decisionVisible = decisionTextoOperativa(
    accion,
    alertaTipificada,
    subexpedientePago
  );
  const controlVisible = controlLabel(accion, alertaTipificada);

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-4 py-2 text-white shadow-sm">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Coforma Institucional
          </p>
          <h1 className="mt-0.5 text-lg font-semibold">Subexpediente de acción formativa</h1>
          <p className="mt-0.5 text-[11px] text-blue-100">
            {accion.codigo_accion} · {accion.codigo_especialidad} · {accion.tipo_oferta}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-1.5 px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/oferta-formativa" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            ← Volver a oferta formativa
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {subexpedientePago ? (
              <span
                className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold ${pagoBadgeClass(
                  subexpedientePago.estado_pago_administrativo
                )}`}
              >
                Pago: {pagoLabel(subexpedientePago.estado_pago_administrativo)}
              </span>
            ) : null}

            <span
              className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold ${controlBadgeClass(
                accion,
                alertaTipificada
              )}`}
            >
              {controlVisible}
            </span>
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.4fr_0.45fr_0.9fr] lg:items-center">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Entidad beneficiaria
              </p>
              <h2 className="mt-0.5 text-[15px] font-semibold leading-5 text-slate-950">
                {accion.entidad_nombre}
              </h2>
              <p className="text-[10px] text-slate-500">{accion.cif}</p>
            </div>

            <div className="lg:text-right">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Acción
              </p>
              <p className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-950">
                {accion.codigo_accion}
              </p>
              <p className="text-[10px] text-slate-500">{accion.tipo_oferta}</p>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Especialidad
              </p>
              <p className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-950">
                {accion.codigo_especialidad}
              </p>
              <p className="truncate text-[10px] text-slate-600">{accion.denominacion}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-2 lg:grid-cols-4">
          <DataCard label="Importe concedido" value={euro(accion.importe_concedido)} />
          <DataCard
            label="Revisión/Riesgo"
            value={euro(accion.importe_en_riesgo)}
            detail={pct(accion.porcentaje_importe_en_riesgo)}
          />
          <DataCard
            label="Alumnado activo"
            value={num(accion.alumnos_activos)}
            detail={`${num(accion.alumnos_inicio)} inicio · ${pct(accion.porcentaje_alumnos_activos)}`}
          />
          <DataCard
            label="Bajas"
            value={num(accion.bajas)}
            detail={pct(accion.porcentaje_bajas)}
          />
        </section>

        <section className="grid gap-2 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
                <span className="text-[9px] font-semibold uppercase text-slate-500">
                  Estado operativo
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${estadoOperativoClass(
                    estadoOperativoFuente
                  )}`}
                >
                  {estadoVisible}
                </span>
              </div>

              {subexpedientePago ? (
                <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
                  <span className="text-[9px] font-semibold uppercase text-slate-500">
                    Estado de pago
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pagoBadgeClass(
                      subexpedientePago.estado_pago_administrativo
                    )}`}
                  >
                    {pagoLabel(subexpedientePago.estado_pago_administrativo)}
                  </span>
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
                <span className="text-[9px] font-semibold uppercase text-slate-500">
                  {alertaTipificada ? "Nivel de alerta" : "Control de revisión"}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${controlBadgeClass(
                    accion,
                    alertaTipificada
                  )}`}
                >
                  {alertaTipificada ? textoPlano(alertaTipificada.nivel_aplicado) : controlVisible}
                </span>
              </div>

              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
                <p className="text-[9px] font-semibold uppercase text-slate-500">
                  {alertaTipificada ? "Alerta tipificada" : "Lectura de control"}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-800">
                  {lecturaRiesgo(accion, alertaTipificada)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid gap-1.5">
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5">
                <p className="text-[9px] font-semibold uppercase text-slate-500">
                  Evidencia / seguimiento
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-800">
                  {evidenciaVisible}
                </p>
              </div>

              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5">
                <p className="text-[9px] font-semibold uppercase text-blue-900">
                  Decisión recomendada
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-blue-950">
                  {decisionVisible}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-0.5">
                {estadoPagoHref ? (
                  <Link
                    href={estadoPagoHref}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100"
                  >
                    Revisar estado de pago
                  </Link>
                ) : null}

                <Link
                  href={justificacionHref}
                  className="rounded-md bg-[#183B63] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#122f4f]"
                >
                  Ver justificación económica
                </Link>

                <Link
                  href={`/acciones/nueva?ofertaId=${ofertaId}${
                    tipologiaParam ? `&tipologia=${encodeURIComponent(tipologiaParam)}` : ""
                  }`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Emitir actuación
                </Link>

                <Link
                  href="/oferta-formativa"
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Volver a oferta formativa
                </Link>
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

export default function SubexpedienteAccionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#edf3f8] p-6 text-slate-950">
          <section className="mx-auto max-w-7xl rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-600">Cargando subexpediente de acción...</p>
          </section>
        </main>
      }
    >
      <SubexpedienteAccionContent />
    </Suspense>
  );
}
