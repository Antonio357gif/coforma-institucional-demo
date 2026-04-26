"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

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

function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
    </div>
  );
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

export default function AccionesPage() {
  const router = useRouter();

  const [actuaciones, setActuaciones] = useState<Actuacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [prioridadFiltro, setPrioridadFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const ofertaIdParam = searchParams.get("ofertaId");
  const ofertaIdInicial = ofertaIdParam ? Number(ofertaIdParam) : null;

  const [seleccionada, setSeleccionada] = useState<Actuacion | null>(null);
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [evidencia, setEvidencia] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccionesAdministrativas() {
      setLoading(true);
      setError(null);

      const [alertasRes, ofertaRes] = await Promise.all([
        supabase.from("v_alertas_institucionales_tipificadas").select("*"),
        supabase.from("v_oferta_formativa_institucional").select("*"),
      ]);

      const firstError = alertasRes.error || ofertaRes.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
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
          destino: `/oferta-formativa/${ofertaId}`,
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
            evidenciaRequerida = "Revisar documentación de ejecución, asistencia, seguimiento y comunicación de incidencias.";
          }

          if (estado === "riesgo_reintegro" || riesgo > 0) {
            tipo = "Revisar posible reintegro";
            prioridad = "alta";
            motivo = "Acción con importe en riesgo o señal de posible reintegro.";
            evidenciaRequerida = "Revisar causa del riesgo, alumnado activo, bajas, documentación justificativa y resolución administrativa.";
          }

          if (estado === "finalizada_pendiente_justificacion" || requerimientos > 0) {
            tipo = "Validar cierre / justificación";
            prioridad = prioridad === "alta" ? "alta" : "normal";
            motivo = "Acción finalizada o con requerimiento pendiente de justificación.";
            evidenciaRequerida = "Revisar memoria, asistencia, evaluación, documentación final y justificación económica.";
          }

          if (estado === "pendiente_ejecutar") {
            tipo = "Control de inicio";
            prioridad = "normal";
            motivo = "Acción pendiente de ejecución o inicio administrativo.";
            evidenciaRequerida = "Comprobar comunicación de inicio, planificación, disponibilidad de alumnado, aula/docente y calendario.";
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
            destino: ofertaId ? `/oferta-formativa/${ofertaId}` : "/oferta-formativa",
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

      setActuaciones(unicas);
      setLoading(false);
    }

    loadAccionesAdministrativas();
  }, []);

  const tipos = useMemo(() => {
    return Array.from(new Set(actuaciones.map((item) => item.tipo))).sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, [actuaciones]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return actuaciones.filter((item) => {
      const pasaOfertaInicial =
        !ofertaIdInicial || item.ofertaId === ofertaIdInicial;
      const texto = [
        item.tipo,
        item.entidad,
        item.cif,
        item.codigoAccion,
        item.especialidad,
        item.denominacion,
        item.motivo,
        item.evidencia,
        item.origen,
        item.estado,
      ]
        .join(" ")
        .toLowerCase();

      const pasaBusqueda = term === "" || texto.includes(term);
      const pasaTipo = tipoFiltro === "todos" || item.tipo === tipoFiltro;
      const pasaPrioridad = prioridadFiltro === "todos" || item.prioridad === prioridadFiltro;

      return pasaOfertaInicial && pasaBusqueda && pasaTipo && pasaPrioridad;
    });
  }, [actuaciones, busqueda, tipoFiltro, prioridadFiltro, ofertaIdInicial]);

  const resumen = useMemo(() => {
    return filtradas.reduce(
      (acc, item) => {
        acc.riesgo += item.importeRiesgo;
        if (item.prioridad === "alta") acc.alta++;
        if (item.prioridad === "media") acc.media++;
        if (item.tipo === "Requerir documentación") acc.requerir++;
        if (item.tipo === "Abrir revisión prioritaria") acc.revision++;
        if (item.tipo === "Revisar asistencia / alumnado") acc.asistencia++;
        if (item.tipo === "Revisar posible reintegro") acc.reintegro++;
        if (item.tipo === "Validar cierre / justificación") acc.cierre++;
        return acc;
      },
      {
        riesgo: 0,
        alta: 0,
        media: 0,
        requerir: 0,
        revision: 0,
        asistencia: 0,
        reintegro: 0,
        cierre: 0,
      }
    );
  }, [filtradas]);

  function abrirEmision(item: Actuacion) {
    setSeleccionada(item);
    setAsunto(buildDefaultSubject(item));
    setMensaje(buildDefaultMessage(item));
    setEvidencia(item.evidencia);
    setFechaLimite("");
    setResultado(null);
  }

  async function emitirActuacion() {
    if (!seleccionada || !seleccionada.ofertaId || !seleccionada.entidadId) {
      setResultado("No se puede emitir la actuación: falta oferta o entidad vinculada.");
      return;
    }

    setGuardando(true);
    setResultado(null);

    const { error: insertError } = await supabase.from("actuaciones_administrativas").insert({
      oferta_id: seleccionada.ofertaId,
      entidad_id: seleccionada.entidadId,
      tipo_actuacion: seleccionada.tipo,
      prioridad: seleccionada.prioridad,
      asunto,
      mensaje,
      evidencia_requerida: evidencia,
      estado: "emitida",
      fecha_emision: new Date().toISOString(),
      fecha_limite_respuesta: fechaLimite || null,
      fuente_origen: seleccionada.origen,
      tipo_dato: "simulacion_controlada_demo_institucional",
    });

    setGuardando(false);

    if (insertError) {
      setResultado(`Error al emitir actuación: ${insertError.message}`);
      return;
    }

    setResultado("Actuación administrativa emitida y registrada correctamente.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Cargando acciones administrativas...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#edf3f8] p-4 text-slate-950">
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Error cargando acciones administrativas
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
            <h1 className="mt-1 text-xl font-semibold">Acciones administrativas pendientes</h1>
            <p className="mt-0.5 text-xs text-blue-100">
              Requerir documentación · revisar riesgo · subsanar · validar cierre · abrir revisión.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-blue-100">
            {num(filtradas.length)} acciones visibles · {num(actuaciones.length)} totales
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            ← Volver al dashboard
          </Link>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            Selecciona una actuación para emitir requerimiento o abrir subexpediente
          </span>
        </div>

        <section className="grid gap-2 lg:grid-cols-6">
          <Kpi label="Actuaciones" value={num(filtradas.length)} detail="pendientes visibles" />
          <Kpi label="Prioridad alta" value={num(resumen.alta)} detail="revisión inmediata" />
          <Kpi label="Prioridad media" value={num(resumen.media)} detail="seguimiento técnico" />
          <Kpi label="Reintegro" value={num(resumen.reintegro)} detail="posible riesgo económico" />
          <Kpi label="Asistencia/alumnado" value={num(resumen.asistencia)} detail="revisión formativa" />
          <Kpi label="Riesgo total" value={euro(resumen.riesgo)} detail="importe afectado" />
        </section>

        {ofertaIdInicial ? (
          <section className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-950 shadow-sm">
            <p className="font-semibold">Filtro activo por subexpediente</p>
            <p className="mt-0.5">
              Mostrando solo actuaciones vinculadas a la oferta seleccionada desde la mesa de decisiones.
            </p>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.2fr_0.9fr_0.65fr_auto]">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Entidad, CIF, acción, motivo, evidencia, actuación..."
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Tipo de actuación
              </label>
              <select
                value={tipoFiltro}
                onChange={(event) => setTipoFiltro(event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todas</option>
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Prioridad
              </label>
              <select
                value={prioridadFiltro}
                onChange={(event) => setPrioridadFiltro(event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="todos">Todas</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setTipoFiltro("todos");
                  setPrioridadFiltro("todos");
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
            <h2 className="text-sm font-semibold">Bandeja de actuación administrativa</h2>
            <p className="text-[11px] text-slate-500">
              Actuaciones derivadas de decisiones, alertas tipificadas y estados de oferta formativa institucional.
            </p>
          </div>

          <div className="max-h-[610px] overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Prioridad</th>
                  <th className="px-2 py-2">Actuación</th>
                  <th className="px-2 py-2">Entidad / acción</th>
                  <th className="px-2 py-2">Motivo</th>
                  <th className="px-2 py-2">Evidencia requerida</th>
                  <th className="px-2 py-2 text-right">Riesgo</th>
                  <th className="px-2 py-2">Acción</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-blue-50">
                    <td className="px-2 py-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityClass(item.prioridad)}`}>
                        {item.prioridad}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{item.tipo}</p>
                      <p className="text-[10px] text-slate-500">{item.origen}</p>
                    </td>
                    <td className="px-2 py-1.5">
                      <p className="font-semibold text-slate-950">{item.entidad}</p>
                      <p className="text-[10px] text-slate-500">{item.cif}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {item.codigoAccion} · {item.especialidad}
                      </p>
                    </td>
                    <td className="max-w-[250px] px-2 py-1.5">
                      <p className="line-clamp-3">{item.motivo}</p>
                    </td>
                    <td className="max-w-[260px] px-2 py-1.5">
                      <p className="line-clamp-3">{item.evidencia}</p>
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold text-red-700">
                      {euro(item.importeRiesgo)}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEmision(item)}
                          className="rounded-lg bg-[#183B63] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#122f4f]"
                        >
                          Emitir
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(item.destino)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Ver expediente
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-xs text-slate-500">
                      No hay actuaciones que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {seleccionada ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Emisión de actuación administrativa
              </p>
              <h2 className="mt-1 text-lg font-semibold">{seleccionada.tipo}</h2>
              <p className="mt-0.5 text-xs text-blue-100">
                {seleccionada.entidad} · {seleccionada.codigoAccion} · {seleccionada.especialidad}
              </p>
            </div>

            <div className="space-y-3 p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Prioridad</p>
                  <p className="mt-1 text-sm font-semibold">{seleccionada.prioridad}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Importe en riesgo</p>
                  <p className="mt-1 text-sm font-semibold text-red-700">{euro(seleccionada.importeRiesgo)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Origen</p>
                  <p className="mt-1 text-sm font-semibold">{seleccionada.origen}</p>
                </div>
              </div>

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
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold text-blue-900">
                  {resultado}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => router.push(seleccionada.destino)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver subexpediente
                </button>

                <button
                  type="button"
                  onClick={() => setSeleccionada(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={emitirActuacion}
                  disabled={guardando}
                  className="rounded-lg bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#122f4f] disabled:opacity-50"
                >
                  {guardando ? "Emitiendo..." : "Emitir y registrar actuación"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}



