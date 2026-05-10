"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

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

  motivo_creacion: string;
};

function emptyForm(): FormAviso {
  return {
    titulo: "",
    tipo_aviso: "aviso_institucional_extraordinario",
    prioridad: "normal",
    estado: "borrador",
    ambito: "institucional",
    origen_funcional: "manual_frontend",

    entidad_id: "",
    oferta_id: "",
    actuacion_id: "",
    conexion_id: "",

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

    motivo_creacion: "",
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

export default function NuevoAvisoInstitucionalPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormAviso>(emptyForm());
  const [conexiones, setConexiones] = useState<ConexionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  useEffect(() => {
    async function cargarConexiones() {
      setLoading(true);

      const { data, error } = await supabase
        .from("conexiones_institucionales")
        .select("id,nombre,codigo,organismo")
        .order("nombre", { ascending: true });

      if (error) {
        setResultado(`No se pudieron cargar las conexiones: ${error.message}`);
        setLoading(false);
        return;
      }

      setConexiones((data ?? []) as ConexionLite[]);
      setLoading(false);
    }

    cargarConexiones();
  }, []);

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

      fuente_origen: "alta_manual_institucional",
      tipo_dato: "registro_manual_institucional",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async function crearAviso() {
    if (!form.titulo.trim() || !form.asunto.trim() || !form.mensaje.trim()) {
      setResultado("Título, asunto y mensaje son obligatorios.");
      return;
    }

    setGuardando(true);
    setResultado(null);

    const { data, error: insertError } = await supabase
      .from("avisos_institucionales")
      .insert(payloadFromForm())
      .select("id")
      .single();

    if (insertError) {
      setResultado(`No se pudo crear el aviso: ${insertError.message}`);
      setGuardando(false);
      return;
    }

    const editadoPor = await editadoPorActual();

    const { error: historialError } = await supabase
      .from("avisos_institucionales_historial")
      .insert({
        aviso_id: data.id,
        campo: "creacion",
        valor_anterior: null,
        valor_nuevo: form.titulo.trim(),
        motivo_edicion:
          form.motivo_creacion.trim() ||
          "Creación de aviso institucional extraordinario desde pantalla completa.",
        editado_por: editadoPor,
      });

    if (historialError) {
      setResultado(
        `El aviso se creó, pero no se pudo registrar historial: ${historialError.message}`
      );
      setGuardando(false);
      return;
    }

    router.push(`/avisos-institucionales/${data.id}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando formulario de aviso institucional...</p>
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
            <h1 className="mt-1 text-xl font-semibold">Nuevo aviso institucional</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Creación en pantalla completa de comunicación extraordinaria no ordinaria.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            Expediente desde origen · backend trazable
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/avisos-institucionales"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              ← Volver a avisos
            </Link>
            <Link
              href="/conexiones"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Conexiones
            </Link>
            <Link
              href="/comunicaciones-canal"
              className="text-xs font-semibold text-blue-800 hover:text-blue-950"
            >
              Comunicaciones / canal
            </Link>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            No envía automáticamente · prepara expediente
          </span>
        </div>

        <section className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-950 shadow-sm">
          <p className="font-semibold">Lectura institucional</p>
          <p className="mt-0.5">
            Esta pantalla crea el aviso como expediente desde el primer momento. La emisión documental, firma,
            envío y acuse se gestionan después desde el expediente completo.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  Título
                </label>
                <input
                  value={form.titulo}
                  onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
                  placeholder="Ej.: Comunicación extraordinaria por plazo de subsanación agotado"
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
                    placeholder="opcional"
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
                    placeholder="opcional"
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
                    placeholder="opcional"
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

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  Asunto
                </label>
                <input
                  value={form.asunto}
                  onChange={(event) => setForm((prev) => ({ ...prev, asunto: event.target.value }))}
                  placeholder="Asunto oficial o interno del aviso"
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
                  rows={8}
                  placeholder="Texto base del aviso o comunicación extraordinaria..."
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
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, destinatario_nombre: event.target.value }))
                    }
                    placeholder="Ej.: Dirección, entidad, mesa fiscalización..."
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Tipo destinatario
                  </label>
                  <input
                    value={form.destinatario_tipo}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, destinatario_tipo: event.target.value }))
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
                  value={form.observaciones}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, observaciones: event.target.value }))
                  }
                  rows={4}
                  placeholder="Observaciones internas. No sustituye el historial."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                <label className="text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                  Motivo de creación
                </label>
                <input
                  value={form.motivo_creacion}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, motivo_creacion: event.target.value }))
                  }
                  placeholder="Ej.: comunicación extraordinaria por plazo ordinario agotado."
                  className="mt-1 h-9 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </section>

        {resultado ? (
          <div
            className={
              resultado.includes("creó") || resultado.includes("creado")
                ? "rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"
                : "rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
            }
          >
            {resultado}
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/avisos-institucionales"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="button"
              onClick={crearAviso}
              disabled={guardando}
              className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
            >
              {guardando ? "Creando..." : "Crear aviso y abrir expediente"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}