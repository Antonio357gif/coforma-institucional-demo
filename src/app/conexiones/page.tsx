"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type ConexionPanel = {
  id: number;
  nombre: string;
  codigo: string;
  tipo_conexion: string;
  organismo: string | null;
  descripcion: string | null;
  estado_conexion: string;
  entorno: string;
  url_referencia: string | null;
  requiere_credenciales: boolean;
  ultima_sincronizacion: string | null;
  observaciones: string | null;
  fuente_origen: string;
  tipo_dato: string;
  created_at: string;
  updated_at: string;
  pruebas_registradas: number;
  ultima_prueba_en: string | null;
  ultima_prueba_estado: string | null;
  ultima_prueba_codigo_respuesta: string | null;
  ultima_prueba_mensaje: string | null;
};

type HistorialConexion = {
  id: number;
  conexion_id: number;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  motivo_edicion: string | null;
  editado_por: string | null;
  editado_en: string;
};

type PruebaConexion = {
  id: number;
  conexion_id: number;
  tipo_prueba: string;
  estado_prueba: string;
  codigo_respuesta: string | null;
  mensaje_resultado: string | null;
  endpoint_referencia: string | null;
  payload_resumen: string | null;
  ejecutado_por: string | null;
  ejecutado_en: string;
  duracion_ms: number | null;
  entorno: string;
  tipo_dato: string;
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

function estadoClass(value: string | null | undefined) {
  const normalizado = String(value ?? "").toLowerCase();

  if (
    normalizado.includes("conectada") ||
    normalizado.includes("ok") ||
    normalizado.includes("correcta")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (
    normalizado.includes("propuesta") ||
    normalizado.includes("prevista") ||
    normalizado.includes("pendiente")
  ) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (
    normalizado.includes("simulada") ||
    normalizado.includes("demo") ||
    normalizado.includes("prueba")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    normalizado.includes("error") ||
    normalizado.includes("fallida") ||
    normalizado.includes("bloqueada")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
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
      <p className="mt-0.5 text-[18px] font-semibold leading-5 text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] leading-3 text-slate-500">{detail}</p>
    </div>
  );
}

function nombreCampo(value: string) {
  if (value === "nombre") return "Nombre";
  if (value === "tipo_conexion") return "Tipo de conexión";
  if (value === "organismo") return "Organismo";
  if (value === "descripcion") return "Descripción";
  if (value === "estado_conexion") return "Estado";
  if (value === "url_referencia") return "URL / referencia";
  if (value === "requiere_credenciales") return "Requiere credenciales";
  if (value === "observaciones") return "Observaciones";
  return value;
}

export default function ConexionesPage() {
  const [conexiones, setConexiones] = useState<ConexionPanel[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [seleccionada, setSeleccionada] = useState<ConexionPanel | null>(null);
  const [historial, setHistorial] = useState<HistorialConexion[]>([]);
  const [pruebas, setPruebas] = useState<PruebaConexion[]>([]);
  const [loading, setLoading] = useState(true);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [pruebasLoading, setPruebasLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [nombreEdit, setNombreEdit] = useState("");
  const [tipoEdit, setTipoEdit] = useState("");
  const [organismoEdit, setOrganismoEdit] = useState("");
  const [descripcionEdit, setDescripcionEdit] = useState("");
  const [estadoEdit, setEstadoEdit] = useState("");
  const [urlEdit, setUrlEdit] = useState("");
  const [requiereCredencialesEdit, setRequiereCredencialesEdit] = useState(true);
  const [observacionesEdit, setObservacionesEdit] = useState("");
  const [motivoEdicion, setMotivoEdicion] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [resultadoEdicion, setResultadoEdicion] = useState<string | null>(null);

  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [nuevoOrganismo, setNuevoOrganismo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("prevista");
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  const [guardandoNueva, setGuardandoNueva] = useState(false);
  const [resultadoNueva, setResultadoNueva] = useState<string | null>(null);

  const [registrandoPrueba, setRegistrandoPrueba] = useState(false);
  const [estadoPrueba, setEstadoPrueba] = useState("pendiente_autorizacion");
  const [codigoRespuesta, setCodigoRespuesta] = useState("");
  const [mensajeResultado, setMensajeResultado] = useState("");
  const [endpointReferencia, setEndpointReferencia] = useState("");
  const [payloadResumen, setPayloadResumen] = useState("");
  const [duracionMs, setDuracionMs] = useState("");
  const [guardandoPrueba, setGuardandoPrueba] = useState(false);
  const [resultadoPrueba, setResultadoPrueba] = useState<string | null>(null);

  async function cargarConexiones() {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("v_conexiones_institucionales_panel")
      .select("*")
      .order("id", { ascending: true });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setConexiones((data ?? []) as ConexionPanel[]);
    setLoading(false);
  }

  async function cargarHistorial(conexionId: number) {
    setHistorialLoading(true);

    const { data, error: historialError } = await supabase
      .from("conexiones_institucionales_historial")
      .select("*")
      .eq("conexion_id", conexionId)
      .order("editado_en", { ascending: false })
      .limit(8);

    if (historialError) {
      setHistorial([]);
      setHistorialLoading(false);
      return;
    }

    setHistorial((data ?? []) as HistorialConexion[]);
    setHistorialLoading(false);
  }

  async function cargarPruebas(conexionId: number) {
    setPruebasLoading(true);

    const { data, error: pruebasError } = await supabase
      .from("conexiones_institucionales_pruebas")
      .select("*")
      .eq("conexion_id", conexionId)
      .order("ejecutado_en", { ascending: false })
      .limit(8);

    if (pruebasError) {
      setPruebas([]);
      setPruebasLoading(false);
      return;
    }

    setPruebas((data ?? []) as PruebaConexion[]);
    setPruebasLoading(false);
  }

  function abrirDetalle(row: ConexionPanel) {
    setSeleccionada(row);
    setEditando(false);
    setRegistrandoPrueba(false);
    setResultadoEdicion(null);
    setResultadoPrueba(null);

    setNombreEdit(row.nombre ?? "");
    setTipoEdit(row.tipo_conexion ?? "");
    setOrganismoEdit(row.organismo ?? "");
    setDescripcionEdit(row.descripcion ?? "");
    setEstadoEdit(row.estado_conexion ?? "prevista");
    setUrlEdit(row.url_referencia ?? "");
    setRequiereCredencialesEdit(Boolean(row.requiere_credenciales));
    setObservacionesEdit(row.observaciones ?? "");
    setMotivoEdicion("");

    setEstadoPrueba("pendiente_autorizacion");
    setCodigoRespuesta("");
    setMensajeResultado("");
    setEndpointReferencia("");
    setPayloadResumen("");
    setDuracionMs("");

    cargarHistorial(row.id);
    cargarPruebas(row.id);
  }

  function cerrarDetalle() {
    setSeleccionada(null);
    setHistorial([]);
    setPruebas([]);
    setEditando(false);
    setRegistrandoPrueba(false);
    setResultadoEdicion(null);
    setResultadoPrueba(null);
  }

  function iniciarEdicion() {
    if (!seleccionada) return;

    setNombreEdit(seleccionada.nombre ?? "");
    setTipoEdit(seleccionada.tipo_conexion ?? "");
    setOrganismoEdit(seleccionada.organismo ?? "");
    setDescripcionEdit(seleccionada.descripcion ?? "");
    setEstadoEdit(seleccionada.estado_conexion ?? "prevista");
    setUrlEdit(seleccionada.url_referencia ?? "");
    setRequiereCredencialesEdit(Boolean(seleccionada.requiere_credenciales));
    setObservacionesEdit(seleccionada.observaciones ?? "");
    setMotivoEdicion("");
    setResultadoEdicion(null);
    setEditando(true);
  }

  function cancelarEdicion() {
    if (!seleccionada) return;

    setNombreEdit(seleccionada.nombre ?? "");
    setTipoEdit(seleccionada.tipo_conexion ?? "");
    setOrganismoEdit(seleccionada.organismo ?? "");
    setDescripcionEdit(seleccionada.descripcion ?? "");
    setEstadoEdit(seleccionada.estado_conexion ?? "prevista");
    setUrlEdit(seleccionada.url_referencia ?? "");
    setRequiereCredencialesEdit(Boolean(seleccionada.requiere_credenciales));
    setObservacionesEdit(seleccionada.observaciones ?? "");
    setMotivoEdicion("");
    setResultadoEdicion(null);
    setEditando(false);
  }

  async function guardarEdicion() {
    if (!seleccionada) return;

    const cambios: Array<{
      campo: string;
      anterior: string;
      nuevo: string;
    }> = [];

    const valores = [
      { campo: "nombre", anterior: seleccionada.nombre ?? "", nuevo: nombreEdit },
      { campo: "tipo_conexion", anterior: seleccionada.tipo_conexion ?? "", nuevo: tipoEdit },
      { campo: "organismo", anterior: seleccionada.organismo ?? "", nuevo: organismoEdit },
      { campo: "descripcion", anterior: seleccionada.descripcion ?? "", nuevo: descripcionEdit },
      { campo: "estado_conexion", anterior: seleccionada.estado_conexion ?? "", nuevo: estadoEdit },
      { campo: "url_referencia", anterior: seleccionada.url_referencia ?? "", nuevo: urlEdit },
      {
        campo: "requiere_credenciales",
        anterior: String(Boolean(seleccionada.requiere_credenciales)),
        nuevo: String(Boolean(requiereCredencialesEdit)),
      },
      {
        campo: "observaciones",
        anterior: seleccionada.observaciones ?? "",
        nuevo: observacionesEdit,
      },
    ];

    valores.forEach((item) => {
      if (item.anterior.trim() !== item.nuevo.trim()) {
        cambios.push(item);
      }
    });

    if (cambios.length === 0) {
      setResultadoEdicion("No hay cambios para guardar.");
      return;
    }

    setGuardandoEdicion(true);
    setResultadoEdicion(null);

    const { data: authData } = await supabase.auth.getUser();
    const editadoPor =
      authData?.user?.email ??
      authData?.user?.id ??
      "usuario_demo_institucional";

    const { error: updateError } = await supabase
      .from("conexiones_institucionales")
      .update({
        nombre: nombreEdit,
        tipo_conexion: tipoEdit,
        organismo: organismoEdit || null,
        descripcion: descripcionEdit || null,
        estado_conexion: estadoEdit,
        url_referencia: urlEdit || null,
        requiere_credenciales: requiereCredencialesEdit,
        observaciones: observacionesEdit || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", seleccionada.id);

    if (updateError) {
      setResultadoEdicion(`No se pudo guardar la edición: ${updateError.message}`);
      setGuardandoEdicion(false);
      return;
    }

    const historialRows = cambios.map((cambio) => ({
      conexion_id: seleccionada.id,
      campo: cambio.campo,
      valor_anterior: cambio.anterior,
      valor_nuevo: cambio.nuevo,
      motivo_edicion:
        motivoEdicion.trim() ||
        "Edición manual desde Conexiones institucionales.",
      editado_por: editadoPor,
    }));

    const { error: historialError } = await supabase
      .from("conexiones_institucionales_historial")
      .insert(historialRows);

    if (historialError) {
      setResultadoEdicion(
        `La conexión se actualizó, pero no se pudo registrar historial: ${historialError.message}`
      );
      setGuardandoEdicion(false);
      return;
    }

    await cargarConexiones();
    await cargarHistorial(seleccionada.id);

    const actualizada: ConexionPanel = {
      ...seleccionada,
      nombre: nombreEdit,
      tipo_conexion: tipoEdit,
      organismo: organismoEdit || null,
      descripcion: descripcionEdit || null,
      estado_conexion: estadoEdit,
      url_referencia: urlEdit || null,
      requiere_credenciales: requiereCredencialesEdit,
      observaciones: observacionesEdit || null,
      updated_at: new Date().toISOString(),
    };

    setSeleccionada(actualizada);
    setResultadoEdicion("Cambios guardados y trazabilidad registrada en backend.");
    setEditando(false);
    setGuardandoEdicion(false);
    setMotivoEdicion("");
  }

  async function crearConexion() {
    if (!nuevoNombre.trim() || !nuevoCodigo.trim() || !nuevoTipo.trim()) {
      setResultadoNueva("Nombre, código y tipo de conexión son obligatorios.");
      return;
    }

    setGuardandoNueva(true);
    setResultadoNueva(null);

    const codigoNormalizado = nuevoCodigo.trim().toUpperCase().replaceAll(" ", "_");

    const { data: authData } = await supabase.auth.getUser();
    const editadoPor =
      authData?.user?.email ??
      authData?.user?.id ??
      "usuario_demo_institucional";

    const { data, error: insertError } = await supabase
      .from("conexiones_institucionales")
      .insert({
        nombre: nuevoNombre.trim(),
        codigo: codigoNormalizado,
        tipo_conexion: nuevoTipo.trim(),
        organismo: nuevoOrganismo.trim() || null,
        descripcion: nuevaDescripcion.trim() || null,
        estado_conexion: nuevoEstado,
        entorno: "demo_institucional",
        url_referencia: null,
        requiere_credenciales: true,
        ultima_sincronizacion: null,
        observaciones:
          nuevaObservacion.trim() ||
          "Conexión creada manualmente desde frontend institucional.",
        fuente_origen: "demo_institucional",
        tipo_dato: "simulacion_controlada",
      })
      .select("id")
      .single();

    if (insertError) {
      setResultadoNueva(`No se pudo crear la conexión: ${insertError.message}`);
      setGuardandoNueva(false);
      return;
    }

    if (data?.id) {
      await supabase.from("conexiones_institucionales_historial").insert({
        conexion_id: data.id,
        campo: "creacion_conexion",
        valor_anterior: "",
        valor_nuevo: `${nuevoNombre.trim()} · ${codigoNormalizado}`,
        motivo_edicion: "Creación manual desde Conexiones institucionales.",
        editado_por: editadoPor,
      });
    }

    await cargarConexiones();

    setResultadoNueva("Conexión creada y trazabilidad registrada en backend.");
    setNuevoNombre("");
    setNuevoCodigo("");
    setNuevoTipo("");
    setNuevoOrganismo("");
    setNuevaDescripcion("");
    setNuevoEstado("prevista");
    setNuevaObservacion("");
    setGuardandoNueva(false);
  }

  async function registrarPruebaTecnica() {
    if (!seleccionada) return;

    setGuardandoPrueba(true);
    setResultadoPrueba(null);

    const { data: authData } = await supabase.auth.getUser();
    const ejecutadoPor =
      authData?.user?.email ??
      authData?.user?.id ??
      "usuario_demo_institucional";

    const { error: insertError } = await supabase
      .from("conexiones_institucionales_pruebas")
      .insert({
        conexion_id: seleccionada.id,
        tipo_prueba: "registro_tecnico_controlado",
        estado_prueba: estadoPrueba,
        codigo_respuesta: codigoRespuesta.trim() || null,
        mensaje_resultado:
          mensajeResultado.trim() ||
          "Registro técnico manual. No ejecuta llamada real ni guarda credenciales.",
        endpoint_referencia: endpointReferencia.trim() || null,
        payload_resumen: payloadResumen.trim() || null,
        ejecutado_por: ejecutadoPor,
        duracion_ms: duracionMs ? Number(duracionMs) : null,
        entorno: "demo_institucional",
        tipo_dato: "simulacion_controlada",
      });

    if (insertError) {
      setResultadoPrueba(`No se pudo registrar la prueba: ${insertError.message}`);
      setGuardandoPrueba(false);
      return;
    }

    await cargarPruebas(seleccionada.id);
    await cargarConexiones();

    setResultadoPrueba("Prueba técnica registrada en backend.");
    setEstadoPrueba("pendiente_autorizacion");
    setCodigoRespuesta("");
    setMensajeResultado("");
    setEndpointReferencia("");
    setPayloadResumen("");
    setDuracionMs("");
    setRegistrandoPrueba(false);
    setGuardandoPrueba(false);
  }

  useEffect(() => {
    cargarConexiones();
  }, []);

  const estados = useMemo(() => {
    return Array.from(new Set(conexiones.map((row) => row.estado_conexion)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [conexiones]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return conexiones.filter((row) => {
      const texto = [
        row.nombre,
        row.codigo,
        row.tipo_conexion,
        row.organismo,
        row.descripcion,
        row.estado_conexion,
        row.entorno,
        row.observaciones,
        row.tipo_dato,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaEstado = estadoFiltro === "todos" || row.estado_conexion === estadoFiltro;

      return pasaBusqueda && pasaEstado;
    });
  }, [conexiones, busqueda, estadoFiltro]);

  const resumen = useMemo(() => {
    return filtradas.reduce(
      (acc, row) => {
        if (row.estado_conexion === "propuesta_institucional") acc.propuestas++;
        if (row.estado_conexion === "prevista") acc.previstas++;
        if (row.estado_conexion === "simulada_demo") acc.simuladas++;
        if (row.requiere_credenciales) acc.credenciales++;
        acc.pruebas += Number(row.pruebas_registradas ?? 0);
        return acc;
      },
      {
        propuestas: 0,
        previstas: 0,
        simuladas: 0,
        credenciales: 0,
        pruebas: 0,
      }
    );
  }, [filtradas]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando conexiones institucionales...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error cargando conexiones institucionales
          </p>
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
            <h1 className="mt-1 text-xl font-semibold">Conexiones institucionales</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Fuentes externas, API bidireccional prevista, canales institucionales y trazabilidad técnica.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} conexiones visibles · {num(conexiones.length)} registradas
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-2 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              ← Volver al dashboard
            </Link>
            <Link href="/mesa-fiscalizacion" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Mesa fiscalización
            </Link>
            <Link href="/comunicaciones-canal" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Comunicaciones / canal
            </Link>
            <Link href="/trazabilidad-tecnica" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
              Trazabilidad técnica
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              setCreando(true);
              setResultadoNueva(null);
            }}
            className="rounded-lg bg-[#183B63] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f]"
          >
            Nueva conexión
          </button>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi labelText="Conexiones" value={num(filtradas.length)} detail="visibles en panel" />
          <Kpi labelText="Propuesta SCE" value={num(resumen.propuestas)} detail="origen institucional" />
          <Kpi labelText="Previstas" value={num(resumen.previstas)} detail="pendientes de integración" />
          <Kpi labelText="Simuladas demo" value={num(resumen.simuladas)} detail="sin API real activa" />
          <Kpi labelText="Credenciales" value={num(resumen.credenciales)} detail="requieren canal seguro" />
          <Kpi labelText="Pruebas" value={num(resumen.pruebas)} detail="registradas con autorización" />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.3fr_0.7fr_auto]">
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="SCE, SISPECAN, sede, carpeta entidad, resolución, justificación..."
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </label>
              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
                className="mt-0.5 h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white"
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
                  setEstadoFiltro("todos");
                }}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-3 py-2">
            <h2 className="text-sm font-semibold">Panel de conexiones y fuentes externas</h2>
            <p className="text-[11px] text-slate-500">
              No hay APIs reales activas. El panel registra conexiones previstas, simuladas y pruebas técnicas autorizadas.
            </p>
          </div>

          <div className="max-h-[560px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Conexión</th>
                  <th className="px-2 py-2">Organismo</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Credenciales</th>
                  <th className="px-2 py-2">Pruebas</th>
                  <th className="px-2 py-2">Última prueba</th>
                  <th className="px-2 py-2">Opciones</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1.5">
                      <p className="font-semibold leading-4 text-slate-950">{row.nombre}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.codigo}</p>
                      <p className="line-clamp-1 text-[10px] leading-4 text-slate-500">
                        {row.descripcion ?? "—"}
                      </p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold leading-4">{row.organismo ?? "—"}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.entorno}</p>
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold leading-4">{label(row.tipo_conexion)}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{row.tipo_dato}</p>
                    </td>

                    <td className="px-2 py-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${estadoClass(row.estado_conexion)}`}>
                        {label(row.estado_conexion)}
                      </span>
                    </td>

                    <td className="px-2 py-1.5">
                      <span className="text-[11px] font-semibold">
                        {row.requiere_credenciales ? "Sí" : "No"}
                      </span>
                      <p className="text-[10px] text-slate-500">No se guardan secretos</p>
                    </td>

                    <td className="px-2 py-1.5 font-semibold">
                      {num(row.pruebas_registradas)}
                    </td>

                    <td className="px-2 py-1.5">
                      <p className="font-semibold leading-4">
                        {row.ultima_prueba_estado ? label(row.ultima_prueba_estado) : "Sin pruebas"}
                      </p>
                      <p className="text-[10px] leading-4 text-slate-500">
                        {fecha(row.ultima_prueba_en)}
                      </p>
                    </td>

                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => abrirDetalle(row)}
                        className="rounded-lg bg-[#183B63] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                      >
                        Ver conexión
                      </button>
                    </td>
                  </tr>
                ))}

                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay conexiones que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {creando ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Nueva conexión institucional
              </p>
              <h2 className="mt-0.5 text-base font-semibold">Alta manual controlada</h2>
              <p className="mt-0.5 text-[11px] text-blue-100">
                Registro previsto/simulado. No activa APIs reales ni guarda credenciales.
              </p>
            </div>

            <div className="space-y-2 p-3">
              <section className="grid gap-2 lg:grid-cols-2">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Nombre
                  </label>
                  <input
                    value={nuevoNombre}
                    onChange={(event) => setNuevoNombre(event.target.value)}
                    className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Código
                  </label>
                  <input
                    value={nuevoCodigo}
                    onChange={(event) => setNuevoCodigo(event.target.value)}
                    placeholder="EJEMPLO_CONEXION"
                    className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Tipo de conexión
                  </label>
                  <input
                    value={nuevoTipo}
                    onChange={(event) => setNuevoTipo(event.target.value)}
                    placeholder="api_prevista / canal_institucional_previsto..."
                    className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Organismo
                  </label>
                  <input
                    value={nuevoOrganismo}
                    onChange={(event) => setNuevoOrganismo(event.target.value)}
                    className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>
              </section>

              <section className="grid gap-2 lg:grid-cols-[1fr_0.35fr]">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Descripción
                  </label>
                  <textarea
                    value={nuevaDescripcion}
                    onChange={(event) => setNuevaDescripcion(event.target.value)}
                    rows={4}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-5 outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </label>
                  <select
                    value={nuevoEstado}
                    onChange={(event) => setNuevoEstado(event.target.value)}
                    className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                  >
                    <option value="prevista">prevista</option>
                    <option value="simulada_demo">simulada_demo</option>
                    <option value="propuesta_institucional">propuesta_institucional</option>
                    <option value="pendiente_credenciales">pendiente_credenciales</option>
                    <option value="en_pruebas">en_pruebas</option>
                  </select>
                </div>
              </section>

              <div>
                <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  Observaciones
                </label>
                <textarea
                  value={nuevaObservacion}
                  onChange={(event) => setNuevaObservacion(event.target.value)}
                  rows={3}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-5 outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              {resultadoNueva ? (
                <div
                  className={
                    resultadoNueva.includes("creada")
                      ? "rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"
                      : "rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
                  }
                >
                  {resultadoNueva}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setCreando(false)}
                  disabled={guardandoNueva}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={crearConexion}
                  disabled={guardandoNueva}
                  className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
                >
                  {guardandoNueva ? "Guardando..." : "Crear conexión"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {seleccionada ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Detalle de conexión institucional
              </p>
              <h2 className="mt-0.5 text-base font-semibold">{seleccionada.nombre}</h2>
              <p className="mt-0.5 text-[11px] text-blue-100">
                {seleccionada.codigo} · {label(seleccionada.tipo_conexion)} · {seleccionada.organismo ?? "—"}
              </p>
            </div>

            <div className="space-y-2 p-3">
              <section className="grid gap-2 md:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase text-slate-500">Estado</p>
                  <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${estadoClass(seleccionada.estado_conexion)}`}>
                    {label(seleccionada.estado_conexion)}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase text-slate-500">Entorno</p>
                  <p className="mt-0.5 text-[13px] font-semibold">{seleccionada.entorno}</p>
                  <p className="text-[10px] text-slate-500">{seleccionada.tipo_dato}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase text-slate-500">Credenciales</p>
                  <p className="mt-0.5 text-[13px] font-semibold">
                    {seleccionada.requiere_credenciales ? "Requiere canal seguro" : "No requiere"}
                  </p>
                  <p className="text-[10px] text-slate-500">No se guardan secretos</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-semibold uppercase text-slate-500">Pruebas</p>
                  <p className="mt-0.5 text-[13px] font-semibold">{num(seleccionada.pruebas_registradas)}</p>
                  <p className="text-[10px] text-slate-500">{fecha(seleccionada.ultima_prueba_en)}</p>
                </div>
              </section>

              <section className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] leading-5 text-blue-950">
                <p className="font-semibold">Lectura institucional</p>
                <p className="mt-0.5">
                  Esta pantalla no ejecuta conexiones reales ni almacena credenciales. Registra el estado de las conexiones previstas,
                  su trazabilidad y, si existe autorización, las pruebas técnicas realizadas de forma controlada.
                </p>
              </section>

              {editando ? (
                <section className="grid gap-2 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Nombre
                      </label>
                      <input
                        value={nombreEdit}
                        onChange={(event) => setNombreEdit(event.target.value)}
                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Tipo de conexión
                      </label>
                      <input
                        value={tipoEdit}
                        onChange={(event) => setTipoEdit(event.target.value)}
                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Organismo
                      </label>
                      <input
                        value={organismoEdit}
                        onChange={(event) => setOrganismoEdit(event.target.value)}
                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Estado
                      </label>
                      <select
                        value={estadoEdit}
                        onChange={(event) => setEstadoEdit(event.target.value)}
                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                      >
                        <option value="propuesta_institucional">propuesta_institucional</option>
                        <option value="prevista">prevista</option>
                        <option value="simulada_demo">simulada_demo</option>
                        <option value="pendiente_credenciales">pendiente_credenciales</option>
                        <option value="pendiente_convenio">pendiente_convenio</option>
                        <option value="en_pruebas">en_pruebas</option>
                        <option value="conectada">conectada</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={requiereCredencialesEdit}
                        onChange={(event) => setRequiereCredencialesEdit(event.target.checked)}
                      />
                      Requiere credenciales / canal seguro
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Descripción
                      </label>
                      <textarea
                        value={descripcionEdit}
                        onChange={(event) => setDescripcionEdit(event.target.value)}
                        rows={4}
                        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-5 outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        URL / referencia pública
                      </label>
                      <input
                        value={urlEdit}
                        onChange={(event) => setUrlEdit(event.target.value)}
                        placeholder="No incluir tokens ni claves"
                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Observaciones
                      </label>
                      <textarea
                        value={observacionesEdit}
                        onChange={(event) => setObservacionesEdit(event.target.value)}
                        rows={3}
                        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-5 outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                        Motivo de edición
                      </label>
                      <input
                        value={motivoEdicion}
                        onChange={(event) => setMotivoEdicion(event.target.value)}
                        placeholder="Ej.: actualización del estado tras reunión técnica."
                        className="mt-1 h-8 w-full rounded-lg border border-amber-200 bg-white px-3 text-[12px] outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </section>
              ) : registrandoPrueba ? (
                <section className="grid gap-2 lg:grid-cols-[0.7fr_1.3fr]">
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-900">
                    <p className="font-semibold">Registro de prueba técnica</p>
                    <p className="mt-1">
                      Este formulario no ejecuta una API real. Solo registra una prueba autorizada, un resultado técnico o una
                      situación de pendiente de autorización. No introduzcas tokens, claves ni credenciales.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Estado prueba
                        </label>
                        <select
                          value={estadoPrueba}
                          onChange={(event) => setEstadoPrueba(event.target.value)}
                          className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                        >
                          <option value="pendiente_autorizacion">pendiente_autorizacion</option>
                          <option value="autorizada_no_ejecutada">autorizada_no_ejecutada</option>
                          <option value="ok">ok</option>
                          <option value="fallida">fallida</option>
                          <option value="pendiente_credenciales">pendiente_credenciales</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Código respuesta
                        </label>
                        <input
                          value={codigoRespuesta}
                          onChange={(event) => setCodigoRespuesta(event.target.value)}
                          placeholder="200 / 401 / pendiente..."
                          className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Duración ms
                        </label>
                        <input
                          value={duracionMs}
                          onChange={(event) => setDuracionMs(event.target.value)}
                          type="number"
                          className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Endpoint / referencia segura
                      </label>
                      <input
                        value={endpointReferencia}
                        onChange={(event) => setEndpointReferencia(event.target.value)}
                        placeholder="Referencia no sensible. No pegar tokens."
                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Mensaje resultado
                      </label>
                      <textarea
                        value={mensajeResultado}
                        onChange={(event) => setMensajeResultado(event.target.value)}
                        rows={3}
                        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-5 outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Payload resumen
                      </label>
                      <textarea
                        value={payloadResumen}
                        onChange={(event) => setPayloadResumen(event.target.value)}
                        rows={2}
                        placeholder="Resumen no sensible de la prueba."
                        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-5 outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </div>
                  </div>
                </section>
              ) : (
                <>
                  <section className="grid gap-2 lg:grid-cols-[0.85fr_1.15fr]">
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Tipo de conexión
                        </p>
                        <p className="mt-0.5 text-[13px] font-semibold">{label(seleccionada.tipo_conexion)}</p>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Organismo
                        </p>
                        <p className="mt-0.5 text-[13px] font-semibold">{seleccionada.organismo ?? "—"}</p>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Última actualización
                        </p>
                        <p className="mt-0.5 text-[13px] font-semibold">{fecha(seleccionada.updated_at)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                      <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Descripción
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-700">
                          {seleccionada.descripcion ?? "—"}
                        </p>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Observaciones
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-700">
                          {seleccionada.observaciones ?? "—"}
                        </p>
                      </section>
                    </div>
                  </section>

                  <section className="grid gap-2 lg:grid-cols-2">
                    <section className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                            Historial de cambios
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Cambios registrados en backend.
                          </p>
                        </div>

                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {historialLoading ? "Cargando..." : `${num(historial.length)} visibles`}
                        </span>
                      </div>

                      <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white">
                        {historial.length > 0 ? (
                          historial.map((item) => (
                            <div key={item.id} className="border-b border-slate-100 px-3 py-2 last:border-b-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold text-slate-950">
                                  {nombreCampo(item.campo)}
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
                            Todavía no hay ediciones registradas para esta conexión.
                          </p>
                        )}
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                            Pruebas técnicas
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Solo bajo autorización. Sin credenciales ni secretos.
                          </p>
                        </div>

                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {pruebasLoading ? "Cargando..." : `${num(pruebas.length)} visibles`}
                        </span>
                      </div>

                      <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white">
                        {pruebas.length > 0 ? (
                          pruebas.map((item) => (
                            <div key={item.id} className="border-b border-slate-100 px-3 py-2 last:border-b-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${estadoClass(item.estado_prueba)}`}>
                                  {label(item.estado_prueba)}
                                </span>
                                <p className="text-[10px] text-slate-500">
                                  {fecha(item.ejecutado_en)} · {item.ejecutado_por ?? "—"}
                                </p>
                              </div>

                              <p className="mt-1 text-[10px] text-slate-600">
                                Código: {item.codigo_respuesta ?? "—"} · Duración:{" "}
                                {item.duracion_ms ? `${num(item.duracion_ms)} ms` : "—"}
                              </p>

                              <p className="mt-1 line-clamp-2 rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-700">
                                {item.mensaje_resultado ?? "Sin mensaje registrado."}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="px-3 py-3 text-[11px] text-slate-500">
                            No se han registrado pruebas técnicas. Correcto: requieren autorización o endpoint facilitado.
                          </p>
                        )}
                      </div>
                    </section>
                  </section>
                </>
              )}

              {resultadoEdicion ? (
                <div
                  className={
                    resultadoEdicion.includes("guardados") || resultadoEdicion.includes("registrada")
                      ? "rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"
                      : "rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
                  }
                >
                  {resultadoEdicion}
                </div>
              ) : null}

              {resultadoPrueba ? (
                <div
                  className={
                    resultadoPrueba.includes("registrada")
                      ? "rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"
                      : "rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
                  }
                >
                  {resultadoPrueba}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                {editando ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelarEdicion}
                      disabled={guardandoEdicion}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={guardarEdicion}
                      disabled={guardandoEdicion}
                      className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
                    >
                      {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </>
                ) : registrandoPrueba ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setRegistrandoPrueba(false)}
                      disabled={guardandoPrueba}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={registrarPruebaTecnica}
                      disabled={guardandoPrueba}
                      className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
                    >
                      {guardandoPrueba ? "Registrando..." : "Registrar prueba"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={iniciarEdicion}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Editar conexión
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegistrandoPrueba(true)}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Registrar prueba autorizada
                    </button>

                    <button
                      type="button"
                      onClick={cerrarDetalle}
                      className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f]"
                    >
                      Cerrar
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