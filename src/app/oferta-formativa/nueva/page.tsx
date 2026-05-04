"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type ConvocatoriaRow = {
  id: number;
  codigo: string;
  nombre: string;
  organismo: string;
  ejercicio: number | null;
  estado: string;
  fecha_resolucion: string | null;
};

type EntidadRow = {
  id: number;
  nombre: string;
  cif: string;
  isla: string | null;
  provincia: string | null;
  municipio: string | null;
  direccion: string | null;
  tipo_entidad: string | null;
};

type FormConvocatoria = {
  codigo: string;
  nombre: string;
  organismo: string;
  organismo_otro: string;
  ambito: string;
  ejercicio: string;
  fecha_resolucion: string;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion: string;
  documento_origen: string;
};

type FormEntidad = {
  nombre: string;
  cif: string;
  isla: string;
  provincia: string;
  municipio: string;
  direccion: string;
  tipo_entidad: string;
};

type FormOferta = {
  tipo_oferta: "AF" | "CP";
  estado_concesion: "concedida" | "renunciada" | "modificada" | "anulada";
  codigo_accion: string;
  codigo_especialidad: string;
  denominacion: string;
  familia_profesional: string;
  modalidad: string;
  horas: string;
  alumnos_previstos: string;
  importe_concedido: string;
  centro_formacion: string;
  isla: string;
  municipio: string;
  fecha_inicio_prevista: string;
  fecha_fin_prevista: string;
  observaciones: string;
};

const ORGANISMOS = [
  "Servicio Canario de Empleo",
  "FUNCATRA",
  "SEPE",
  "Gobierno de Canarias",
  "Cabildo de Gran Canaria",
  "Cabildo de Tenerife",
  "Cabildo de Lanzarote",
  "Cabildo de Fuerteventura",
  "Cabildo de La Palma",
  "Cabildo de La Gomera",
  "Cabildo de El Hierro",
  "Ayuntamiento",
  "Otro organismo",
];

const EJERCICIOS = ["2024", "2025", "2026", "2027", "2028"];

function limpiarTexto(value: string) {
  return value.trim();
}

function normalizarCif(value: string) {
  return value.trim().toUpperCase();
}

function nullable(value: string) {
  const limpio = value.trim();
  return limpio === "" ? null : limpio;
}

function nullableDate(value: string) {
  return value.trim() === "" ? null : value;
}

function nullableInt(value: string) {
  const limpio = value.trim();
  if (!limpio) return null;

  const numero = Number(limpio);
  return Number.isNaN(numero) ? null : numero;
}

function parseEntero(value: string, fallback = 0) {
  const limpio = value.trim();
  if (!limpio) return fallback;

  const numero = Number(limpio.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(numero) ? fallback : Math.trunc(numero);
}

function parseImporte(value: string, fallback = 0) {
  const limpio = value.trim();
  if (!limpio) return fallback;

  if (limpio.includes(",")) {
    const numero = Number(limpio.replace(/\./g, "").replace(",", "."));
    return Number.isNaN(numero) ? fallback : numero;
  }

  const numero = Number(limpio);
  return Number.isNaN(numero) ? fallback : numero;
}

function Label({ children }: { children: ReactNode }) {
  return (
    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      className={`mt-1 h-8 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-blue-400 ${
        readOnly ? "bg-slate-50 text-slate-600" : "bg-white text-slate-950"
      }`}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-blue-400"
    />
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-400"
    >
      {children}
    </select>
  );
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  value,
  leftLabel,
  rightLabel,
  onLeft,
  onRight,
}: {
  value: "existente" | "nueva";
  leftLabel: string;
  rightLabel: string;
  onLeft: () => void;
  onRight: () => void;
}) {
  return (
    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
      <button
        type="button"
        onClick={onLeft}
        className={`rounded-md px-2.5 py-1 font-semibold ${
          value === "existente" ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"
        }`}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        onClick={onRight}
        className={`rounded-md px-2.5 py-1 font-semibold ${
          value === "nueva" ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"
        }`}
      >
        {rightLabel}
      </button>
    </div>
  );
}

