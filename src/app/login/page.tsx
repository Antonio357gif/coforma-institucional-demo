"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type UsuarioDemo = {
  id: number;
  nombre: string;
  usuario: string;
  password_demo: string;
  activo: boolean;
};

export default function LoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("tecnico.sce.demo");
  const [password, setPassword] = useState("coforma-demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const usuarioLimpio = usuario.trim().toLowerCase();
    const passwordLimpia = password.trim();

    try {
      // Acceso técnico inicial de respaldo para no bloquear la demo.
      if (
        usuarioLimpio === "tecnico.sce.demo" &&
        passwordLimpia === "coforma-demo"
      ) {
        router.push("/dashboard");
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from("usuarios_demo_institucionales")
        .select("id, nombre, usuario, password_demo, activo")
        .eq("usuario", usuarioLimpio)
        .eq("activo", true)
        .maybeSingle<UsuarioDemo>();

      if (supabaseError) {
        console.error("Error validando usuario demo:", supabaseError);
        setError(
          "No se pudo validar el acceso en este momento. Revisa la conexión con Supabase."
        );
        return;
      }

      if (!data) {
        setError("Usuario no encontrado o actualmente desactivado.");
        return;
      }

      if (data.password_demo !== passwordLimpia) {
        setError("Contraseña incorrecta para este usuario demo.");
        return;
      }

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#edf3f8] text-slate-950">
      <section className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-[#183B63] p-8 text-white lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Coforma Institucional
            </p>

            <h1 className="mt-5 text-3xl font-semibold leading-tight">
              Acceso a fiscalización FPED 2025
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100">
              Entorno demo para seguimiento institucional de resolución oficial,
              entidades beneficiarias, acciones concedidas, ejecución, incidencias,
              requerimientos y trazabilidad administrativa.
            </p>

            <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-5">
              <p className="text-sm font-semibold">Modelo de trabajo</p>
              <p className="mt-2 text-sm leading-6 text-blue-100">
                Resolución oficial → expediente de entidad → subexpedientes AF/CP
                → alumnado → documentación → incidencias → decisiones.
              </p>
            </div>

            <div className="mt-8 grid gap-3 text-xs text-blue-100 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-lg font-semibold text-white">30</p>
                <p>entidades</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-lg font-semibold text-white">528</p>
                <p>acciones</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-lg font-semibold text-white">FPED 2025</p>
                <p>resolución</p>
              </div>
            </div>
          </div>

          <div className="p-8 lg:p-10">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Acceso restringido
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                Entrar al entorno institucional
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Acceso demo para presentación institucional. Los asistentes pueden
                entrar con usuarios nominales creados desde el módulo de accesos
                demo institucionales.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Usuario demo
                </label>
                <input
                  type="text"
                  value={usuario}
                  onChange={(event) => setUsuario(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contraseña demo
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                  autoComplete="current-password"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-800">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#183B63] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#102c4c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Validando acceso..."
                  : "Acceder al dashboard institucional"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs">
              <Link
                href="/usuarios-demo"
                className="font-semibold text-[#183B63] hover:underline"
              >
                Gestionar accesos demo
              </Link>

              <span className="text-slate-400">Contraseña común: Demo1234</span>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
              <p className="font-semibold">Nota de demo</p>
              <p className="mt-1">
                La concesión procede de carga oficial validada. La ejecución está
                marcada como simulación controlada para demo institucional.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}