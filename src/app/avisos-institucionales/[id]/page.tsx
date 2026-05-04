"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type AvisoDetalle = {
  id: number;
  titulo: string;
  tipo_aviso: string;
  prioridad: string;
  estado: string;
  ambito: string;
  origen_funcional: string;

  entidad_id: number | null;
  entidad_nombre: string | null;
  cif: string | null;

  oferta_id: number | null;
  codigo_accion: string | null;
  tipo_oferta: string | null;
  codigo_especialidad: string | null;
  denominacion: string | null;

  actuacion_id: number | null;
  conexion_id: number | null;
  conexion_nombre: string | null;
  conexion_codigo: string | null;
  conexion_organismo: string | null;

  destinatario_tipo: string;
  destinatario_nombre: string | null;
  destinatario_email: string | null;

  asunto: string;
  mensaje: string;
  observaciones: string | null;

  fecha_programada: string | null;
  fecha_publicacion: string | null;
  fecha_cierre: string | null;

  canal_previsto: string;
  estado_canal: string;
  referencia_externa: string | null;

  requiere_revision: boolean;
  requiere_confirmacion: boolean;

  fuente_origen: string;
  tipo_dato: string;
  created_at: string;
  updated_at: string;
  historial_count: number;
};

type EmisionAviso = {
  id: number;
  aviso_id: number;
  titulo: string | null;
  prioridad: string | null;
  estado_aviso: string | null;
  asunto: string | null;
  destinatario_tipo: string | null;
  destinatario_nombre: string | null;
  entidad_id: number | null;
  oferta_id: number | null;
  actuacion_id: number | null;
  conexion_id: number | null;

  canal_emision: string;
  estado_emision: string;

  requiere_firma: boolean;
  estado_firma: string;

  documento_generado: boolean;
  documento_url: string | null;
  referencia_documento: string | null;
  hash_documento: string | null;

  referencia_externa: string | null;
  acuse_recibido: boolean;

  fecha_preparacion: string | null;
  fecha_firma: string | null;
  fecha_envio: string | null;
  fecha_acuse: string | null;

  observaciones: string | null;

  fuente_origen: string;
  tipo_dato: string;
  created_at: string;
  updated_at: string;
};

type HistorialAviso = {
  id: number;
  aviso_id: number;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  motivo_edicion: string | null;
  editado_por: string | null;
  editado_en: string;
};

type ConexionLite = {
  id: number;
  nombre: string;
  codigo: string;
  organismo: string | null;
};

type FormAviso = {
  titulo: string;
  tipo_aviso: string;
  prioridad: string;
  estado: string;
  ambito: string;
  origen_funcional: string;

  entidad_id: string;
  oferta_id: string;
  actuacion_id: string;
  conexion_id: string;

  destinatario_tipo: string;
  destinatario_nombre: string;
  destinatario_email: string;

  asunto: string;
  mensaje: string;
  observaciones: string;

  canal_previsto: string;
  estado_canal: string;
  referencia_externa: string;

  requiere_revision: boolean;
  requiere_confirmacion: boolean;

  motivo_edicion: string;
};

type FormEmision = {
  canal_emision: string;
  estado_emision: string;
  requiere_firma: boolean;
  estado_firma: string;
  documento_generado: boolean;
  documento_url: string;
  referencia_documento: string;
  hash_documento: string;
  referencia_externa: string;
  acuse_recibido: boolean;
  observaciones: string;
};

