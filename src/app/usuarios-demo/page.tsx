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
  rol: string;
};

type RolDemo = {
  value: string;
  label: string;
  descripcion: string;
};

const PASSWORD_DEMO = "Demo1234";
const SUPERADMIN_PRINCIPAL = "antonio.barragan.demo";

const ROLES_DEMO: RolDemo[] = [
  {
    value: "superadmin",
    label: "Superadmin",
    descripcion: "Control total de la demo institucional.",
  },
  {
    value: "direccion",
    label: "Dirección",
    descripcion: "Perfil directivo institucional.",
  },
  {
    value: "tecnico_sce",
    label: "Técnico SCE",
    descripcion: "Revisión técnica y documental.",
  },
  {
    value: "intervencion",
    label: "Intervención",
    descripcion: "Fiscalización económica y control.",
  },
  {
    value: "consulta",
    label: "Consulta",
    descripcion: "Acceso de solo observación.",
  },
  {
    value: "entidad_demo",
    label: "Entidad demo",
    descripcion: "Entidad beneficiaria simulada.",
  },
  {
    value: "usuario",
    label: "Usuario",
    descripcion: "Rol básico de acceso demo.",
  },
];

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

function rolLabel(value: string | null | undefined) {
  const rol = ROLES_DEMO.find((item) => item.value === value);
  return rol ? rol.label : value || "Usuario";
}

