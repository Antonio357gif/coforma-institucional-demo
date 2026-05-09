"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type Oferta = {
  oferta_id: number;
  convocatoria_codigo: string | null;
  entidad_id: number | null;
  entidad_nombre: string | null;
  cif: string | null;
  codigo_accion: string | null;
  tipo_oferta: string | null;
  codigo_especialidad: string | null;
  denominacion: string | null;
  estado_ejecucion: string | null;
  estado_operativo_label: string | null;
  importe_concedido: number | null;
  importe_ejecutado: number | null;
  importe_en_riesgo: number | null;
};

type Tipologia = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  nivel_base: string | null;
  lectura_institucional: string | null;
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

function normalize(value: string | number | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function nivelClass(value: string | null | undefined) {
  const nivel = normalize(value);

  if (nivel === "alto" || nivel === "alta") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (nivel === "medio" || nivel === "media") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (nivel === "bajo" || nivel === "baja") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

async function cargarOfertasPaginadas() {
  const pageSize = 1000;
  const todas: Oferta[] = [];

  for (let inicio = 0; inicio < 5000; inicio += pageSize) {
    const fin = inicio + pageSize - 1;

    const { data, error } = await supabase
      .from("v_oferta_formativa_institucional")
      .select(
        "oferta_id, convocatoria_codigo, entidad_id, entidad_nombre, cif, codigo_accion, tipo_oferta, codigo_especialidad, denominacion, estado_ejecucion, estado_operativo_label, importe_concedido, importe_ejecutado, importe_en_riesgo"
      )
      .order("entidad_nombre", { ascending: true })
      .range(inicio, fin);

    if (error) throw error;

    const bloque = (data ?? []) as Oferta[];
    todas.push(...bloque);

    if (bloque.length < pageSize) break;
  }

  return todas;
}

export default function NuevaAlertaPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [tipologias, setTipologias] = useState<Tipologia[]>([]);

  const [busquedaOferta, setBusquedaOferta] = useState("");
  const [ofertaId, setOfertaId] = useState("");
  const [tipologiaId, setTipologiaId] = useState("");
  const [nivelAplicado, setNivelAplicado] = useState("medio");
  const [descripcionCaso, setDescripcionCaso] = useState("");
  const [evidenciaRequerida, setEvidenciaRequerida] = useState("");
  const [estadoRevision, setEstadoRevision] = useState("pendiente_revision");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [ofertasData, tipologiasRes] = await Promise.all([
          cargarOfertasPaginadas(),
          supabase
            .from("cat_tipologias_alerta_institucional")
            .select("id, codigo, nombre, descripcion, nivel_base, lectura_institucional")
            .order("nombre", { ascending: true }),
        ]);

        if (tipologiasRes.error) {
          throw tipologiasRes.error;
        }

        const ofertasUnicas = Array.from(
  new Map(
    ofertasData.map((oferta) => [String(oferta.oferta_id), oferta])
  ).values()
);

setOfertas(ofertasUnicas);
        setTipologias((tipologiasRes.data ?? []) as Tipologia[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el formulario.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const ofertasFiltradas = useMemo(() => {
    const term = busquedaOferta.trim().toLowerCase();

    if (!term) return ofertas;

    return ofertas.filter((oferta) => {
      const texto = [
        oferta.entidad_nombre,
        oferta.cif,
        oferta.codigo_accion,
        oferta.tipo_oferta,
        oferta.codigo_especialidad,
        oferta.denominacion,
        oferta.estado_ejecucion,
        oferta.estado_operativo_label,
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(term);
    });
  }, [ofertas, busquedaOferta]);

  const ofertaSeleccionada = useMemo(() => {
    if (!ofertaId) return null;
    return ofertas.find((oferta) => Number(oferta.oferta_id) === Number(ofertaId)) ?? null;
  }, [ofertaId, ofertas]);

  const tipologiaSeleccionada = useMemo(() => {
    if (!tipologiaId) return null;
    return tipologias.find((tipologia) => Number(tipologia.id) === Number(tipologiaId)) ?? null;
  }, [tipologiaId, tipologias]);

  function cambiarTipologia(value: string) {
    setTipologiaId(value);

    const tipologia = tipologias.find((item) => Number(item.id) === Number(value));

    if (!tipologia) return;

    const nivelBase = normalize(tipologia.nivel_base);
    if (["alto", "medio", "bajo"].includes(nivelBase)) {
      setNivelAplicado(nivelBase);
    }

    if (!evidenciaRequerida.trim() && tipologia.lectura_institucional) {
      setEvidenciaRequerida(tipologia.lectura_institucional);
    }
  }

  async function guardarAlerta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setOk(null);

    if (!ofertaId) {
      setError("Seleccione una acción/subexpediente.");
      return;
    }

    if (!tipologiaId) {
      setError("Seleccione una tipología de alerta/revisión.");
      return;
    }

    if (!descripcionCaso.trim()) {
      setError("Describa el caso registrado.");
      return;
    }

    if (!evidenciaRequerida.trim()) {
      setError("Indique la evidencia requerida o asociada.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase.from("alertas_tipologias_accion").insert({
      oferta_id: Number(ofertaId),
      tipologia_id: Number(tipologiaId),
      nivel_aplicado: nivelAplicado,
      descripcion_caso: descripcionCaso.trim(),
      evidencia_requerida: evidenciaRequerida.trim(),
      estado_revision: estadoRevision,
      fuente_dato: "registro_manual_institucional",
      tipo_dato: "manual",
    });

    setSaving(false);

    if (insertError) {
      if (insertError.message.toLowerCase().includes("duplicate")) {
        setError(
          "Ya existe una alerta con esa tipología para esta acción/subexpediente. Revise la alerta existente antes de crear otra."
        );
        return;
      }

      setError(insertError.message);
      return;
    }

    setOk("Alerta/revisión registrada correctamente. Ya puede consultarse en la bandeja de alertas.");
    setDescripcionCaso("");
    setEvidenciaRequerida("");
    setTipologiaId("");
    setNivelAplicado("medio");
    setEstadoRevision("pendiente_revision");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando formulario de alerta institucional...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-5 py-3 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-xl font-semibold leading-tight">
              Registrar alerta / revisión
            </h1>
            <p className="mt-0.5 truncate text-xs text-blue-100">
              Alta manual vinculada a una acción o subexpediente con tipología institucional.
            </p>
          </div>

          <div className="hidden rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100 sm:block">
            Alta manual · {num(tipologias.length)} tipologías
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/alertas"
            className="text-xs font-semibold text-blue-800 hover:text-blue-950"
          >
            ← Volver a alertas
          </Link>

          <Link
            href="/dashboard"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </div>

        {error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 shadow-sm">
            {error}
          </section>
        ) : null}

        {ok ? (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 shadow-sm">
            {ok}
          </section>
        ) : null}

        <form onSubmit={guardarAlerta} className="grid gap-3 xl:grid-cols-[1fr_350px]">
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Datos de la alerta/revisión
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Registro real en backend sobre la acción seleccionada.
                </p>
              </div>

              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-800">
                Manual institucional
              </span>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-3 lg:grid-cols-[0.45fr_0.55fr]">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Buscar acción / entidad / CIF
                  </label>
                  <input
                    value={busquedaOferta}
                    onChange={(event) => setBusquedaOferta(event.target.value)}
                    placeholder="Entidad, CIF, acción, especialidad..."
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Acción / subexpediente
                  </label>
                  <select
                    value={ofertaId}
                    onChange={(event) => setOfertaId(event.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
                  >
                    <option value="">Seleccione una acción...</option>
                    {ofertasFiltradas.map((oferta) => (
                      <option key={oferta.oferta_id} value={oferta.oferta_id}>
                        {oferta.entidad_nombre} · {oferta.codigo_accion} · {oferta.tipo_oferta} ·{" "}
                        {oferta.codigo_especialidad} · {oferta.denominacion}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Mostrando {num(ofertasFiltradas.length)} de {num(ofertas.length)} acciones cargadas.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Tipología
                  </label>
                  <select
                    value={tipologiaId}
                    onChange={(event) => cambiarTipologia(event.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
                  >
                    <option value="">Seleccione tipología...</option>
                    {tipologias.map((tipologia) => (
                      <option key={tipologia.id} value={tipologia.id}>
                        {tipologia.nombre} · {tipologia.codigo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Prioridad aplicada
                  </label>
                  <select
                    value={nivelAplicado}
                    onChange={(event) => setNivelAplicado(event.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
                  >
                    <option value="alto">Alto</option>
                    <option value="medio">Medio</option>
                    <option value="bajo">Bajo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Estado inicial
                  </label>
                  <select
                    value={estadoRevision}
                    onChange={(event) => setEstadoRevision(event.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
                  >
                    <option value="pendiente_revision">Pendiente revisión</option>
                    <option value="pendiente_subsanacion">Pendiente subsanación</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Caso registrado
                  </label>
                  <textarea
                    value={descripcionCaso}
                    onChange={(event) => setDescripcionCaso(event.target.value)}
                    rows={4}
                    placeholder="Hecho observado, incidencia, revisión o posible alerta..."
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Evidencia requerida o asociada
                  </label>
                  <textarea
                    value={evidenciaRequerida}
                    onChange={(event) => setEvidenciaRequerida(event.target.value)}
                    rows={4}
                    placeholder="Documentación, contraste, evidencia o actuación necesaria..."
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <Link
                  href="/alertas"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Registrar alerta / revisión"}
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-3">
            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-950">
                Acción seleccionada
              </h2>

              {ofertaSeleccionada ? (
                <div className="mt-2 space-y-2 text-xs text-slate-600">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Entidad
                    </p>
                    <p className="font-semibold text-slate-950">{ofertaSeleccionada.entidad_nombre}</p>
                    <p>{ofertaSeleccionada.cif}</p>
                  </div>

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Acción
                    </p>
                    <p className="font-semibold text-slate-950">
                      {ofertaSeleccionada.codigo_accion} · {ofertaSeleccionada.tipo_oferta}
                    </p>
                    <p className="line-clamp-2">
                      {ofertaSeleccionada.codigo_especialidad} · {ofertaSeleccionada.denominacion}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                      <p className="text-[9px] font-semibold uppercase text-slate-500">
                        Concedido
                      </p>
                      <p className="font-bold text-slate-950">
                        {euro(ofertaSeleccionada.importe_concedido)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                      <p className="text-[9px] font-semibold uppercase text-slate-500">
                        En riesgo
                      </p>
                      <p className="font-bold text-slate-950">
                        {euro(ofertaSeleccionada.importe_en_riesgo)}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/subexpedientes-accion/${ofertaSeleccionada.oferta_id}`}
                    className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-100"
                  >
                    Abrir subexpediente
                  </Link>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Seleccione una acción para ver el resumen del subexpediente.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-950">
                Tipología seleccionada
              </h2>

              {tipologiaSeleccionada ? (
                <div className="mt-2 space-y-2 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-950">
                      {tipologiaSeleccionada.nombre}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${nivelClass(
                        tipologiaSeleccionada.nivel_base
                      )}`}
                    >
                      {tipologiaSeleccionada.nivel_base ?? "sin nivel"}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500">{tipologiaSeleccionada.codigo}</p>

                  {tipologiaSeleccionada.descripcion ? (
                    <p>{tipologiaSeleccionada.descripcion}</p>
                  ) : null}

                  {tipologiaSeleccionada.lectura_institucional ? (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-950">
                      {tipologiaSeleccionada.lectura_institucional}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Seleccione una tipología para ver su lectura institucional.
                </p>
              )}
            </section>
          </aside>
        </form>
      </section>
    </main>
  );
}