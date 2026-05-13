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
  rol: string | null;
};

export default function LoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const usuarioLimpio = usuario.trim().toLowerCase();
    const passwordLimpia = password.trim();

    if (!usuarioLimpio || !passwordLimpia) {
      setError("Introduce usuario y contraseña para acceder.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: supabaseError } = await supabase
        .from("usuarios_demo_institucionales")
        .select("id, nombre, usuario, password_demo, activo, rol")
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
    <main className="min-h-screen bg-[#edf3f8] px-4 py-4 text-slate-950">
      <section className="flex min-h-[calc(100vh-32px)] items-center justify-center">
        <div className="grid w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg md:grid-cols-[0.82fr_1fr]">
          <aside className="bg-[#183B63] px-5 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-20 items-center justify-center rounded-xl border border-white/15 bg-white shadow-sm">
                <img
                  src="/coforma-logo.png"
                  alt="Coforma"
                  className="h-8 w-auto object-contain"
                />
              </div>

              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  Coforma Institucional
                </p>
                <p className="mt-0.5 text-[11px] text-blue-100">
                  FPED 2025
                </p>
              </div>
            </div>

            <h1 className="mt-5 text-[21px] font-semibold leading-tight">
              Acceso institucional
            </h1>

            <p className="mt-2 text-[12px] leading-5 text-blue-100">
              Fiscalización de resolución oficial, entidades, subexpedientes,
              ejecución y trazabilidad.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-2">
                <p className="text-[15px] font-semibold text-white">106</p>
                <p className="text-[9px] leading-3 text-blue-100">entidades</p>
              </div>

              <div className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-2">
                <p className="text-[15px] font-semibold text-white">2053</p>
                <p className="text-[9px] leading-3 text-blue-100">acciones</p>
              </div>

              <div className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-2">
                <p className="text-[15px] font-semibold text-white">FPED</p>
                <p className="text-[9px] leading-3 text-blue-100">2025</p>
              </div>
            </div>

            <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] leading-4 text-blue-100">
              Resolución → entidad → subexpediente → decisión → actuación.
            </p>
          </aside>

          <section className="flex items-center px-6 py-5">
            <div className="w-full">
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Acceso restringido
                </p>

                <h2 className="mt-1 text-[22px] font-semibold text-slate-950">
                  Entrar al entorno
                </h2>

                <p className="mt-1 text-[12px] leading-5 text-slate-600">
                  Solo usuarios autorizados desde accesos demo.
                </p>
              </div>

              <form
                className="space-y-2.5"
                onSubmit={handleSubmit}
                autoComplete="off"
              >
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={usuario}
                    onChange={(event) => setUsuario(event.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    autoComplete="off"
                    placeholder="Usuario autorizado"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    autoComplete="new-password"
                    placeholder="Contraseña"
                  />
                </div>

                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-800">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-9 w-full items-center justify-center rounded-lg bg-[#183B63] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#102c4c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Validando..." : "Acceder"}
                </button>
              </form>

              <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                <Link
                  href="/usuarios-demo"
                  className="font-semibold text-[#183B63] hover:underline"
                >
                  Gestionar accesos
                </Link>

                <span className="text-slate-400">Usuario activo</span>
              </div>

              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] leading-4 text-emerald-900">
                Entorno demo basado en resolución oficial trazada.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}