function rolBadgeClass(value: string | null | undefined) {
  if (value === "superadmin") {
    return "border-purple-200 bg-purple-50 text-purple-800";
  }

  if (value === "direccion") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (value === "tecnico_sce") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (value === "intervencion") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (value === "consulta") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (value === "entidad_demo") {
    return "border-cyan-200 bg-cyan-50 text-cyan-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function UsuariosDemoPage() {
  const [usuarios, setUsuarios] = useState<UsuarioDemo[]>([]);
  const [nombre, setNombre] = useState("");
  const [rolNuevo, setRolNuevo] = useState("consulta");

  const [editing, setEditing] = useState<UsuarioDemo | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editUsuario, setEditUsuario] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRol, setEditRol] = useState("usuario");
  const [editActivo, setEditActivo] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usuarioSugerido = useMemo(() => normalizeUsername(nombre), [nombre]);
  const usuariosActivos = usuarios.filter((usuario) => usuario.activo).length;
  const superadminsActivos = usuarios.filter(
    (usuario) => usuario.rol === "superadmin" && usuario.activo
  ).length;

  async function loadUsuarios() {
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from("usuarios_demo_institucionales")
      .select("id, created_at, nombre, usuario, password_demo, activo, rol")
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

  async function buildAvailableUsername(base: string, ignoreId?: number) {
    let candidate = base;
    let counter = 2;

    while (candidate) {
      let query = supabase
        .from("usuarios_demo_institucionales")
        .select("id")
        .eq("usuario", candidate);

      if (ignoreId) {
        query = query.neq("id", ignoreId);
      }

      const { data, error: checkError } = await query.maybeSingle();

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

  function limpiarMensajes() {
    setMessage(null);
    setError(null);
  }

  async function crearUsuario() {
    const nombreLimpio = nombre.trim();

    limpiarMensajes();

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
          rol: rolNuevo,
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setNombre("");
      setRolNuevo("consulta");
      setMessage(
        `Acceso creado correctamente: ${usuarioDisponible} · Rol: ${rolLabel(
          rolNuevo
        )} · Contraseña: ${PASSWORD_DEMO}`
      );
      await loadUsuarios();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo crear el usuario."
      );
    } finally {
      setSaving(false);
    }
  }

  function abrirEdicion(usuario: UsuarioDemo) {
    limpiarMensajes();
    setEditing(usuario);
    setEditNombre(usuario.nombre);
    setEditUsuario(usuario.usuario);
    setEditPassword(usuario.password_demo);
    setEditRol(usuario.rol || "usuario");
    setEditActivo(usuario.activo);
  }

  function cerrarEdicion() {
    setEditing(null);
    setEditNombre("");
    setEditUsuario("");
    setEditPassword("");
    setEditRol("usuario");
    setEditActivo(true);
  }

  async function guardarEdicion() {
    if (!editing) return;

    const nombreLimpio = editNombre.trim();
    const usuarioLimpio = editUsuario.trim().toLowerCase();
    const passwordLimpia = editPassword.trim();

    limpiarMensajes();

    if (!nombreLimpio) {
      setError("El nombre no puede quedar vacío.");
      return;
    }

    if (!usuarioLimpio) {
      setError("El usuario no puede quedar vacío.");
      return;
    }

    if (!passwordLimpia) {
      setError("La contraseña no puede quedar vacía.");
      return;
    }

    if (
      editing.usuario === SUPERADMIN_PRINCIPAL &&
      (editRol !== "superadmin" || !editActivo)
    ) {
      setError("El superadmin principal no puede quedar sin rol superadmin ni desactivado.");
      return;
    }

    if (
      editing.rol === "superadmin" &&
      editing.activo &&
      (editRol !== "superadmin" || !editActivo) &&
      superadminsActivos <= 1
    ) {
      setError("No se puede dejar la demo sin ningún superadmin activo.");
      return;
    }

    setSavingEdit(true);

    try {
      const { data: duplicado, error: checkError } = await supabase
        .from("usuarios_demo_institucionales")
        .select("id")
        .eq("usuario", usuarioLimpio)
        .neq("id", editing.id)
        .maybeSingle();

      if (checkError) {
        setError(checkError.message);
        setSavingEdit(false);
        return;
      }

      if (duplicado) {
        setError("Ya existe otro usuario con ese identificador.");
        setSavingEdit(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("usuarios_demo_institucionales")
        .update({
          nombre: nombreLimpio,
          usuario: usuarioLimpio,
          password_demo: passwordLimpia,
          rol: editRol,
          activo: editActivo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);

      if (updateError) {
        setError(updateError.message);
        setSavingEdit(false);
        return;
      }

      setMessage(`Usuario actualizado correctamente: ${usuarioLimpio}`);
      cerrarEdicion();
      await loadUsuarios();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo modificar el usuario."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleActivo(usuario: UsuarioDemo) {
    limpiarMensajes();

    if (usuario.usuario === SUPERADMIN_PRINCIPAL && usuario.activo) {
      setError("El superadmin principal no puede desactivarse.");
      return;
    }

    if (usuario.rol === "superadmin" && usuario.activo && superadminsActivos <= 1) {
      setError("No se puede dejar la demo sin ningún superadmin activo.");
      return;
    }

    const { error: updateError } = await supabase
      .from("usuarios_demo_institucionales")
      .update({
        activo: !usuario.activo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", usuario.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      usuario.activo
        ? `Usuario desactivado: ${usuario.usuario}`
        : `Usuario activado: ${usuario.usuario}`
    );

    await loadUsuarios();
  }

  async function eliminarUsuario(usuario: UsuarioDemo) {
    limpiarMensajes();

    if (usuario.usuario === SUPERADMIN_PRINCIPAL) {
      setError("El superadmin principal no puede eliminarse.");
      return;
    }

    if (usuario.rol === "superadmin" && usuario.activo && superadminsActivos <= 1) {
      setError("No se puede eliminar el único superadmin activo.");
      return;
    }

    const confirmado = window.confirm(
      `¿Eliminar definitivamente el acceso demo de ${usuario.nombre} (${usuario.usuario})?`
    );

    if (!confirmado) {
      return;
    }

    setDeletingId(usuario.id);

    const { error: deleteError } = await supabase
      .from("usuarios_demo_institucionales")
      .delete()
      .eq("id", usuario.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setMessage(`Usuario eliminado: ${usuario.usuario}`);
    setDeletingId(null);
    await loadUsuarios();
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="border-b border-[#123052] bg-[#183B63] px-6 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Coforma Institucional
            </p>
            <h1 className="mt-1 text-[22px] font-semibold leading-tight">
              Accesos demo institucionales
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-blue-100">
              Alta nominal de asistentes para sesión demostrativa, asignación de
              roles, control de estado y gestión de accesos al entorno
              institucional.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs lg:min-w-[360px]">
            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-blue-100">
                Total
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {usuarios.length}
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-blue-100">
                Activos
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {usuariosActivos}
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-blue-100">
                Superadmin
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {superadminsActivos}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-blue-800 hover:text-blue-950"
          >
            ← Volver al dashboard
          </Link>

          <Link
            href="/login"
            className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-sm hover:bg-blue-50"
          >
            Ir al acceso →
          </Link>
        </div>

        <section className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-950">
                Crear acceso en reunión
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Introduce el nombre de la persona asistente, selecciona su rol y
                el sistema generará un usuario nominal para la demo.
              </p>
            </div>

            <div className="px-5 py-4">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Nombre del asistente
              </label>
              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ejemplo: María Pérez"
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
              />

              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Rol del acceso
              </label>
              <select
                value={rolNuevo}
                onChange={(event) => setRolNuevo(event.target.value)}
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
              >
                {ROLES_DEMO.map((rol) => (
                  <option key={rol.value} value={rol.value}>
                    {rol.label}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                {ROLES_DEMO.find((rol) => rol.value === rolNuevo)?.descripcion}
              </p>

              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-xs text-blue-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">Usuario sugerido</p>
                    <p className="mt-1 font-mono text-[12px]">
                      {usuarioSugerido || "—"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 text-right">
                    <p className="text-[10px] uppercase tracking-wide text-blue-700">
                      Contraseña
                    </p>
                    <p className="font-mono font-semibold">{PASSWORD_DEMO}</p>
                  </div>
                </div>
              </div>

              {message ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold leading-5 text-emerald-800">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold leading-5 text-red-800">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                onClick={crearUsuario}
                disabled={saving}
                className="mt-4 h-10 w-full rounded-xl bg-[#183B63] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102b49] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creando acceso..." : "Crear acceso demo"}
              </button>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[11px] leading-5 text-amber-900">
                <p className="font-semibold">Uso recomendado en reunión</p>
                <p className="mt-1">
                  Crear un acceso nominal por asistente presente. El rol permite
                  explicar control de perfiles, actividad y trazabilidad de uso.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Accesos creados
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Usuarios nominales autorizados para entrar en la demo
                  institucional.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  {usuariosActivos} activos
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {usuarios.length} total
                </span>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[980px] border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Nombre</th>
                      <th className="px-3 py-2 font-semibold">Usuario</th>
                      <th className="px-3 py-2 font-semibold">Rol</th>
                      <th className="px-3 py-2 font-semibold">Contraseña</th>
                      <th className="px-3 py-2 font-semibold">Alta</th>
                      <th className="px-3 py-2 font-semibold">Estado</th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-8 text-center text-xs text-slate-500"
                        >
                          Cargando accesos demo...
                        </td>
                      </tr>
                    ) : usuarios.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-8 text-center text-xs text-slate-500"
                        >
                          Todavía no hay accesos creados.
                        </td>
                      </tr>
                    ) : (
                      usuarios.map((usuario) => (
                        <tr
                          key={usuario.id}
                          className="border-t border-slate-100 hover:bg-slate-50/70"
                        >
                          <td className="px-3 py-2.5">
                            <p className="text-[12px] font-semibold leading-4 text-slate-950">
                              {usuario.nombre}
                            </p>
                          </td>

                          <td className="px-3 py-2.5">
                            <p className="font-mono text-[11px] text-slate-700">
                              {usuario.usuario}
                            </p>
                          </td>

                          <td className="px-3 py-2.5">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${rolBadgeClass(
                                usuario.rol
                              )}`}
                            >
                              {rolLabel(usuario.rol)}
                            </span>
                          </td>

                          <td className="px-3 py-2.5">
                            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-semibold text-slate-700">
                              {usuario.password_demo}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 text-[11px] leading-4 text-slate-500">
                            {formatDate(usuario.created_at)}
                          </td>

                          <td className="px-3 py-2.5">
                            <span
                              className={
                                usuario.activo
                                  ? "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"
                                  : "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500"
                              }
                            >
                              {usuario.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>

                          <td className="px-3 py-2.5">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => abrirEdicion(usuario)}
                                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-800 hover:bg-blue-100"
                              >
                                Modificar
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleActivo(usuario)}
                                className={
                                  usuario.activo
                                    ? "rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                                    : "rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                                }
                              >
                                {usuario.activo ? "Desactivar" : "Activar"}
                              </button>

                              <button
                                type="button"
                                onClick={() => eliminarUsuario(usuario)}
                                disabled={deletingId === usuario.id}
                                className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingId === usuario.id ? "Eliminando..." : "Eliminar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] leading-5 text-slate-600">
                <p className="font-semibold text-slate-700">
                  Control de acceso demo con roles
                </p>
                <p className="mt-1">
                  Esta pantalla permite crear, modificar, activar, desactivar y
                  eliminar accesos nominales. La auditoría de uso registrará
                  accesos, navegación y acciones realizadas por cada usuario.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[#183B63] px-5 py-4 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Modificar acceso demo
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {editing.nombre}
              </h2>
              <p className="mt-0.5 text-xs text-blue-100">
                Actualización de datos, rol y estado del usuario institucional.
              </p>
            </div>

            <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Nombre
                </label>
                <input
                  value={editNombre}
                  onChange={(event) => setEditNombre(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Usuario
                </label>
                <input
                  value={editUsuario}
                  onChange={(event) => setEditUsuario(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Contraseña demo
                </label>
                <input
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Rol
                </label>
                <select
                  value={editRol}
                  onChange={(event) => setEditRol(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                >
                  {ROLES_DEMO.map((rol) => (
                    <option key={rol.value} value={rol.value}>
                      {rol.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editActivo}
                    onChange={(event) => setEditActivo(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Usuario activo
                </label>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={cerrarEdicion}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarEdicion}
                disabled={savingEdit}
                className="rounded-xl bg-[#183B63] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#102b49] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}