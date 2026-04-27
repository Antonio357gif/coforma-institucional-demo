"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type UsuarioDemo = {
  id: number;
  created_at: string;
  nombre: string;
  usuario: string;
  password_demo: string;
  activo: boolean;
};

const PASSWORD_DEMO = "Demo1234";

function normalizeUsername(nombre: string) {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, ".");

  return limpio ? `${limpio}.demo` : "";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function UsuariosDemoPage() {
  const [usuarios, setUsuarios] = useState<UsuarioDemo[]>([]);
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usuarioSugerido = useMemo(() => normalizeUsername(nombre), [nombre]);

  async function loadUsuarios() {
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from("usuarios_demo_institucionales")
      .select("id, created_at, nombre, usuario, password_demo, activo")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setUsuarios([]);
      setLoading(false);
      return;
    }

    setUsuarios((data ?? []) as UsuarioDemo[]);
    setLoading(false);
  }

  useEffect(() => {
    loadUsuarios();
  }, []);

  async function buildAvailableUsername(base: string) {
    let candidate = base;
    let counter = 2;

    while (candidate) {
      const { data, error: checkError } = await supabase
        .from("usuarios_demo_institucionales")
        .select("id")
        .eq("usuario", candidate)
        .maybeSingle();

      if (checkError) {
        throw new Error(checkError.message);
      }

      if (!data) {
        return candidate;
      }

      candidate = `${base.replace(/\.demo$/, "")}.${counter}.demo`;
      counter += 1;
    }

    return "";
  }

  async function crearUsuario() {
    const nombreLimpio = nombre.trim();

    setMessage(null);
    setError(null);

    if (!nombreLimpio) {
      setError("Introduce el nombre de la persona asistente.");
      return;
    }

    const baseUsuario = normalizeUsername(nombreLimpio);

    if (!baseUsuario) {
      setError("No se pudo generar un usuario válido con ese nombre.");
      return;
    }

    setSaving(true);

    try {
      const usuarioDisponible = await buildAvailableUsername(baseUsuario);

      const { error: insertError } = await supabase
        .from("usuarios_demo_institucionales")
        .insert({
          nombre: nombreLimpio,
          usuario: usuarioDisponible,
          password_demo: PASSWORD_DEMO,
          activo: true,
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setNombre("");
      setMessage(`Usuario creado: ${usuarioDisponible} · Contraseña: ${PASSWORD_DEMO}`);
      await loadUsuarios();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(usuario: UsuarioDemo) {
    setMessage(null);
    setError(null);

    const { error: updateError } = await supabase
      .from("usuarios_demo_institucionales")
      .update({ activo: !usuario.activo })
      .eq("id", usuario.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadUsuarios();
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="bg-[#183B63] px-6 py-6 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Usuarios demo institucionales</h1>
            <p className="mt-1 text-sm text-blue-100">
              Alta rápida de accesos nominales para asistentes a la reunión.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm">
            <p className="font-semibold">Contraseña común</p>
            <p className="text-xs text-blue-100">{PASSWORD_DEMO}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-5 px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            ← Volver al dashboard
          </Link>
          <Link href="/login" className="text-xs font-semibold text-blue-800 hover:text-blue-950">
            Ir al acceso →
          </Link>
        </div>

        <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Crear usuario en la reunión</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Introduce el nombre de la persona asistente. El sistema genera un usuario nominal y asigna la contraseña demo común.
            </p>

            <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Nombre del asistente
            </label>
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ejemplo: María Pérez"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
            />

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
              <p className="font-semibold">Usuario sugerido</p>
              <p className="mt-1 font-mono">{usuarioSugerido || "—"}</p>
              <p className="mt-2">
                Contraseña: <span className="font-semibold">{PASSWORD_DEMO}</span>
              </p>
            </div>

            {message ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={crearUsuario}
              disabled={saving}
              className="mt-5 h-11 w-full rounded-xl bg-[#183B63] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102b49] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creando usuario..." : "Crear acceso demo"}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Usuarios creados</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Accesos nominales disponibles para entrar en la demo institucional.
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                {usuarios.length} usuarios
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nombre</th>
                    <th className="px-3 py-2 font-semibold">Usuario</th>
                    <th className="px-3 py-2 font-semibold">Contraseña</th>
                    <th className="px-3 py-2 font-semibold">Alta</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        Cargando usuarios demo...
                      </td>
                    </tr>
                  ) : usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        Todavía no hay usuarios creados.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((usuario) => (
                      <tr key={usuario.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-900">{usuario.nombre}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{usuario.usuario}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{usuario.password_demo}</td>
                        <td className="px-3 py-2 text-slate-500">{formatDate(usuario.created_at)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              usuario.activo
                                ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"
                                : "rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500"
                            }
                          >
                            {usuario.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleActivo(usuario)}
                            className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-800 hover:bg-blue-100"
                          >
                            {usuario.activo ? "Desactivar" : "Activar"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
