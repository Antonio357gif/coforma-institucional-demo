import Link from "next/link";

export default function LoginPage() {
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
                Acceso demo para presentación institucional. En esta primera fase,
                la entrada dirige al dashboard ejecutivo navegable.
              </p>
            </div>

            <form className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Usuario demo
                </label>
                <input
                  type="text"
                  defaultValue="tecnico.sce.demo"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contraseña demo
                </label>
                <input
                  type="password"
                  defaultValue="coforma-demo"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              <Link
                href="/dashboard"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#183B63] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#102c4c]"
              >
                Acceder al dashboard institucional
              </Link>
            </form>

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