function num(value: number | null | undefined) {
  return new Intl.NumberFormat("es-ES").format(Number(value ?? 0));
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

function label(value: string | null | undefined) {
  return String(value ?? "—").replaceAll("_", " ");
}

function badgeClass(value: string | null | undefined) {
  const normalizado = String(value ?? "").toLowerCase();

  if (
    normalizado.includes("alta") ||
    normalizado.includes("riesgo") ||
    normalizado.includes("pendiente") ||
    normalizado.includes("borrador") ||
    normalizado.includes("firma")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    normalizado.includes("media") ||
    normalizado.includes("preparada") ||
    normalizado.includes("registrado") ||
    normalizado.includes("manual")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    normalizado.includes("emitido") ||
    normalizado.includes("enviado") ||
    normalizado.includes("firmado") ||
    normalizado.includes("acuse") ||
    normalizado.includes("cerrado") ||
    normalizado.includes("ok")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function toNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function formFromEmision(emision: EmisionAviso | null): FormEmision {
  return {
    canal_emision: emision?.canal_emision ?? "pdf_manual",
    estado_emision: emision?.estado_emision ?? "preparada",
    requiere_firma: emision?.requiere_firma ?? true,
    estado_firma: emision?.estado_firma ?? "pendiente_firma",
    documento_generado: emision?.documento_generado ?? false,
    documento_url: emision?.documento_url ?? "",
    referencia_documento: emision?.referencia_documento ?? "",
    hash_documento: emision?.hash_documento ?? "",
    referencia_externa: emision?.referencia_externa ?? "",
    acuse_recibido: emision?.acuse_recibido ?? false,
    observaciones: emision?.observaciones ?? "",
  };
}

function formFromAviso(aviso: AvisoDetalle): FormAviso {
  return {
    titulo: aviso.titulo ?? "",
    tipo_aviso: aviso.tipo_aviso ?? "aviso_institucional_extraordinario",
    prioridad: aviso.prioridad ?? "normal",
    estado: aviso.estado ?? "borrador",
    ambito: aviso.ambito ?? "institucional",
    origen_funcional: aviso.origen_funcional ?? "manual_frontend",

    entidad_id: aviso.entidad_id ? String(aviso.entidad_id) : "",
    oferta_id: aviso.oferta_id ? String(aviso.oferta_id) : "",
    actuacion_id: aviso.actuacion_id ? String(aviso.actuacion_id) : "",
    conexion_id: aviso.conexion_id ? String(aviso.conexion_id) : "",

    destinatario_tipo: aviso.destinatario_tipo ?? "equipo_interno",
    destinatario_nombre: aviso.destinatario_nombre ?? "",
    destinatario_email: aviso.destinatario_email ?? "",

    asunto: aviso.asunto ?? "",
    mensaje: aviso.mensaje ?? "",
    observaciones: aviso.observaciones ?? "",

    canal_previsto: aviso.canal_previsto ?? "panel_institucional_demo",
    estado_canal: aviso.estado_canal ?? "registrado_no_enviado",
    referencia_externa: aviso.referencia_externa ?? "",

    requiere_revision: Boolean(aviso.requiere_revision),
    requiere_confirmacion: Boolean(aviso.requiere_confirmacion),

    motivo_edicion: "",
  };
}

function Kpi({
  labelText,
  value,
  detail,
  tone = "default",
}: {
  labelText: string;
  value: string;
  detail: string;
  tone?: "default" | "red" | "amber" | "green" | "blue";
}) {
  const border =
    tone === "red"
      ? "border-red-200"
      : tone === "amber"
      ? "border-amber-200"
      : tone === "green"
      ? "border-emerald-200"
      : tone === "blue"
      ? "border-blue-200"
      : "border-slate-200";

  return (
    <div className={`min-h-[74px] rounded-xl border ${border} bg-white px-3 py-2 shadow-sm`}>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {labelText}
      </p>
      <p className="mt-0.5 truncate text-[18px] font-semibold leading-5 text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] leading-3 text-slate-500">{detail}</p>
    </div>
  );
}

export default function ExpedienteAvisoInstitucionalPage() {
  const params = useParams();
  const router = useRouter();

  const avisoId = Number(params?.id);

  const [aviso, setAviso] = useState<AvisoDetalle | null>(null);
  const [conexiones, setConexiones] = useState<ConexionLite[]>([]);
  const [emisiones, setEmisiones] = useState<EmisionAviso[]>([]);
  const [historial, setHistorial] = useState<HistorialAviso[]>([]);
  const [emisionActiva, setEmisionActiva] = useState<EmisionAviso | null>(null);

  const [formAviso, setFormAviso] = useState<FormAviso | null>(null);
  const [formEmision, setFormEmision] = useState<FormEmision>(formFromEmision(null));

  const [editandoAviso, setEditandoAviso] = useState(false);
  const [editandoEmision, setEditandoEmision] = useState(false);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function editadoPorActual() {
    const { data } = await supabase.auth.getUser();

    return data?.user?.email ?? data?.user?.id ?? "usuario_demo_institucional";
  }

  async function cargarExpediente() {
    setLoading(true);
    setError(null);
    setResultado(null);

    if (!avisoId || Number.isNaN(avisoId)) {
      setError("Identificador de aviso no válido.");
      setLoading(false);
      return;
    }

    const [avisoRes, conexionesRes, emisionesRes, historialRes] = await Promise.all([
      supabase
        .from("v_avisos_institucionales_panel")
        .select("*")
        .eq("id", avisoId)
        .maybeSingle(),
      supabase
        .from("conexiones_institucionales")
        .select("id,nombre,codigo,organismo")
        .order("nombre", { ascending: true }),
      supabase
        .from("v_avisos_institucionales_emisiones")
        .select("*")
        .eq("aviso_id", avisoId)
        .order("created_at", { ascending: false }),
      supabase
        .from("avisos_institucionales_historial")
        .select("*")
        .eq("aviso_id", avisoId)
        .order("editado_en", { ascending: false })
        .limit(20),
    ]);

    const firstError = avisoRes.error || conexionesRes.error || emisionesRes.error || historialRes.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    if (!avisoRes.data) {
      setError("No se encontró el aviso institucional solicitado.");
      setLoading(false);
      return;
    }

    const avisoData = avisoRes.data as AvisoDetalle;
    const emisionesData = (emisionesRes.data ?? []) as EmisionAviso[];
    const primeraEmision = emisionesData[0] ?? null;

    setAviso(avisoData);
    setConexiones((conexionesRes.data ?? []) as ConexionLite[]);
    setEmisiones(emisionesData);
    setHistorial((historialRes.data ?? []) as HistorialAviso[]);
    setEmisionActiva(primeraEmision);
    setFormAviso(formFromAviso(avisoData));
    setFormEmision(formFromEmision(primeraEmision));
    setEditandoAviso(false);
    setEditandoEmision(false);
    setLoading(false);
  }

  useEffect(() => {
    cargarExpediente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avisoId]);

  const puedeEditarAviso = aviso?.estado === "borrador" || aviso?.estado === "registrado";

  const resumenEmision = useMemo(() => {
    const firmadas = emisiones.filter((row) => row.estado_firma === "firmado").length;
    const enviadas = emisiones.filter((row) => row.fecha_envio).length;
    const conAcuse = emisiones.filter((row) => row.acuse_recibido).length;

    return {
      total: emisiones.length,
      firmadas,
      enviadas,
      conAcuse,
    };
  }, [emisiones]);

  async function prepararEmision() {
    if (!aviso) return;

    setGuardando(true);
    setResultado(null);

    const editadoPor = await editadoPorActual();

    const { data, error: insertError } = await supabase
      .from("avisos_institucionales_emisiones")
      .insert({
        aviso_id: aviso.id,
        canal_emision: "pdf_manual",
        estado_emision: "preparada",
        requiere_firma: true,
        estado_firma: "pendiente_firma",
        documento_generado: false,
        acuse_recibido: false,
        observaciones:
          "Emisión documental preparada desde expediente de aviso institucional. No implica envío real automático.",
        fuente_origen: "demo_institucional",
        tipo_dato: "simulacion_controlada",
      })
      .select("id")
      .single();

    if (insertError) {
      setResultado(`No se pudo preparar la emisión: ${insertError.message}`);
      setGuardando(false);
      return;
    }

    await supabase.from("avisos_institucionales_historial").insert({
      aviso_id: aviso.id,
      campo: "emision_documental",
      valor_anterior: null,
      valor_nuevo: `Emisión ${data.id} preparada`,
      motivo_edicion:
        "Preparación de emisión documental desde expediente completo del aviso institucional.",
      editado_por: editadoPor,
    });

    await cargarExpediente();

    setResultado("Emisión documental preparada y trazabilidad registrada.");
    setGuardando(false);
  }

  async function guardarAviso() {
    if (!aviso || !formAviso) return;

    if (!formAviso.titulo.trim() || !formAviso.asunto.trim() || !formAviso.mensaje.trim()) {
      setResultado("Título, asunto y mensaje son obligatorios.");
      return;
    }

    if (!puedeEditarAviso) {
      setResultado("Este aviso ya no se puede editar porque está emitido o cerrado.");
      return;
    }

    setGuardando(true);
    setResultado(null);

    const now = new Date().toISOString();

    const updatePayload = {
      titulo: formAviso.titulo.trim(),
      tipo_aviso: formAviso.tipo_aviso.trim() || "aviso_institucional_extraordinario",
      prioridad: formAviso.prioridad,
      estado: formAviso.estado,
      ambito: formAviso.ambito.trim() || "institucional",
      origen_funcional: formAviso.origen_funcional.trim() || "manual_frontend",

      entidad_id: toNullableNumber(formAviso.entidad_id),
      oferta_id: toNullableNumber(formAviso.oferta_id),
      actuacion_id: toNullableNumber(formAviso.actuacion_id),
      conexion_id: toNullableNumber(formAviso.conexion_id),

      destinatario_tipo: formAviso.destinatario_tipo.trim() || "equipo_interno",
      destinatario_nombre: toNullableText(formAviso.destinatario_nombre),
      destinatario_email: toNullableText(formAviso.destinatario_email),

      asunto: formAviso.asunto.trim(),
      mensaje: formAviso.mensaje.trim(),
      observaciones: toNullableText(formAviso.observaciones),

      canal_previsto: formAviso.canal_previsto.trim() || "panel_institucional_demo",
      estado_canal: formAviso.estado_canal.trim() || "registrado_no_enviado",
      referencia_externa: toNullableText(formAviso.referencia_externa),

      requiere_revision: formAviso.requiere_revision,
      requiere_confirmacion: formAviso.requiere_confirmacion,

      updated_at: now,
    };

    const comparables = [
      { campo: "titulo", anterior: aviso.titulo ?? "", nuevo: formAviso.titulo },
      { campo: "tipo_aviso", anterior: aviso.tipo_aviso ?? "", nuevo: formAviso.tipo_aviso },
      { campo: "prioridad", anterior: aviso.prioridad ?? "", nuevo: formAviso.prioridad },
      { campo: "estado", anterior: aviso.estado ?? "", nuevo: formAviso.estado },
      { campo: "ambito", anterior: aviso.ambito ?? "", nuevo: formAviso.ambito },
      { campo: "origen_funcional", anterior: aviso.origen_funcional ?? "", nuevo: formAviso.origen_funcional },
      { campo: "entidad_id", anterior: aviso.entidad_id ? String(aviso.entidad_id) : "", nuevo: formAviso.entidad_id },
      { campo: "oferta_id", anterior: aviso.oferta_id ? String(aviso.oferta_id) : "", nuevo: formAviso.oferta_id },
      { campo: "actuacion_id", anterior: aviso.actuacion_id ? String(aviso.actuacion_id) : "", nuevo: formAviso.actuacion_id },
      { campo: "conexion_id", anterior: aviso.conexion_id ? String(aviso.conexion_id) : "", nuevo: formAviso.conexion_id },
      { campo: "destinatario_tipo", anterior: aviso.destinatario_tipo ?? "", nuevo: formAviso.destinatario_tipo },
      { campo: "destinatario_nombre", anterior: aviso.destinatario_nombre ?? "", nuevo: formAviso.destinatario_nombre },
      { campo: "destinatario_email", anterior: aviso.destinatario_email ?? "", nuevo: formAviso.destinatario_email },
      { campo: "asunto", anterior: aviso.asunto ?? "", nuevo: formAviso.asunto },
      { campo: "mensaje", anterior: aviso.mensaje ?? "", nuevo: formAviso.mensaje },
      { campo: "observaciones", anterior: aviso.observaciones ?? "", nuevo: formAviso.observaciones },
      { campo: "canal_previsto", anterior: aviso.canal_previsto ?? "", nuevo: formAviso.canal_previsto },
      { campo: "estado_canal", anterior: aviso.estado_canal ?? "", nuevo: formAviso.estado_canal },
      { campo: "referencia_externa", anterior: aviso.referencia_externa ?? "", nuevo: formAviso.referencia_externa },
      {
        campo: "requiere_revision",
        anterior: String(Boolean(aviso.requiere_revision)),
        nuevo: String(Boolean(formAviso.requiere_revision)),
      },
      {
        campo: "requiere_confirmacion",
        anterior: String(Boolean(aviso.requiere_confirmacion)),
        nuevo: String(Boolean(formAviso.requiere_confirmacion)),
      },
    ];

    const cambios = comparables.filter(
      (item) => item.anterior.trim() !== item.nuevo.trim()
    );

    if (cambios.length === 0) {
      setResultado("No hay cambios para guardar.");
      setGuardando(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("avisos_institucionales")
      .update(updatePayload)
      .eq("id", aviso.id);

    if (updateError) {
      setResultado(`No se pudo guardar el aviso: ${updateError.message}`);
      setGuardando(false);
      return;
    }

    const editadoPor = await editadoPorActual();

    const historialRows = cambios.map((cambio) => ({
      aviso_id: aviso.id,
      campo: cambio.campo,
      valor_anterior: cambio.anterior || null,
      valor_nuevo: cambio.nuevo || null,
      motivo_edicion:
        formAviso.motivo_edicion.trim() ||
        "Edición de aviso institucional extraordinario desde expediente completo.",
      editado_por: editadoPor,
    }));

    const { error: historialError } = await supabase
      .from("avisos_institucionales_historial")
      .insert(historialRows);

    if (historialError) {
      setResultado(
        `El aviso se actualizó, pero no se pudo registrar historial: ${historialError.message}`
      );
      setGuardando(false);
      return;
    }

    await cargarExpediente();

    setResultado("Aviso actualizado y trazabilidad registrada.");
    setEditandoAviso(false);
    setGuardando(false);
  }

  async function guardarEmision() {
    if (!emisionActiva || !aviso) return;

    setGuardando(true);
    setResultado(null);

    const now = new Date().toISOString();
    const editadoPor = await editadoPorActual();

    const estadoAnterior = emisionActiva.estado_emision;
    const firmaAnterior = emisionActiva.estado_firma;
    const referenciaAnterior = emisionActiva.referencia_externa ?? "";
    const acuseAnterior = String(Boolean(emisionActiva.acuse_recibido));

    const updatePayload = {
      canal_emision: formEmision.canal_emision,
      estado_emision: formEmision.estado_emision,
      requiere_firma: formEmision.requiere_firma,
      estado_firma: formEmision.estado_firma,
      documento_generado: formEmision.documento_generado,
      documento_url: toNullableText(formEmision.documento_url),
      referencia_documento: toNullableText(formEmision.referencia_documento),
      hash_documento: toNullableText(formEmision.hash_documento),
      referencia_externa: toNullableText(formEmision.referencia_externa),
      acuse_recibido: formEmision.acuse_recibido,
      observaciones: toNullableText(formEmision.observaciones),
      fecha_firma:
        formEmision.estado_firma === "firmado" && !emisionActiva.fecha_firma
          ? now
          : emisionActiva.fecha_firma,
      fecha_envio:
        (formEmision.estado_emision === "enviada" ||
          formEmision.estado_emision === "registrada" ||
          formEmision.estado_emision === "acuse_recibido") &&
        !emisionActiva.fecha_envio
          ? now
          : emisionActiva.fecha_envio,
      fecha_acuse:
        formEmision.acuse_recibido && !emisionActiva.fecha_acuse
          ? now
          : emisionActiva.fecha_acuse,
      updated_at: now,
    };

    const { error: updateError } = await supabase
      .from("avisos_institucionales_emisiones")
      .update(updatePayload)
      .eq("id", emisionActiva.id);

    if (updateError) {
      setResultado(`No se pudo guardar la emisión: ${updateError.message}`);
      setGuardando(false);
      return;
    }

    const historialRows: Array<{
      aviso_id: number;
      campo: string;
      valor_anterior: string | null;
      valor_nuevo: string | null;
      motivo_edicion: string;
      editado_por: string;
    }> = [];

    if (estadoAnterior !== formEmision.estado_emision) {
      historialRows.push({
        aviso_id: aviso.id,
        campo: "estado_emision",
        valor_anterior: estadoAnterior,
        valor_nuevo: formEmision.estado_emision,
        motivo_edicion: "Actualización del estado de emisión documental.",
        editado_por: editadoPor,
      });
    }

    if (firmaAnterior !== formEmision.estado_firma) {
      historialRows.push({
        aviso_id: aviso.id,
        campo: "estado_firma",
        valor_anterior: firmaAnterior,
        valor_nuevo: formEmision.estado_firma,
        motivo_edicion: "Actualización del estado de firma de la comunicación extraordinaria.",
        editado_por: editadoPor,
      });
    }

    if (referenciaAnterior !== formEmision.referencia_externa.trim()) {
      historialRows.push({
        aviso_id: aviso.id,
        campo: "referencia_externa_emision",
        valor_anterior: referenciaAnterior || null,
        valor_nuevo: formEmision.referencia_externa.trim() || null,
        motivo_edicion: "Actualización de referencia externa / registro / acuse.",
        editado_por: editadoPor,
      });
    }

    if (acuseAnterior !== String(Boolean(formEmision.acuse_recibido))) {
      historialRows.push({
        aviso_id: aviso.id,
        campo: "acuse_recibido",
        valor_anterior: acuseAnterior,
        valor_nuevo: String(Boolean(formEmision.acuse_recibido)),
        motivo_edicion: "Actualización del acuse de la comunicación extraordinaria.",
        editado_por: editadoPor,
      });
    }

    if (historialRows.length > 0) {
      await supabase.from("avisos_institucionales_historial").insert(historialRows);
    }

    await cargarExpediente();

    setResultado("Emisión documental actualizada y trazabilidad registrada.");
    setEditandoEmision(false);
    setGuardando(false);
  }

  async function marcarAvisoEmitido() {
    if (!aviso) return;

    setGuardando(true);
    setResultado(null);

    const now = new Date().toISOString();
    const editadoPor = await editadoPorActual();

    const { error: updateError } = await supabase
      .from("avisos_institucionales")
      .update({
        estado: "emitido",
        estado_canal: "comunicacion_extraordinaria_emitida",
        fecha_publicacion: aviso.fecha_publicacion ?? now,
        updated_at: now,
      })
      .eq("id", aviso.id);

    if (updateError) {
      setResultado(`No se pudo marcar el aviso como emitido: ${updateError.message}`);
      setGuardando(false);
      return;
    }

    await supabase.from("avisos_institucionales_historial").insert([
      {
        aviso_id: aviso.id,
        campo: "estado",
        valor_anterior: aviso.estado,
        valor_nuevo: "emitido",
        motivo_edicion:
          "Comunicación extraordinaria marcada como emitida desde expediente completo.",
        editado_por: editadoPor,
      },
      {
        aviso_id: aviso.id,
        campo: "estado_canal",
        valor_anterior: aviso.estado_canal,
        valor_nuevo: "comunicacion_extraordinaria_emitida",
        motivo_edicion:
          "Registro de canal de comunicación extraordinaria desde expediente completo.",
        editado_por: editadoPor,
      },
    ]);

    await cargarExpediente();

    setResultado("Aviso marcado como comunicación extraordinaria emitida.");
    setGuardando(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando expediente de aviso institucional...</p>
        </section>
      </main>
    );
  }

  if (error || !aviso || !formAviso) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs font-semibold text-blue-800 hover:text-blue-950"
          >
            ← Volver
          </button>

          <p className="mt-4 text-sm font-semibold text-red-700">
            No se pudo cargar el expediente de aviso institucional
          </p>

          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-xs text-red-800">
            {error ?? "No se encontró el aviso solicitado."}
          </pre>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 truncate text-xl font-semibold">
              Expediente de aviso institucional
            </h1>
            <p className="mt-0.5 truncate text-xs text-blue-100">
              {aviso.titulo}
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            Comunicación extraordinaria · expediente completo
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href="/avisos-institucionales" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver a avisos
            </Link>
            <Link href="/conexiones" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Conexiones
            </Link>
            <Link href="/actuaciones-emitidas" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Actuaciones emitidas
            </Link>
            <Link href="/comunicaciones-canal" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Comunicaciones / canal
            </Link>
          </div>

          <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm ${badgeClass(aviso.estado)}`}>
            Estado: {label(aviso.estado)}
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi labelText="Prioridad" value={label(aviso.prioridad)} detail="nivel del aviso" tone="red" />
          <Kpi labelText="Estado aviso" value={label(aviso.estado)} detail={label(aviso.estado_canal)} tone="blue" />
          <Kpi labelText="Emisiones" value={num(resumenEmision.total)} detail="documentales" />
          <Kpi labelText="Firmadas" value={num(resumenEmision.firmadas)} detail="firma registrada" tone="green" />
          <Kpi labelText="Enviadas" value={num(resumenEmision.enviadas)} detail="fecha envío registrada" tone="amber" />
          <Kpi labelText="Acuses" value={num(resumenEmision.conAcuse)} detail="acuse recibido" tone="green" />
        </section>

        <section className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-950 shadow-sm">
          <p className="font-semibold">Lectura ejecutiva</p>
          <p className="mt-0.5">
            Este expediente separa el aviso institucional de su emisión documental. La emisión puede quedar preparada, firmada,
            enviada, registrada o con acuse, sin afirmar envíos automáticos si no existe canal oficial integrado.
          </p>
        </section>

        {editandoAviso ? (
          <section className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Editar aviso institucional</h2>
                <p className="text-[11px] text-slate-500">
                  Solo disponible mientras el aviso está en borrador o registrado.
                </p>
              </div>

              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-800">
                Edición trazable
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Título
                  </label>
                  <input
                    value={formAviso.titulo}
                    onChange={(event) =>
                      setFormAviso((prev) => prev ? { ...prev, titulo: event.target.value } : prev)
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Prioridad
                    </label>
                    <select
                      value={formAviso.prioridad}
                      onChange={(event) =>
                        setFormAviso((prev) => prev ? { ...prev, prioridad: event.target.value } : prev)
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    >
                      <option value="alta">alta</option>
                      <option value="media">media</option>
                      <option value="normal">normal</option>
                      <option value="baja">baja</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Estado
                    </label>
                    <select
                      value={formAviso.estado}
                      onChange={(event) =>
                        setFormAviso((prev) => prev ? { ...prev, estado: event.target.value } : prev)
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    >
                      <option value="borrador">borrador</option>
                      <option value="registrado">registrado</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Ámbito
                    </label>
                    <input
                      value={formAviso.ambito}
                      onChange={(event) =>
                        setFormAviso((prev) => prev ? { ...prev, ambito: event.target.value } : prev)
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Conexión institucional vinculada
                  </label>
                  <select
                    value={formAviso.conexion_id}
                    onChange={(event) =>
                      setFormAviso((prev) => prev ? { ...prev, conexion_id: event.target.value } : prev)
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
                  >
                    <option value="">Sin conexión</option>
                    {conexiones.map((conexion) => (
                      <option key={conexion.id} value={conexion.id}>
                        {conexion.nombre} · {conexion.codigo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Entidad ID
                    </label>
                    <input
                      value={formAviso.entidad_id}
                      onChange={(event) =>
                        setFormAviso((prev) => prev ? { ...prev, entidad_id: event.target.value } : prev)
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Oferta ID
                    </label>
                    <input
                      value={formAviso.oferta_id}
                      onChange={(event) =>
                        setFormAviso((prev) => prev ? { ...prev, oferta_id: event.target.value } : prev)
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Actuación ID
                    </label>
                    <input
                      value={formAviso.actuacion_id}
                      onChange={(event) =>
                        setFormAviso((prev) => prev ? { ...prev, actuacion_id: event.target.value } : prev)
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formAviso.requiere_revision}
                      onChange={(event) =>
                        setFormAviso((prev) =>
                          prev ? { ...prev, requiere_revision: event.target.checked } : prev
                        )
                      }
                    />
                    Requiere revisión
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formAviso.requiere_confirmacion}
                      onChange={(event) =>
                        setFormAviso((prev) =>
                          prev ? { ...prev, requiere_confirmacion: event.target.checked } : prev
                        )
                      }
                    />
                    Requiere confirmación
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Asunto
                  </label>
                  <input
                    value={formAviso.asunto}
                    onChange={(event) =>
                      setFormAviso((prev) => prev ? { ...prev, asunto: event.target.value } : prev)
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Mensaje
                  </label>
                  <textarea
                    value={formAviso.mensaje}
                    onChange={(event) =>
                      setFormAviso((prev) => prev ? { ...prev, mensaje: event.target.value } : prev)
                    }
                    rows={8}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Destinatario
                    </label>
                    <input
                      value={formAviso.destinatario_nombre}
                      onChange={(event) =>
                        setFormAviso((prev) =>
                          prev ? { ...prev, destinatario_nombre: event.target.value } : prev
                        )
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Tipo destinatario
                    </label>
                    <input
                      value={formAviso.destinatario_tipo}
                      onChange={(event) =>
                        setFormAviso((prev) =>
                          prev ? { ...prev, destinatario_tipo: event.target.value } : prev
                        )
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Observaciones
                  </label>
                  <textarea
                    value={formAviso.observaciones}
                    onChange={(event) =>
                      setFormAviso((prev) =>
                        prev ? { ...prev, observaciones: event.target.value } : prev
                      )
                    }
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                    Motivo de edición
                  </label>
                  <input
                    value={formAviso.motivo_edicion}
                    onChange={(event) =>
                      setFormAviso((prev) =>
                        prev ? { ...prev, motivo_edicion: event.target.value } : prev
                      )
                    }
                    placeholder="Ej.: corrección del borrador antes de preparar emisión."
                    className="mt-1 h-9 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setEditandoAviso(false);
                  setFormAviso(formFromAviso(aviso));
                  setResultado(null);
                }}
                disabled={guardando}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar edición
              </button>

              <button
                type="button"
                onClick={guardarAviso}
                disabled={guardando}
                className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar cambios del aviso"}
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Aviso institucional
                  </p>
                  <h2 className="mt-0.5 text-lg font-semibold leading-6 text-slate-950">
                    {aviso.titulo}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">{aviso.asunto}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(aviso.prioridad)}`}>
                      {label(aviso.prioridad)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {label(aviso.ambito)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {label(aviso.tipo_aviso)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Destinatario / vínculo
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {aviso.destinatario_nombre ?? "—"}
                  </p>
                  <p className="text-[11px] text-slate-500">{label(aviso.destinatario_tipo)}</p>

                  <div className="mt-2 text-[11px] leading-5 text-slate-600">
                    {aviso.conexion_id ? (
                      <p>
                        Conexión: <strong>{aviso.conexion_nombre}</strong> · {aviso.conexion_codigo}
                      </p>
                    ) : aviso.entidad_id ? (
                      <p>
                        Entidad: <strong>{aviso.entidad_nombre}</strong> · {aviso.cif}
                      </p>
                    ) : aviso.oferta_id ? (
                      <p>
                        Subexpediente: <strong>{aviso.codigo_accion}</strong> · {aviso.codigo_especialidad}
                      </p>
                    ) : (
                      <p>Aviso transversal sin vínculo específico.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 lg:grid-cols-[1fr_1fr]">
              <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  Mensaje oficial
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {aviso.mensaje}
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  Observaciones
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {aviso.observaciones ?? "—"}
                </p>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-500">Requiere revisión</p>
                    <p className="text-sm font-semibold">{aviso.requiere_revision ? "Sí" : "No"}</p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-500">Requiere confirmación</p>
                    <p className="text-sm font-semibold">{aviso.requiere_confirmacion ? "Sí" : "No"}</p>
                  </div>
                </div>
              </section>
            </section>
          </>
        )}

        <section className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
              <div>
                <h2 className="text-sm font-semibold">Emisión documental</h2>
                <p className="text-[11px] text-slate-500">
                  Canal, firma, documento, envío y acuse.
                </p>
              </div>

              {emisiones.length === 0 ? (
                <button
                  type="button"
                  onClick={prepararEmision}
                  disabled={guardando || editandoAviso}
                  className="rounded-lg bg-[#183B63] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
                >
                  {guardando ? "Preparando..." : "Preparar emisión"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditandoEmision(true);
                    setFormEmision(formFromEmision(emisionActiva));
                    setResultado(null);
                  }}
                  disabled={!emisionActiva || guardando || editandoAviso}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Editar emisión
                </button>
              )}
            </div>

            {emisionActiva ? (
              <div className="space-y-2 p-3">
                {!editandoEmision ? (
                  <>
                    <section className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase text-slate-500">Canal</p>
                        <p className="mt-0.5 text-sm font-semibold">{label(emisionActiva.canal_emision)}</p>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase text-slate-500">Estado emisión</p>
                        <span className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(emisionActiva.estado_emision)}`}>
                          {label(emisionActiva.estado_emision)}
                        </span>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase text-slate-500">Firma</p>
                        <span className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(emisionActiva.estado_firma)}`}>
                          {label(emisionActiva.estado_firma)}
                        </span>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase text-slate-500">Acuse</p>
                        <p className="mt-0.5 text-sm font-semibold">{emisionActiva.acuse_recibido ? "Recibido" : "Pendiente"}</p>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Referencias documentales
                      </p>
                      <div className="mt-1 grid gap-1 text-[12px] leading-5 text-slate-700">
                        <p>Documento generado: <strong>{emisionActiva.documento_generado ? "Sí" : "No"}</strong></p>
                        <p>Referencia documento: <strong>{emisionActiva.referencia_documento ?? "—"}</strong></p>
                        <p>Referencia externa: <strong>{emisionActiva.referencia_externa ?? "—"}</strong></p>
                        <p>Hash documento: <strong>{emisionActiva.hash_documento ?? "—"}</strong></p>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Fechas de emisión
                      </p>
                      <div className="mt-1 grid gap-1 text-[12px] leading-5 text-slate-700 md:grid-cols-2">
                        <p>Preparación: <strong>{fecha(emisionActiva.fecha_preparacion)}</strong></p>
                        <p>Firma: <strong>{fecha(emisionActiva.fecha_firma)}</strong></p>
                        <p>Envío: <strong>{fecha(emisionActiva.fecha_envio)}</strong></p>
                        <p>Acuse: <strong>{fecha(emisionActiva.fecha_acuse)}</strong></p>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Observaciones de emisión
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-700">
                        {emisionActiva.observaciones ?? "—"}
                      </p>
                    </section>
                  </>
                ) : (
                  <section className="space-y-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Canal de emisión
                        </label>
                        <select
                          value={formEmision.canal_emision}
                          onChange={(event) =>
                            setFormEmision((prev) => ({ ...prev, canal_emision: event.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        >
                          <option value="pdf_manual">PDF manual / impresión</option>
                          <option value="email_certificado">Email certificado</option>
                          <option value="sede_electronica">Sede electrónica</option>
                          <option value="registro_electronico">Registro electrónico</option>
                          <option value="carpeta_entidad">Carpeta entidad</option>
                          <option value="api_bidireccional_sce">API bidireccional SCE / SISPECAN</option>
                          <option value="envio_manual_documentado">Envío manual documentado</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Estado emisión
                        </label>
                        <select
                          value={formEmision.estado_emision}
                          onChange={(event) =>
                            setFormEmision((prev) => ({ ...prev, estado_emision: event.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        >
                          <option value="preparada">preparada</option>
                          <option value="pendiente_firma">pendiente_firma</option>
                          <option value="firmada">firmada</option>
                          <option value="enviada">enviada</option>
                          <option value="registrada">registrada</option>
                          <option value="acuse_recibido">acuse_recibido</option>
                          <option value="fallida">fallida</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Estado firma
                        </label>
                        <select
                          value={formEmision.estado_firma}
                          onChange={(event) =>
                            setFormEmision((prev) => ({ ...prev, estado_firma: event.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        >
                          <option value="no_requiere_firma">no_requiere_firma</option>
                          <option value="pendiente_firma">pendiente_firma</option>
                          <option value="en_portafirmas">en_portafirmas</option>
                          <option value="firmado">firmado</option>
                          <option value="rechazado">rechazado</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Referencia externa
                        </label>
                        <input
                          value={formEmision.referencia_externa}
                          onChange={(event) =>
                            setFormEmision((prev) => ({ ...prev, referencia_externa: event.target.value }))
                          }
                          placeholder="Registro / sede / acuse / referencia..."
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={formEmision.requiere_firma}
                          onChange={(event) =>
                            setFormEmision((prev) => ({ ...prev, requiere_firma: event.target.checked }))
                          }
                        />
                        Requiere firma
                      </label>

                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={formEmision.documento_generado}
                          onChange={(event) =>
                            setFormEmision((prev) => ({ ...prev, documento_generado: event.target.checked }))
                          }
                        />
                        Documento generado
                      </label>

                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={formEmision.acuse_recibido}
                          onChange={(event) =>
                            setFormEmision((prev) => ({ ...prev, acuse_recibido: event.target.checked }))
                          }
                        />
                        Acuse recibido
                      </label>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Referencia documento
                        </label>
                        <input
                          value={formEmision.referencia_documento}
                          onChange={(event) =>
                            setFormEmision((prev) => ({ ...prev, referencia_documento: event.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Hash documento
                        </label>
                        <input
                          value={formEmision.hash_documento}
                          onChange={(event) =>
                            setFormEmision((prev) => ({ ...prev, hash_documento: event.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        URL documento
                      </label>
                      <input
                        value={formEmision.documento_url}
                        onChange={(event) =>
                          setFormEmision((prev) => ({ ...prev, documento_url: event.target.value }))
                        }
                        placeholder="URL o referencia no sensible del documento"
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Observaciones emisión
                      </label>
                      <textarea
                        value={formEmision.observaciones}
                        onChange={(event) =>
                          setFormEmision((prev) => ({ ...prev, observaciones: event.target.value }))
                        }
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoEmision(false);
                          setFormEmision(formFromEmision(emisionActiva));
                        }}
                        disabled={guardando}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={guardarEmision}
                        disabled={guardando}
                        className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
                      >
                        {guardando ? "Guardando..." : "Guardar emisión"}
                      </button>
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="p-3">
                <section className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                  <p className="font-semibold">Sin emisión documental preparada</p>
                  <p className="mt-1">
                    Este aviso todavía no tiene emisión. Preparar emisión no envía nada: solo crea el registro documental para canal,
                    firma, documento, envío y acuse.
                  </p>
                </section>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
              <div>
                <h2 className="text-sm font-semibold">Historial del expediente</h2>
                <p className="text-[11px] text-slate-500">
                  Cambios de aviso, emisión, firma, referencia y acuse.
                </p>
              </div>

              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {num(historial.length)} visibles
              </span>
            </div>

            <div className="max-h-[520px] overflow-auto">
              {historial.length > 0 ? (
                historial.map((item) => (
                  <div key={item.id} className="border-b border-slate-100 px-3 py-2 last:border-b-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-slate-950">
                        {label(item.campo)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {fecha(item.editado_en)} · {item.editado_por ?? "—"}
                      </p>
                    </div>

                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Motivo: {item.motivo_edicion ?? "—"}
                    </p>

                    <div className="mt-1 grid gap-1 md:grid-cols-2">
                      <p className="line-clamp-2 rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-600">
                        Antes: {item.valor_anterior || "—"}
                      </p>
                      <p className="line-clamp-2 rounded-md bg-blue-50 px-2 py-1 text-[10px] text-blue-900">
                        Después: {item.valor_nuevo || "—"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-3 py-8 text-center text-xs text-slate-500">
                  Todavía no hay historial para este expediente.
                </p>
              )}
            </div>
          </section>
        </section>

        {resultado ? (
          <div
            className={
              resultado.includes("preparada") ||
              resultado.includes("registrada") ||
              resultado.includes("actualizada") ||
              resultado.includes("actualizado") ||
              resultado.includes("emitida")
                ? "rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"
                : "rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
            }
          >
            {resultado}
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap justify-end gap-2">
            {puedeEditarAviso && !editandoAviso ? (
              <button
                type="button"
                onClick={() => {
                  setEditandoAviso(true);
                  setResultado(null);
                  setFormAviso(formFromAviso(aviso));
                }}
                disabled={guardando || editandoEmision}
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
              >
                Editar aviso
              </button>
            ) : null}

            {aviso.estado !== "emitido" && aviso.estado !== "cerrado" && !editandoAviso ? (
              <button
                type="button"
                onClick={marcarAvisoEmitido}
                disabled={guardando || editandoEmision}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                {guardando ? "Emitiendo..." : "Marcar aviso como emitido"}
              </button>
            ) : null}

            <Link
              href="/avisos-institucionales"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver a avisos
            </Link>

            <Link
              href="/avisos-institucionales"
              className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f]"
            >
              Bandeja de avisos
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}