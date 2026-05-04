"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AvisoInstitucional = {
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

type FormAviso = {
  titulo: string;
  tipo_aviso: string;
  prioridad: string;
  estado: string;
  ambito: string;
  origen_funcional: string;
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
  conexion_id: string;
  entidad_id: string;
  oferta_id: string;
  actuacion_id: string;
  motivo_edicion: string;
};

type ConexionLite = {
  id: number;
  nombre: string;
  codigo: string;
  organismo: string | null;
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
    normalizado.includes("urgente") ||
    normalizado.includes("revision") ||
    normalizado.includes("borrador")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    normalizado.includes("media") ||
    normalizado.includes("pendiente") ||
    normalizado.includes("registrado")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    normalizado.includes("publicado") ||
    normalizado.includes("cerrado") ||
    normalizado.includes("emitido") ||
    normalizado.includes("baja")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function emptyForm(): FormAviso {
  return {
    titulo: "",
    tipo_aviso: "aviso_institucional_extraordinario",
    prioridad: "normal",
    estado: "borrador",
    ambito: "institucional",
    origen_funcional: "manual_frontend",
    destinatario_tipo: "equipo_interno",
    destinatario_nombre: "",
    destinatario_email: "",
    asunto: "",
    mensaje: "",
    observaciones: "",
    canal_previsto: "panel_institucional_demo",
    estado_canal: "registrado_no_enviado",
    referencia_externa: "",
    requiere_revision: false,
    requiere_confirmacion: false,
    conexion_id: "",
    entidad_id: "",
    oferta_id: "",
    actuacion_id: "",
    motivo_edicion: "",
  };
}

function formFromAviso(aviso: AvisoInstitucional): FormAviso {
  return {
    titulo: aviso.titulo ?? "",
    tipo_aviso: aviso.tipo_aviso ?? "aviso_institucional_extraordinario",
    prioridad: aviso.prioridad ?? "normal",
    estado: aviso.estado ?? "borrador",
    ambito: aviso.ambito ?? "institucional",
    origen_funcional: aviso.origen_funcional ?? "manual_frontend",
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
    conexion_id: aviso.conexion_id ? String(aviso.conexion_id) : "",
    entidad_id: aviso.entidad_id ? String(aviso.entidad_id) : "",
    oferta_id: aviso.oferta_id ? String(aviso.oferta_id) : "",
    actuacion_id: aviso.actuacion_id ? String(aviso.actuacion_id) : "",
    motivo_edicion: "",
  };
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function toNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function Kpi({
  labelText,
  value,
  detail,
}: {
  labelText: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-h-[74px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {labelText}
      </p>
      <p className="mt-0.5 text-[18px] font-semibold leading-5 text-slate-950">{value}</p>
      <p className="mt-0.5 text-[10px] leading-3 text-slate-500">{detail}</p>
    </div>
  );
}

export default function AvisosInstitucionalesPage() {
  const [avisos, setAvisos] = useState<AvisoInstitucional[]>([]);
  const [conexiones, setConexiones] = useState<ConexionLite[]>([]);
  const [historial, setHistorial] = useState<HistorialAviso[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [prioridadFiltro, setPrioridadFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [seleccionado, setSeleccionado] = useState<AvisoInstitucional | null>(null);
  const [modo, setModo] = useState<"ver" | "crear" | "editar">("ver");
  const [form, setForm] = useState<FormAviso>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargarAvisos() {
    setLoading(true);
    setError(null);

    const [{ data, error: avisosError }, { data: conexionesData, error: conexionesError }] =
      await Promise.all([
        supabase
          .from("v_avisos_institucionales_panel")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("conexiones_institucionales")
          .select("id,nombre,codigo,organismo")
          .order("nombre", { ascending: true }),
      ]);

    const firstError = avisosError || conexionesError;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setAvisos((data ?? []) as AvisoInstitucional[]);
    setConexiones((conexionesData ?? []) as ConexionLite[]);
    setLoading(false);
  }

  async function cargarHistorial(avisoId: number) {
    setHistorialLoading(true);

    const { data, error: historialError } = await supabase
      .from("avisos_institucionales_historial")
      .select("*")
      .eq("aviso_id", avisoId)
      .order("editado_en", { ascending: false })
      .limit(10);

    if (historialError) {
      setHistorial([]);
      setHistorialLoading(false);
      return;
    }

    setHistorial((data ?? []) as HistorialAviso[]);
    setHistorialLoading(false);
  }

  useEffect(() => {
    cargarAvisos();
  }, []);

  const prioridades = useMemo(() => {
    return Array.from(new Set(avisos.map((row) => row.prioridad)))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), "es"));
  }, [avisos]);

  const estados = useMemo(() => {
    return Array.from(new Set(avisos.map((row) => row.estado)))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), "es"));
  }, [avisos]);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return avisos.filter((row) => {
      const texto = [
        row.titulo,
        row.tipo_aviso,
        row.prioridad,
        row.estado,
        row.ambito,
        row.asunto,
        row.mensaje,
        row.observaciones,
        row.entidad_nombre,
        row.cif,
        row.codigo_accion,
        row.codigo_especialidad,
        row.conexion_nombre,
        row.conexion_codigo,
        row.destinatario_nombre,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaPrioridad = prioridadFiltro === "todos" || row.prioridad === prioridadFiltro;
      const pasaEstado = estadoFiltro === "todos" || row.estado === estadoFiltro;

      return pasaBusqueda && pasaPrioridad && pasaEstado;
    });
  }, [avisos, busqueda, prioridadFiltro, estadoFiltro]);

  const resumen = useMemo(() => {
    return filtrados.reduce(
      (acc, row) => {
        if (row.prioridad === "alta") acc.alta += 1;
        if (row.estado === "borrador") acc.borrador += 1;
        if (row.estado === "emitido") acc.emitidos += 1;
        if (row.requiere_revision) acc.revision += 1;
        if (row.requiere_confirmacion) acc.confirmacion += 1;
        if (row.conexion_id) acc.conConexion += 1;
        return acc;
      },
      {
        alta: 0,
        borrador: 0,
        emitidos: 0,
        revision: 0,
        confirmacion: 0,
        conConexion: 0,
      }
    );
  }, [filtrados]);

  function abrirDetalle(aviso: AvisoInstitucional) {
    setSeleccionado(aviso);
    setModo("ver");
    setForm(formFromAviso(aviso));
    setResultado(null);
    setHistorial([]);
    cargarHistorial(aviso.id);
  }

  function abrirCrear() {
    setSeleccionado(null);
    setModo("crear");
    setForm(emptyForm());
    setResultado(null);
    setHistorial([]);
  }

  function cerrarModal() {
    setSeleccionado(null);
    setModo("ver");
    setForm(emptyForm());
    setResultado(null);
    setHistorial([]);
  }

  function iniciarEdicion() {
    if (!seleccionado) return;
    setModo("editar");
    setForm(formFromAviso(seleccionado));
    setResultado(null);
  }

  async function editadoPorActual() {
    const { data } = await supabase.auth.getUser();

    return data?.user?.email ?? data?.user?.id ?? "usuario_demo_institucional";
  }

  function payloadFromForm() {
    return {
      titulo: form.titulo.trim(),
      tipo_aviso: form.tipo_aviso.trim() || "aviso_institucional_extraordinario",
      prioridad: form.prioridad,
      estado: form.estado,
      ambito: form.ambito.trim() || "institucional",
      origen_funcional: form.origen_funcional.trim() || "manual_frontend",

      entidad_id: toNullableNumber(form.entidad_id),
      oferta_id: toNullableNumber(form.oferta_id),
      actuacion_id: toNullableNumber(form.actuacion_id),
      conexion_id: toNullableNumber(form.conexion_id),

      destinatario_tipo: form.destinatario_tipo.trim() || "equipo_interno",
      destinatario_nombre: toNullableText(form.destinatario_nombre),
      destinatario_email: toNullableText(form.destinatario_email),

      asunto: form.asunto.trim(),
      mensaje: form.mensaje.trim(),
      observaciones: toNullableText(form.observaciones),

      canal_previsto: form.canal_previsto.trim() || "panel_institucional_demo",
      estado_canal: form.estado_canal.trim() || "registrado_no_enviado",
      referencia_externa: toNullableText(form.referencia_externa),

      requiere_revision: form.requiere_revision,
      requiere_confirmacion: form.requiere_confirmacion,

      fuente_origen: "demo_institucional",
      tipo_dato: "simulacion_controlada",
      updated_at: new Date().toISOString(),
    };
  }

  async function guardarNuevoAviso() {
    if (!form.titulo.trim() || !form.asunto.trim() || !form.mensaje.trim()) {
      setResultado("Título, asunto y mensaje son obligatorios.");
      return;
    }

    setGuardando(true);
    setResultado(null);

    const payload = payloadFromForm();

    const { data, error: insertError } = await supabase
      .from("avisos_institucionales")
      .insert(payload)
      .select("id")
      .single();

    if (insertError) {
      setResultado(`No se pudo crear el aviso: ${insertError.message}`);
      setGuardando(false);
      return;
    }

    const editadoPor = await editadoPorActual();

    await supabase.from("avisos_institucionales_historial").insert({
      aviso_id: data.id,
      campo: "creacion",
      valor_anterior: null,
      valor_nuevo: form.titulo.trim(),
      motivo_edicion:
        form.motivo_edicion.trim() ||
        "Creación manual de aviso institucional extraordinario desde frontend.",
      editado_por: editadoPor,
    });

    await cargarAvisos();

    setResultado("Aviso institucional creado y trazabilidad registrada.");
    setGuardando(false);
    setModo("ver");

    const { data: avisoCreado } = await supabase
      .from("v_avisos_institucionales_panel")
      .select("*")
      .eq("id", data.id)
      .single();

    if (avisoCreado) {
      const aviso = avisoCreado as AvisoInstitucional;
      setSeleccionado(aviso);
      setForm(formFromAviso(aviso));
      await cargarHistorial(aviso.id);
    }
  }

  async function guardarEdicion() {
    if (!seleccionado) return;

    if (!form.titulo.trim() || !form.asunto.trim() || !form.mensaje.trim()) {
      setResultado("Título, asunto y mensaje son obligatorios.");
      return;
    }

    const payload = payloadFromForm();

    const comparables: Array<{
      campo: keyof FormAviso;
      anterior: string;
      nuevo: string;
    }> = [
      { campo: "titulo", anterior: seleccionado.titulo ?? "", nuevo: form.titulo },
      { campo: "tipo_aviso", anterior: seleccionado.tipo_aviso ?? "", nuevo: form.tipo_aviso },
      { campo: "prioridad", anterior: seleccionado.prioridad ?? "", nuevo: form.prioridad },
      { campo: "estado", anterior: seleccionado.estado ?? "", nuevo: form.estado },
      { campo: "ambito", anterior: seleccionado.ambito ?? "", nuevo: form.ambito },
      { campo: "destinatario_tipo", anterior: seleccionado.destinatario_tipo ?? "", nuevo: form.destinatario_tipo },
      { campo: "destinatario_nombre", anterior: seleccionado.destinatario_nombre ?? "", nuevo: form.destinatario_nombre },
      { campo: "destinatario_email", anterior: seleccionado.destinatario_email ?? "", nuevo: form.destinatario_email },
      { campo: "asunto", anterior: seleccionado.asunto ?? "", nuevo: form.asunto },
      { campo: "mensaje", anterior: seleccionado.mensaje ?? "", nuevo: form.mensaje },
      { campo: "observaciones", anterior: seleccionado.observaciones ?? "", nuevo: form.observaciones },
      { campo: "canal_previsto", anterior: seleccionado.canal_previsto ?? "", nuevo: form.canal_previsto },
      { campo: "estado_canal", anterior: seleccionado.estado_canal ?? "", nuevo: form.estado_canal },
      { campo: "referencia_externa", anterior: seleccionado.referencia_externa ?? "", nuevo: form.referencia_externa },
      { campo: "conexion_id", anterior: seleccionado.conexion_id ? String(seleccionado.conexion_id) : "", nuevo: form.conexion_id },
      { campo: "entidad_id", anterior: seleccionado.entidad_id ? String(seleccionado.entidad_id) : "", nuevo: form.entidad_id },
      { campo: "oferta_id", anterior: seleccionado.oferta_id ? String(seleccionado.oferta_id) : "", nuevo: form.oferta_id },
      { campo: "actuacion_id", anterior: seleccionado.actuacion_id ? String(seleccionado.actuacion_id) : "", nuevo: form.actuacion_id },
    ];

    const cambios = comparables.filter(
      (item) => item.anterior.trim() !== item.nuevo.trim()
    );

    const revisionAnterior = String(Boolean(seleccionado.requiere_revision));
    const revisionNueva = String(Boolean(form.requiere_revision));
    const confirmacionAnterior = String(Boolean(seleccionado.requiere_confirmacion));
    const confirmacionNueva = String(Boolean(form.requiere_confirmacion));

    if (revisionAnterior !== revisionNueva) {
      cambios.push({
        campo: "requiere_revision",
        anterior: revisionAnterior,
        nuevo: revisionNueva,
      });
    }

    if (confirmacionAnterior !== confirmacionNueva) {
      cambios.push({
        campo: "requiere_confirmacion",
        anterior: confirmacionAnterior,
        nuevo: confirmacionNueva,
      });
    }

    if (cambios.length === 0) {
      setResultado("No hay cambios para guardar.");
      return;
    }

    setGuardando(true);
    setResultado(null);

    const { error: updateError } = await supabase
      .from("avisos_institucionales")
      .update(payload)
      .eq("id", seleccionado.id);

    if (updateError) {
      setResultado(`No se pudo guardar la edición: ${updateError.message}`);
      setGuardando(false);
      return;
    }

    const editadoPor = await editadoPorActual();

    const historialRows = cambios.map((cambio) => ({
      aviso_id: seleccionado.id,
      campo: cambio.campo,
      valor_anterior: cambio.anterior,
      valor_nuevo: cambio.nuevo,
      motivo_edicion:
        form.motivo_edicion.trim() ||
        "Edición manual de aviso institucional extraordinario desde frontend.",
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

    await cargarAvisos();

    const { data: avisoActualizado } = await supabase
      .from("v_avisos_institucionales_panel")
      .select("*")
      .eq("id", seleccionado.id)
      .single();

    if (avisoActualizado) {
      const aviso = avisoActualizado as AvisoInstitucional;
      setSeleccionado(aviso);
      setForm(formFromAviso(aviso));
      await cargarHistorial(aviso.id);
    }

    setResultado("Cambios guardados y trazabilidad registrada.");
    setModo("ver");
    setGuardando(false);
  }

  async function emitirComunicacionExtraordinaria() {
    if (!seleccionado) return;

    const estadoActual = String(seleccionado.estado ?? "").toLowerCase();

    if (estadoActual === "emitido" || estadoActual === "cerrado") {
      setResultado("Este aviso ya está emitido o cerrado.");
      return;
    }

    setGuardando(true);
    setResultado(null);

    const fechaEmision = new Date().toISOString();
    const editadoPor = await editadoPorActual();

    const updatePayload = {
      estado: "emitido",
      estado_canal: "comunicacion_extraordinaria_emitida",
      fecha_publicacion: fechaEmision,
      updated_at: fechaEmision,
    };

    const { error: updateError } = await supabase
      .from("avisos_institucionales")
      .update(updatePayload)
      .eq("id", seleccionado.id);

    if (updateError) {
      setResultado(`No se pudo emitir la comunicación extraordinaria: ${updateError.message}`);
      setGuardando(false);
      return;
    }

    const historialRows = [
      {
        aviso_id: seleccionado.id,
        campo: "estado",
        valor_anterior: seleccionado.estado,
        valor_nuevo: "emitido",
        motivo_edicion:
          "Emisión de comunicación extraordinaria oficial desde Avisos institucionales.",
        editado_por: editadoPor,
      },
      {
        aviso_id: seleccionado.id,
        campo: "estado_canal",
        valor_anterior: seleccionado.estado_canal,
        valor_nuevo: "comunicacion_extraordinaria_emitida",
        motivo_edicion:
          "Registro de canal extraordinario oficial desde Avisos institucionales.",
        editado_por: editadoPor,
      },
      {
        aviso_id: seleccionado.id,
        campo: "fecha_publicacion",
        valor_anterior: seleccionado.fecha_publicacion,
        valor_nuevo: fechaEmision,
        motivo_edicion:
          "Fecha de emisión de comunicación extraordinaria oficial.",
        editado_por: editadoPor,
      },
    ];

    const { error: historialError } = await supabase
      .from("avisos_institucionales_historial")
      .insert(historialRows);

    if (historialError) {
      setResultado(
        `La comunicación se emitió, pero no se pudo registrar historial: ${historialError.message}`
      );
      setGuardando(false);
      return;
    }

    await cargarAvisos();

    const { data: avisoActualizado } = await supabase
      .from("v_avisos_institucionales_panel")
      .select("*")
      .eq("id", seleccionado.id)
      .single();

    if (avisoActualizado) {
      const aviso = avisoActualizado as AvisoInstitucional;
      setSeleccionado(aviso);
      setForm(formFromAviso(aviso));
      await cargarHistorial(aviso.id);
    }

    setResultado("Comunicación extraordinaria emitida y trazabilidad registrada.");
    setGuardando(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando avisos institucionales...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error cargando avisos institucionales</p>
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
            <h1 className="mt-1 text-xl font-semibold">Avisos institucionales</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Avisos extraordinarios internos, estratégicos y trazables. No sustituyen comunicaciones ordinarias.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtrados.length)} avisos visibles · {num(avisos.length)} registrados
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver al dashboard
            </Link>
            <Link href="/mesa-fiscalizacion" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Mesa fiscalización
            </Link>
            <Link href="/conexiones" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Conexiones
            </Link>
            <Link href="/actuaciones-emitidas" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Actuaciones emitidas
            </Link>
          </div>

          <Link
  href="/avisos-institucionales/nuevo"
  className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f]"
>
  Nuevo aviso
</Link>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi labelText="Avisos" value={num(filtrados.length)} detail="extraordinarios" />
          <Kpi labelText="Prioridad alta" value={num(resumen.alta)} detail="revisión preferente" />
          <Kpi labelText="Borradores" value={num(resumen.borrador)} detail="sin emisión oficial" />
          <Kpi labelText="Emitidos" value={num(resumen.emitidos)} detail="comunicación extraordinaria" />
          <Kpi labelText="Confirmación" value={num(resumen.confirmacion)} detail="pendiente validar" />
          <Kpi labelText="Con conexión" value={num(resumen.conConexion)} detail="vinculados a API/canal" />
        </section>

        <section className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-950 shadow-sm">
          <p className="font-semibold">Lectura institucional</p>
          <p className="mt-0.5">
            Esta página registra avisos excepcionales internos o estratégicos. Cuando procede, permite emitir una comunicación
            extraordinaria oficial separada del circuito ordinario de actuaciones administrativas.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr_auto]">
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Título, asunto, entidad, conexión, destinatario..."
                className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Prioridad
              </label>
              <select
                value={prioridadFiltro}
                onChange={(event) => setPrioridadFiltro(event.target.value)}
                className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todas</option>
                {prioridades.map((prioridad) => (
                  <option key={prioridad} value={prioridad}>
                    {label(prioridad)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </label>
              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
                className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todos</option>
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {label(estado)}
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
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-3 py-2">
            <h2 className="text-sm font-semibold">Panel de avisos extraordinarios</h2>
            <p className="text-[11px] text-slate-500">
              Cada aviso puede vincularse a entidad, subexpediente, actuación o conexión institucional.
            </p>
          </div>

          <div className="max-h-[610px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Aviso</th>
                  <th className="px-2 py-2">Ámbito</th>
                  <th className="px-2 py-2">Vínculo</th>
                  <th className="px-2 py-2">Destinatario</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Revisión</th>
                  <th className="px-2 py-2">Historial</th>
                  <th className="px-2 py-2">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{row.titulo}</p>
                      <p className="line-clamp-1 text-[10px] text-slate-500">{row.asunto}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.prioridad)}`}>
                          {label(row.prioridad)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {label(row.tipo_aviso)}
                        </span>
                      </div>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold">{label(row.ambito)}</p>
                      <p className="text-[10px] text-slate-500">{label(row.origen_funcional)}</p>
                    </td>

                    <td className="px-2 py-1.5">
                      {row.conexion_id ? (
                        <>
                          <p className="font-semibold">{row.conexion_nombre ?? "Conexión"}</p>
                          <p className="text-[10px] text-slate-500">{row.conexion_codigo ?? "—"}</p>
                        </>
                      ) : row.entidad_id ? (
                        <>
                          <p className="font-semibold">{row.entidad_nombre ?? "Entidad vinculada"}</p>
                          <p className="text-[10px] text-slate-500">{row.cif ?? "—"}</p>
                        </>
                      ) : row.oferta_id ? (
                        <>
                          <p className="font-semibold">{row.codigo_accion ?? "Subexpediente"}</p>
                          <p className="text-[10px] text-slate-500">{row.codigo_especialidad ?? "—"}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold">Sin vínculo específico</p>
                          <p className="text-[10px] text-slate-500">Aviso transversal</p>
                        </>
                      )}
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold">{label(row.destinatario_tipo)}</p>
                      <p className="text-[10px] text-slate-500">{row.destinatario_nombre ?? "—"}</p>
                    </td>

                    <td className="px-2 py-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(row.estado)}`}>
                        {label(row.estado)}
                      </span>
                      <p className="mt-1 text-[10px] text-slate-500">{label(row.estado_canal)}</p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold">
                        {row.requiere_revision ? "Sí" : "No"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Confirmación: {row.requiere_confirmacion ? "Sí" : "No"}
                      </p>
                    </td>

                    <td className="px-2 py-1.5 font-semibold">
                      {num(row.historial_count)}
                    </td>

                    <td className="px-2 py-1.5">
                      <Link
  href={`/avisos-institucionales/${row.id}`}
  className="rounded-lg bg-[#183B63] px-2 py-1 text-center text-[10px] font-semibold text-white hover:bg-[#122f4f]"
>
  Abrir expediente
</Link>
                    </td>
                  </tr>
                ))}

                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay avisos que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {modo === "crear" || seleccionado ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                {modo === "crear" ? "Nuevo aviso institucional" : "Detalle de aviso institucional"}
              </p>
              <h2 className="mt-0.5 text-lg font-semibold">
                {modo === "crear" ? "Crear aviso extraordinario" : seleccionado?.titulo}
              </h2>
              <p className="mt-0.5 text-[11px] text-blue-100">
                Aviso extraordinario · comunicación institucional no ordinaria
              </p>
            </div>

            <div className="space-y-3 p-4">
              {modo === "ver" && seleccionado ? (
                <>
                  <section className="grid gap-2 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase text-slate-500">Prioridad</p>
                      <p className="mt-0.5 text-sm font-semibold">{label(seleccionado.prioridad)}</p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase text-slate-500">Estado</p>
                      <p className="mt-0.5 text-sm font-semibold">{label(seleccionado.estado)}</p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase text-slate-500">Ámbito</p>
                      <p className="mt-0.5 text-sm font-semibold">{label(seleccionado.ambito)}</p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase text-slate-500">Historial</p>
                      <p className="mt-0.5 text-sm font-semibold">{num(seleccionado.historial_count)} cambios</p>
                    </div>
                  </section>

                  <section className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-950">
                    <p className="font-semibold">Lectura institucional</p>
                    <p className="mt-0.5">
                      Este aviso es extraordinario y sirve para coordinar revisión interna, seguimiento estratégico o comunicación oficial
                      no ordinaria. No sustituye el circuito ordinario de actuaciones administrativas cuando este procede.
                    </p>
                  </section>

                  <section className="grid gap-2 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Asunto</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{seleccionado.asunto}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Destinatario</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {seleccionado.destinatario_nombre ?? "—"}
                      </p>
                      <p className="text-[11px] text-slate-500">{label(seleccionado.destinatario_tipo)}</p>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Mensaje</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {seleccionado.mensaje}
                    </p>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Observaciones</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {seleccionado.observaciones ?? "—"}
                    </p>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Historial de cambios
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Trazabilidad registrada en backend para este aviso.
                        </p>
                      </div>

                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {historialLoading ? "Cargando..." : `${num(historial.length)} visibles`}
                      </span>
                    </div>

                    <div className="mt-2 max-h-44 overflow-auto rounded-lg border border-slate-200 bg-white">
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
                        <p className="px-3 py-3 text-[11px] text-slate-500">
                          Todavía no hay ediciones registradas para este aviso.
                        </p>
                      )}
                    </div>
                  </section>
                </>
              ) : (
                <section className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Título
                      </label>
                      <input
                        value={form.titulo}
                        onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Prioridad
                        </label>
                        <select
                          value={form.prioridad}
                          onChange={(event) => setForm((prev) => ({ ...prev, prioridad: event.target.value }))}
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
                          value={form.estado}
                          onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value }))}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        >
                          <option value="borrador">borrador</option>
                          <option value="registrado">registrado</option>
                          <option value="emitido">emitido</option>
                          <option value="cerrado">cerrado</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Ámbito
                        </label>
                        <input
                          value={form.ambito}
                          onChange={(event) => setForm((prev) => ({ ...prev, ambito: event.target.value }))}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Conexión institucional vinculada
                      </label>
                      <select
                        value={form.conexion_id}
                        onChange={(event) => setForm((prev) => ({ ...prev, conexion_id: event.target.value }))}
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
                          value={form.entidad_id}
                          onChange={(event) => setForm((prev) => ({ ...prev, entidad_id: event.target.value }))}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Oferta ID
                        </label>
                        <input
                          value={form.oferta_id}
                          onChange={(event) => setForm((prev) => ({ ...prev, oferta_id: event.target.value }))}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Actuación ID
                        </label>
                        <input
                          value={form.actuacion_id}
                          onChange={(event) => setForm((prev) => ({ ...prev, actuacion_id: event.target.value }))}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.requiere_revision}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, requiere_revision: event.target.checked }))
                          }
                        />
                        Requiere revisión
                      </label>

                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.requiere_confirmacion}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, requiere_confirmacion: event.target.checked }))
                          }
                        />
                        Requiere confirmación
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Asunto
                      </label>
                      <input
                        value={form.asunto}
                        onChange={(event) => setForm((prev) => ({ ...prev, asunto: event.target.value }))}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Mensaje
                      </label>
                      <textarea
                        value={form.mensaje}
                        onChange={(event) => setForm((prev) => ({ ...prev, mensaje: event.target.value }))}
                        rows={7}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Observaciones
                      </label>
                      <textarea
                        value={form.observaciones}
                        onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Destinatario
                        </label>
                        <input
                          value={form.destinatario_nombre}
                          onChange={(event) => setForm((prev) => ({ ...prev, destinatario_nombre: event.target.value }))}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Tipo destinatario
                        </label>
                        <input
                          value={form.destinatario_tipo}
                          onChange={(event) => setForm((prev) => ({ ...prev, destinatario_tipo: event.target.value }))}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                        Motivo de edición / creación
                      </label>
                      <input
                        value={form.motivo_edicion}
                        onChange={(event) => setForm((prev) => ({ ...prev, motivo_edicion: event.target.value }))}
                        placeholder="Ej.: aviso creado para coordinar seguimiento institucional."
                        className="mt-1 h-9 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </section>
              )}

              {resultado ? (
                <div
                  className={
                    resultado.includes("guard") ||
                    resultado.includes("creado") ||
                    resultado.includes("emitida") ||
                    resultado.includes("registrada")
                      ? "rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"
                      : "rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
                  }
                >
                  {resultado}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                {modo === "ver" ? (
                  <>
                    {seleccionado &&
                    seleccionado.estado !== "emitido" &&
                    seleccionado.estado !== "cerrado" ? (
                      <button
                        type="button"
                        onClick={emitirComunicacionExtraordinaria}
                        disabled={guardando}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {guardando ? "Emitiendo..." : "Emitir comunicación extraordinaria"}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={iniciarEdicion}
                      disabled={guardando}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Editar aviso
                    </button>

                    <button
                      type="button"
                      onClick={cerrarModal}
                      disabled={guardando}
                      className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
                    >
                      Cerrar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (seleccionado) {
                          setModo("ver");
                          setForm(formFromAviso(seleccionado));
                        } else {
                          cerrarModal();
                        }
                      }}
                      disabled={guardando}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={modo === "crear" ? guardarNuevoAviso : guardarEdicion}
                      disabled={guardando}
                      className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
                    >
                      {guardando
                        ? "Guardando..."
                        : modo === "crear"
                        ? "Crear aviso"
                        : "Guardar cambios"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}