export default function NuevaOfertaFormativaPage() {
  const router = useRouter();

  const [convocatorias, setConvocatorias] = useState<ConvocatoriaRow[]>([]);
  const [entidades, setEntidades] = useState<EntidadRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [modoConvocatoria, setModoConvocatoria] = useState<"existente" | "nueva">(
    "existente"
  );
  const [modoEntidad, setModoEntidad] = useState<"existente" | "nueva">("existente");

  const [convocatoriaExistenteId, setConvocatoriaExistenteId] = useState("");
  const [entidadExistenteId, setEntidadExistenteId] = useState("");

  const [formConvocatoria, setFormConvocatoria] = useState<FormConvocatoria>({
    codigo: "",
    nombre: "",
    organismo: "Servicio Canario de Empleo",
    organismo_otro: "",
    ambito: "autonomico",
    ejercicio: "2026",
    fecha_resolucion: "",
    fecha_inicio: "",
    fecha_fin: "",
    descripcion: "",
    documento_origen: "",
  });

  const [formEntidad, setFormEntidad] = useState<FormEntidad>({
    nombre: "",
    cif: "",
    isla: "",
    provincia: "",
    municipio: "",
    direccion: "",
    tipo_entidad: "academia",
  });

  const [formOferta, setFormOferta] = useState<FormOferta>({
    tipo_oferta: "AF",
    estado_concesion: "concedida",
    codigo_accion: "",
    codigo_especialidad: "",
    denominacion: "",
    familia_profesional: "",
    modalidad: "PRESENCIAL",
    horas: "",
    alumnos_previstos: "",
    importe_concedido: "",
    centro_formacion: "",
    isla: "",
    municipio: "",
    fecha_inicio_prevista: "",
    fecha_fin_prevista: "",
    observaciones: "",
  });

  const convocatoriaSeleccionada = useMemo(() => {
    return convocatorias.find((item) => String(item.id) === convocatoriaExistenteId);
  }, [convocatorias, convocatoriaExistenteId]);

  const entidadSeleccionada = useMemo(() => {
    return entidades.find((item) => String(item.id) === entidadExistenteId);
  }, [entidades, entidadExistenteId]);

  useEffect(() => {
    let activo = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      const [convocatoriasRes, entidadesRes] = await Promise.all([
        supabase
          .from("convocatorias")
          .select("id,codigo,nombre,organismo,ejercicio,estado,fecha_resolucion")
          .order("ejercicio", { ascending: false })
          .order("codigo", { ascending: true }),
        supabase
          .from("entidades_beneficiarias")
          .select("id,nombre,cif,isla,provincia,municipio,direccion,tipo_entidad")
          .order("nombre", { ascending: true }),
      ]);

      if (!activo) return;

      if (convocatoriasRes.error) {
        setError(convocatoriasRes.error.message);
        setLoading(false);
        return;
      }

      if (entidadesRes.error) {
        setError(entidadesRes.error.message);
        setLoading(false);
        return;
      }

      const convocatoriasData = (convocatoriasRes.data ?? []) as ConvocatoriaRow[];
      const entidadesData = (entidadesRes.data ?? []) as EntidadRow[];

      setConvocatorias(convocatoriasData);
      setEntidades(entidadesData);

      if (convocatoriasData.length > 0) {
        setConvocatoriaExistenteId(String(convocatoriasData[0].id));
      } else {
        setModoConvocatoria("nueva");
      }

      if (entidadesData.length > 0) {
        setEntidadExistenteId(String(entidadesData[0].id));
      } else {
        setModoEntidad("nueva");
      }

      setLoading(false);
    }

    loadData();

    return () => {
      activo = false;
    };
  }, []);

  function updateConvocatoria<K extends keyof FormConvocatoria>(
    key: K,
    value: FormConvocatoria[K]
  ) {
    setFormConvocatoria((prev) => ({ ...prev, [key]: value }));
  }

  function updateEntidad<K extends keyof FormEntidad>(key: K, value: FormEntidad[K]) {
    setFormEntidad((prev) => ({ ...prev, [key]: value }));
  }

  function updateOferta<K extends keyof FormOferta>(key: K, value: FormOferta[K]) {
    setFormOferta((prev) => ({ ...prev, [key]: value }));
  }

  function organismoFinal() {
    if (formConvocatoria.organismo === "Otro organismo") {
      return limpiarTexto(formConvocatoria.organismo_otro);
    }

    return limpiarTexto(formConvocatoria.organismo);
  }

  function validarFormulario() {
    if (modoConvocatoria === "existente" && !convocatoriaExistenteId) {
      return "Selecciona una convocatoria existente o cambia a crear convocatoria.";
    }

    if (modoConvocatoria === "nueva") {
      if (!limpiarTexto(formConvocatoria.codigo)) return "Indica el código de la convocatoria.";
      if (!limpiarTexto(formConvocatoria.nombre)) return "Indica el nombre de la convocatoria.";
      if (!organismoFinal()) return "Indica el organismo convocante.";
    }

    if (modoEntidad === "existente" && !entidadExistenteId) {
      return "Selecciona una entidad existente o cambia a crear entidad.";
    }

    if (modoEntidad === "nueva") {
      if (!limpiarTexto(formEntidad.nombre)) return "Indica el nombre de la entidad.";
      if (!normalizarCif(formEntidad.cif)) return "Indica el CIF de la entidad.";
    }

    if (!limpiarTexto(formOferta.codigo_accion)) return "Indica el código de acción.";
    if (!limpiarTexto(formOferta.denominacion)) return "Indica la denominación.";
    if (parseEntero(formOferta.horas, -1) < 0) return "Las horas no pueden ser negativas.";
    if (parseEntero(formOferta.alumnos_previstos, -1) < 0) {
      return "Los alumnos previstos no pueden ser negativos.";
    }
    if (parseImporte(formOferta.importe_concedido, -1) < 0) {
      return "El importe concedido no puede ser negativo.";
    }

    return null;
  }

  async function obtenerOCrearConvocatoria() {
    if (modoConvocatoria === "existente") {
      const id = Number(convocatoriaExistenteId);
      if (!id) throw new Error("Convocatoria no válida.");
      return { id, creada: false };
    }

    const codigo = limpiarTexto(formConvocatoria.codigo);
    const nombre = limpiarTexto(formConvocatoria.nombre);
    const organismo = organismoFinal();

    const existente = await supabase
      .from("convocatorias")
      .select("id")
      .eq("codigo", codigo)
      .maybeSingle();

    if (existente.error) throw new Error(existente.error.message);
    if (existente.data) return { id: Number(existente.data.id), creada: false };

    const trazabilidad = [
      "Alta manual realizada desde Coforma Institucional Demo.",
      formConvocatoria.ambito ? `Ámbito: ${formConvocatoria.ambito}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const insert = await supabase
      .from("convocatorias")
      .insert({
        codigo,
        nombre,
        organismo,
        ejercicio: nullableInt(formConvocatoria.ejercicio),
        fecha_resolucion: nullableDate(formConvocatoria.fecha_resolucion),
        fecha_inicio: nullableDate(formConvocatoria.fecha_inicio),
        fecha_fin: nullableDate(formConvocatoria.fecha_fin),
        descripcion: nullable(formConvocatoria.descripcion),
        documento_origen: nullable(formConvocatoria.documento_origen),
        estado: "vigente",
        fuente_dato: "alta_manual_frontend",
        tipo_dato: "manual",
        nivel_confianza: "validacion_usuario",
        observaciones_trazabilidad: trazabilidad,
      })
      .select("id")
      .single();

    if (insert.error) {
      if (insert.error.code === "23505") {
        const retry = await supabase.from("convocatorias").select("id").eq("codigo", codigo).single();
        if (retry.error) throw new Error(retry.error.message);
        return { id: Number(retry.data.id), creada: false };
      }

      throw new Error(insert.error.message);
    }

    return { id: Number(insert.data.id), creada: true };
  }

  async function obtenerOCrearEntidad() {
    if (modoEntidad === "existente") {
      const id = Number(entidadExistenteId);
      if (!id) throw new Error("Entidad no válida.");
      return { id, creada: false };
    }

    const cif = normalizarCif(formEntidad.cif);
    const nombre = limpiarTexto(formEntidad.nombre);

    const existente = await supabase
      .from("entidades_beneficiarias")
      .select("id")
      .eq("cif", cif)
      .maybeSingle();

    if (existente.error) throw new Error(existente.error.message);
    if (existente.data) return { id: Number(existente.data.id), creada: false };

    const insert = await supabase
      .from("entidades_beneficiarias")
      .insert({
        nombre,
        cif,
        isla: nullable(formEntidad.isla),
        provincia: nullable(formEntidad.provincia),
        municipio: nullable(formEntidad.municipio),
        direccion: nullable(formEntidad.direccion),
        tipo_entidad: nullable(formEntidad.tipo_entidad) ?? "academia",
        activa: true,
        observaciones: "Alta manual realizada desde Coforma Institucional Demo.",
      })
      .select("id")
      .single();

    if (insert.error) {
      if (insert.error.code === "23505") {
        const retry = await supabase.from("entidades_beneficiarias").select("id").eq("cif", cif).single();
        if (retry.error) throw new Error(retry.error.message);
        return { id: Number(retry.data.id), creada: false };
      }

      throw new Error(insert.error.message);
    }

    return { id: Number(insert.data.id), creada: true };
  }

  async function obtenerOCrearConvocatoriaEntidad({
    convocatoriaId,
    entidadId,
    importe,
    alumnos,
  }: {
    convocatoriaId: number;
    entidadId: number;
    importe: number;
    alumnos: number;
  }) {
    const existente = await supabase
      .from("convocatoria_entidades")
      .select("id,importe_concedido,acciones_concedidas,alumnos_previstos")
      .eq("convocatoria_id", convocatoriaId)
      .eq("entidad_id", entidadId)
      .maybeSingle();

    if (existente.error) throw new Error(existente.error.message);

    if (existente.data) {
      return {
        id: Number(existente.data.id),
        creada: false,
        importe_concedido: Number(existente.data.importe_concedido ?? 0),
        acciones_concedidas: Number(existente.data.acciones_concedidas ?? 0),
        alumnos_previstos: Number(existente.data.alumnos_previstos ?? 0),
      };
    }

    const insert = await supabase
      .from("convocatoria_entidades")
      .insert({
        convocatoria_id: convocatoriaId,
        entidad_id: entidadId,
        importe_concedido: importe,
        acciones_concedidas: 1,
        alumnos_previstos: alumnos,
        estado: "concedida",
        fuente_dato: "alta_manual_frontend",
        tipo_dato: "manual",
        nivel_confianza: "validacion_usuario",
        observaciones_trazabilidad:
          "Vínculo convocatoria-entidad creado desde alta manual de oferta formativa.",
      })
      .select("id,importe_concedido,acciones_concedidas,alumnos_previstos")
      .single();

    if (insert.error) {
      if (insert.error.code === "23505") {
        const retry = await supabase
          .from("convocatoria_entidades")
          .select("id,importe_concedido,acciones_concedidas,alumnos_previstos")
          .eq("convocatoria_id", convocatoriaId)
          .eq("entidad_id", entidadId)
          .single();

        if (retry.error) throw new Error(retry.error.message);

        return {
          id: Number(retry.data.id),
          creada: false,
          importe_concedido: Number(retry.data.importe_concedido ?? 0),
          acciones_concedidas: Number(retry.data.acciones_concedidas ?? 0),
          alumnos_previstos: Number(retry.data.alumnos_previstos ?? 0),
        };
      }

      throw new Error(insert.error.message);
    }

    return {
      id: Number(insert.data.id),
      creada: true,
      importe_concedido: Number(insert.data.importe_concedido ?? importe),
      acciones_concedidas: Number(insert.data.acciones_concedidas ?? 1),
      alumnos_previstos: Number(insert.data.alumnos_previstos ?? alumnos),
    };
  }

  async function actualizarTotalesConvocatoriaEntidad({
    convocatoriaEntidadId,
    creadoAhora,
    importeActual,
    accionesActuales,
    alumnosActuales,
    importeNuevaOferta,
    alumnosNuevaOferta,
  }: {
    convocatoriaEntidadId: number;
    creadoAhora: boolean;
    importeActual: number;
    accionesActuales: number;
    alumnosActuales: number;
    importeNuevaOferta: number;
    alumnosNuevaOferta: number;
  }) {
    if (creadoAhora) return;

    const update = await supabase
      .from("convocatoria_entidades")
      .update({
        importe_concedido: importeActual + importeNuevaOferta,
        acciones_concedidas: accionesActuales + 1,
        alumnos_previstos: alumnosActuales + alumnosNuevaOferta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", convocatoriaEntidadId);

    if (update.error) throw new Error(update.error.message);
  }

  async function actualizarTotalesConvocatoria({
    convocatoriaId,
    sumarEntidad,
    importeNuevaOferta,
  }: {
    convocatoriaId: number;
    sumarEntidad: boolean;
    importeNuevaOferta: number;
  }) {
    const actual = await supabase
      .from("convocatorias")
      .select("importe_total_concedido,numero_entidades,numero_acciones")
      .eq("id", convocatoriaId)
      .single();

    if (actual.error) throw new Error(actual.error.message);

    const update = await supabase
      .from("convocatorias")
      .update({
        importe_total_concedido:
          Number(actual.data.importe_total_concedido ?? 0) + importeNuevaOferta,
        numero_entidades:
          Number(actual.data.numero_entidades ?? 0) + (sumarEntidad ? 1 : 0),
        numero_acciones: Number(actual.data.numero_acciones ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", convocatoriaId);

    if (update.error) throw new Error(update.error.message);
  }

  async function guardarAlta() {
    setError(null);
    setOkMsg(null);

    const validacion = validarFormulario();
    if (validacion) {
      setError(validacion);
      return;
    }

    setSaving(true);

    try {
      const horas = parseEntero(formOferta.horas, 0);
      const alumnosPrevistos = parseEntero(formOferta.alumnos_previstos, 0);
      const importeConcedido = parseImporte(formOferta.importe_concedido, 0);

      const convocatoria = await obtenerOCrearConvocatoria();
      const entidad = await obtenerOCrearEntidad();

      const vinculo = await obtenerOCrearConvocatoriaEntidad({
        convocatoriaId: convocatoria.id,
        entidadId: entidad.id,
        importe: importeConcedido,
        alumnos: alumnosPrevistos,
      });

      const insertOferta = await supabase
        .from("oferta_concedida")
        .insert({
          convocatoria_entidad_id: vinculo.id,
          tipo_oferta: formOferta.tipo_oferta,
          estado_concesion: formOferta.estado_concesion,
          codigo_accion: nullable(formOferta.codigo_accion),
          codigo_especialidad: nullable(formOferta.codigo_especialidad),
          denominacion: limpiarTexto(formOferta.denominacion),
          familia_profesional: nullable(formOferta.familia_profesional),
          modalidad: nullable(formOferta.modalidad),
          horas,
          alumnos_previstos: alumnosPrevistos,
          importe_concedido: importeConcedido,
          centro_formacion: nullable(formOferta.centro_formacion),
          isla: nullable(formOferta.isla),
          municipio: nullable(formOferta.municipio),
          fecha_inicio_prevista: nullableDate(formOferta.fecha_inicio_prevista),
          fecha_fin_prevista: nullableDate(formOferta.fecha_fin_prevista),
          observaciones: nullable(formOferta.observaciones),
          fuente_dato: "alta_manual_frontend",
          tipo_dato: "manual",
          nivel_confianza: "validacion_usuario",
          observaciones_trazabilidad:
            "Oferta concedida creada manualmente desde Coforma Institucional Demo.",
        })
        .select("id")
        .single();

      if (insertOferta.error) throw new Error(insertOferta.error.message);

      const ofertaId = Number(insertOferta.data.id);

      const insertSubexpediente = await supabase
        .from("subexpedientes_accion")
        .insert({
          oferta_concedida_id: ofertaId,
          fecha_inicio_prevista: nullableDate(formOferta.fecha_inicio_prevista),
          fecha_fin_prevista: nullableDate(formOferta.fecha_fin_prevista),
          observaciones_administrativas:
            "Subexpediente creado automáticamente desde alta manual de oferta formativa.",
          fuente_dato: "alta_manual_frontend",
          tipo_dato: "subexpediente_administrativo_demo",
          nivel_confianza: "validacion_usuario",
        })
        .select("id")
        .single();

      if (insertSubexpediente.error) throw new Error(insertSubexpediente.error.message);

      await actualizarTotalesConvocatoriaEntidad({
        convocatoriaEntidadId: vinculo.id,
        creadoAhora: vinculo.creada,
        importeActual: vinculo.importe_concedido,
        accionesActuales: vinculo.acciones_concedidas,
        alumnosActuales: vinculo.alumnos_previstos,
        importeNuevaOferta: importeConcedido,
        alumnosNuevaOferta: alumnosPrevistos,
      });

      await actualizarTotalesConvocatoria({
        convocatoriaId: convocatoria.id,
        sumarEntidad: vinculo.creada,
        importeNuevaOferta: importeConcedido,
      });

      const subexpedienteId = Number(insertSubexpediente.data.id);

      setOkMsg(`Alta creada correctamente. Subexpediente ${subexpedienteId}.`);
      router.push(`/subexpedientes-accion/${ofertaId}`);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo guardar el alta manual.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando alta manual...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-3 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-0.5 text-lg font-semibold">
              Alta manual de oferta formativa concedida
            </h1>
            <p className="mt-0.5 text-[11px] text-blue-100">
              Convocatoria · entidad beneficiaria · acción AF/CP · subexpediente.
            </p>
          </div>

          <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-blue-100">
            Alta guiada · demo institucional
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-2 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/oferta-formativa"
            className="text-xs font-semibold text-blue-800 hover:text-blue-950"
          >
            ← Volver a oferta formativa
          </Link>

          <Link
            href="/dashboard"
            className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-sm hover:bg-blue-50"
          >
            Dashboard
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 shadow-sm">
            <strong>No se pudo completar la operación.</strong> {error}
          </div>
        ) : null}

        {okMsg ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 shadow-sm">
            {okMsg}
          </div>
        ) : null}

        <Card
          title="1. Convocatoria / organismo convocante"
          subtitle="Selecciona una convocatoria ya cargada o crea una nueva de otro organismo."
          right={
            <Toggle
              value={modoConvocatoria}
              leftLabel="Usar existente"
              rightLabel="Crear convocatoria"
              onLeft={() => setModoConvocatoria("existente")}
              onRight={() => setModoConvocatoria("nueva")}
            />
          }
        >
          {modoConvocatoria === "existente" ? (
            <div className="grid gap-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <Label>Convocatoria</Label>
                <Select value={convocatoriaExistenteId} onChange={setConvocatoriaExistenteId}>
                  {convocatorias.map((convocatoria) => (
                    <option key={convocatoria.id} value={convocatoria.id}>
                      {convocatoria.codigo} · {convocatoria.organismo} · {convocatoria.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Organismo</Label>
                <Input value={convocatoriaSeleccionada?.organismo ?? ""} readOnly />
              </div>

              <div>
                <Label>Ejercicio / estado</Label>
                <Input
                  value={`${convocatoriaSeleccionada?.ejercicio ?? ""} · ${
                    convocatoriaSeleccionada?.estado ?? ""
                  }`}
                  readOnly
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
              <div>
                <Label>Organismo</Label>
                <Select
                  value={formConvocatoria.organismo}
                  onChange={(value) => updateConvocatoria("organismo", value)}
                >
                  {ORGANISMOS.map((organismo) => (
                    <option key={organismo} value={organismo}>
                      {organismo}
                    </option>
                  ))}
                </Select>
              </div>

              {formConvocatoria.organismo === "Otro organismo" ? (
                <div>
                  <Label>Indicar organismo</Label>
                  <Input
                    value={formConvocatoria.organismo_otro}
                    onChange={(value) => updateConvocatoria("organismo_otro", value)}
                    placeholder="Nombre organismo"
                  />
                </div>
              ) : null}

              <div>
                <Label>Ámbito</Label>
                <Select
                  value={formConvocatoria.ambito}
                  onChange={(value) => updateConvocatoria("ambito", value)}
                >
                  <option value="estatal">Estatal</option>
                  <option value="autonomico">Autonómico</option>
                  <option value="insular">Insular</option>
                  <option value="municipal">Municipal</option>
                  <option value="otro">Otro</option>
                </Select>
              </div>

              <div>
                <Label>Ejercicio</Label>
                <Select
                  value={formConvocatoria.ejercicio}
                  onChange={(value) => updateConvocatoria("ejercicio", value)}
                >
                  {EJERCICIOS.map((ejercicio) => (
                    <option key={ejercicio} value={ejercicio}>
                      {ejercicio}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Código convocatoria</Label>
                <Input
                  value={formConvocatoria.codigo}
                  onChange={(value) => updateConvocatoria("codigo", value)}
                  placeholder="Código oficial"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Nombre convocatoria</Label>
                <Input
                  value={formConvocatoria.nombre}
                  onChange={(value) => updateConvocatoria("nombre", value)}
                  placeholder="Nombre oficial"
                />
              </div>

              <div>
                <Label>Fecha resolución</Label>
                <Input
                  type="date"
                  value={formConvocatoria.fecha_resolucion}
                  onChange={(value) => updateConvocatoria("fecha_resolucion", value)}
                />
              </div>

              <div>
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={formConvocatoria.fecha_inicio}
                  onChange={(value) => updateConvocatoria("fecha_inicio", value)}
                />
              </div>

              <div>
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={formConvocatoria.fecha_fin}
                  onChange={(value) => updateConvocatoria("fecha_fin", value)}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <Label>Documento origen / referencia</Label>
                <Input
                  value={formConvocatoria.documento_origen}
                  onChange={(value) => updateConvocatoria("documento_origen", value)}
                  placeholder="Resolución, anexo, expediente..."
                />
              </div>

              <div className="md:col-span-2 lg:col-span-6">
                <Label>Descripción</Label>
                <TextArea
                  rows={2}
                  value={formConvocatoria.descripcion}
                  onChange={(value) => updateConvocatoria("descripcion", value)}
                  placeholder="Descripción breve de la convocatoria."
                />
              </div>
            </div>
          )}
        </Card>

        <Card
          title="2. Entidad beneficiaria / receptora"
          subtitle="Por defecto se reutiliza una entidad existente. El CIF evita duplicidades."
          right={
            <Toggle
              value={modoEntidad}
              leftLabel="Usar existente"
              rightLabel="Crear entidad"
              onLeft={() => setModoEntidad("existente")}
              onRight={() => setModoEntidad("nueva")}
            />
          }
        >
          {modoEntidad === "existente" ? (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
              <div className="md:col-span-2">
                <Label>Entidad beneficiaria</Label>
                <Select value={entidadExistenteId} onChange={setEntidadExistenteId}>
                  {entidades.map((entidad) => (
                    <option key={entidad.id} value={entidad.id}>
                      {entidad.nombre} · {entidad.cif}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>CIF</Label>
                <Input value={entidadSeleccionada?.cif ?? ""} readOnly />
              </div>

              <div>
                <Label>Tipo entidad</Label>
                <Input value={entidadSeleccionada?.tipo_entidad ?? ""} readOnly />
              </div>

              <div>
                <Label>Isla</Label>
                <Input value={entidadSeleccionada?.isla ?? ""} readOnly />
              </div>

              <div>
                <Label>Municipio</Label>
                <Input value={entidadSeleccionada?.municipio ?? ""} readOnly />
              </div>

              <div>
                <Label>Provincia</Label>
                <Input value={entidadSeleccionada?.provincia ?? ""} readOnly />
              </div>

              <div className="md:col-span-2 lg:col-span-5">
                <Label>Dirección</Label>
                <Input value={entidadSeleccionada?.direccion ?? ""} readOnly />
              </div>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
              <div className="md:col-span-2">
                <Label>Nombre entidad</Label>
                <Input
                  value={formEntidad.nombre}
                  onChange={(value) => updateEntidad("nombre", value)}
                  placeholder="Nombre oficial"
                />
              </div>

              <div>
                <Label>CIF</Label>
                <Input
                  value={formEntidad.cif}
                  onChange={(value) => updateEntidad("cif", value.toUpperCase())}
                  placeholder="B00000000"
                />
              </div>

              <div>
                <Label>Tipo entidad</Label>
                <Select
                  value={formEntidad.tipo_entidad}
                  onChange={(value) => updateEntidad("tipo_entidad", value)}
                >
                  <option value="academia">Academia</option>
                  <option value="entidad_formacion">Entidad formación</option>
                  <option value="asociacion">Asociación</option>
                  <option value="fundacion">Fundación</option>
                  <option value="administracion">Administración</option>
                  <option value="otra">Otra</option>
                </Select>
              </div>

              <div>
                <Label>Isla</Label>
                <Input value={formEntidad.isla} onChange={(value) => updateEntidad("isla", value)} />
              </div>

              <div>
                <Label>Municipio</Label>
                <Input
                  value={formEntidad.municipio}
                  onChange={(value) => updateEntidad("municipio", value)}
                />
              </div>

              <div>
                <Label>Provincia</Label>
                <Input
                  value={formEntidad.provincia}
                  onChange={(value) => updateEntidad("provincia", value)}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-5">
                <Label>Dirección</Label>
                <Input
                  value={formEntidad.direccion}
                  onChange={(value) => updateEntidad("direccion", value)}
                />
              </div>
            </div>
          )}
        </Card>

        <Card
          title="3. Acción concedida AF/CP"
          subtitle="La acción crea también su subexpediente administrativo inicial."
        >
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
            <div>
              <Label>Tipo</Label>
              <Select
                value={formOferta.tipo_oferta}
                onChange={(value) => updateOferta("tipo_oferta", value as "AF" | "CP")}
              >
                <option value="AF">AF</option>
                <option value="CP">CP</option>
              </Select>
            </div>

            <div>
              <Label>Estado concesión</Label>
              <Select
                value={formOferta.estado_concesion}
                onChange={(value) =>
                  updateOferta("estado_concesion", value as FormOferta["estado_concesion"])
                }
              >
                <option value="concedida">Concedida</option>
                <option value="renunciada">Renunciada</option>
                <option value="modificada">Modificada</option>
                <option value="anulada">Anulada</option>
              </Select>
            </div>

            <div>
              <Label>Código acción</Label>
              <Input
                value={formOferta.codigo_accion}
                onChange={(value) => updateOferta("codigo_accion", value)}
                placeholder="25-38/000001"
              />
            </div>

            <div>
              <Label>Especialidad</Label>
              <Input
                value={formOferta.codigo_especialidad}
                onChange={(value) => updateOferta("codigo_especialidad", value)}
                placeholder="SSCE0110"
              />
            </div>

            <div>
              <Label>Modalidad</Label>
              <Select
                value={formOferta.modalidad}
                onChange={(value) => updateOferta("modalidad", value)}
              >
                <option value="PRESENCIAL">Presencial</option>
                <option value="TELEFORMACION">Teleformación</option>
                <option value="MIXTA">Mixta</option>
                <option value="AULA_VIRTUAL">Aula virtual</option>
              </Select>
            </div>

            <div>
              <Label>Familia profesional</Label>
              <Input
                value={formOferta.familia_profesional}
                onChange={(value) => updateOferta("familia_profesional", value)}
                placeholder="Familia"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-6">
              <Label>Denominación</Label>
              <Input
                value={formOferta.denominacion}
                onChange={(value) => updateOferta("denominacion", value)}
                placeholder="Denominación oficial de la acción"
              />
            </div>

            <div>
              <Label>Horas</Label>
              <Input
                value={formOferta.horas}
                onChange={(value) => updateOferta("horas", value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Alumnos previstos</Label>
              <Input
                value={formOferta.alumnos_previstos}
                onChange={(value) => updateOferta("alumnos_previstos", value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Importe concedido</Label>
              <Input
                value={formOferta.importe_concedido}
                onChange={(value) => updateOferta("importe_concedido", value)}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label>Centro formación</Label>
              <Input
                value={formOferta.centro_formacion}
                onChange={(value) => updateOferta("centro_formacion", value)}
              />
            </div>

            <div>
              <Label>Isla acción</Label>
              <Input value={formOferta.isla} onChange={(value) => updateOferta("isla", value)} />
            </div>

            <div>
              <Label>Municipio acción</Label>
              <Input
                value={formOferta.municipio}
                onChange={(value) => updateOferta("municipio", value)}
              />
            </div>

            <div>
              <Label>Inicio previsto</Label>
              <Input
                type="date"
                value={formOferta.fecha_inicio_prevista}
                onChange={(value) => updateOferta("fecha_inicio_prevista", value)}
              />
            </div>

            <div>
              <Label>Fin previsto</Label>
              <Input
                type="date"
                value={formOferta.fecha_fin_prevista}
                onChange={(value) => updateOferta("fecha_fin_prevista", value)}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-4">
              <Label>Observaciones</Label>
              <TextArea
                rows={2}
                value={formOferta.observaciones}
                onChange={(value) => updateOferta("observaciones", value)}
                placeholder="Observaciones administrativas o trazabilidad de la carga manual."
              />
            </div>
          </div>
        </Card>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-[11px] leading-5 text-slate-500">
              Guardará convocatoria, entidad, vínculo, oferta concedida y subexpediente.
              Reutiliza registros existentes cuando coinciden código, CIF o vínculo.
            </p>

            <div className="flex flex-wrap justify-end gap-2">
              <Link
                href="/oferta-formativa"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Cancelar
              </Link>

              <button
                type="button"
                onClick={guardarAlta}
                disabled={saving}
                className="rounded-lg border border-blue-700 bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar alta manual"}
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}