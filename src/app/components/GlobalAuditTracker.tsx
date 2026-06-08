"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

type UsuarioSesionDemo = {
  id: number;
  nombre: string;
  usuario: string;
  rol: string;
};

type EntidadRuta = {
  entidad_tipo: string | null;
  entidad_id: number | null;
};

const STORAGE_KEY = "coforma_institucional_usuario_demo";

const CLICK_SELECTOR =
  "a, button, select, input[type='checkbox'], input[type='radio']";

function getPageName(pathname: string) {
  if (pathname === "/") return "Inicio";
  if (pathname === "/login") return "Acceso institucional";
  if (pathname === "/dashboard") return "Dashboard ejecutivo institucional";
  if (pathname === "/usuarios-demo") return "Accesos demo institucionales";
  if (pathname === "/actividad-usuarios-demo") return "Actividad de usuarios demo";
  if (pathname === "/oferta-formativa") return "Oferta formativa";
  if (pathname.startsWith("/oferta-formativa/")) return "Ficha de oferta formativa";
  if (pathname.startsWith("/subexpedientes-accion/")) return "Subexpediente de acción formativa";
  if (pathname.startsWith("/estado-pago/")) return "Estado de pago operativo";
  if (pathname.startsWith("/mesa-documental/")) return "Mesa documental";
  if (pathname === "/recepcion-documentacion") return "Recepción documental";
  if (pathname === "/matriz-normativa-documental") return "Matriz normativa documental";
  if (pathname === "/mesa-fiscalizacion") return "Mesa de fiscalización";
  if (pathname === "/trazabilidad-tecnica") return "Trazabilidad técnica";
  if (pathname === "/justificacion-economica") return "Justificación económica";
  if (pathname === "/decisiones") return "Decisiones económicas";
  if (pathname.startsWith("/decisiones-economicas/")) return "Ficha de decisión económica";
  if (pathname === "/acciones") return "Actuaciones administrativas";
  if (pathname.startsWith("/acciones/nueva")) return "Nueva actuación administrativa";
  if (pathname === "/actuaciones-emitidas") return "Actuaciones emitidas";
  if (pathname.startsWith("/actuaciones-emitidas/")) return "Ficha de actuación emitida";
  if (pathname === "/alertas") return "Alertas institucionales";
  if (pathname === "/alertas/nueva") return "Nueva alerta institucional";
  if (pathname === "/avisos-institucionales") return "Avisos institucionales";
  if (pathname.startsWith("/avisos-institucionales/")) return "Ficha de aviso institucional";
  if (pathname === "/entidades") return "Entidades beneficiarias";
  if (pathname.startsWith("/entidades/")) return "Ficha de entidad beneficiaria";
  if (pathname === "/planificacion-ejecucion") return "Planificación y ejecución";
  if (pathname === "/documentacion-fases") return "Documentación por fases";
  if (pathname === "/distribucion-territorial") return "Distribución territorial";
  if (pathname === "/auditoria-intervencion") return "Auditoría de intervención";
  if (pathname === "/comunicaciones-canal") return "Comunicaciones y canal";
  if (pathname === "/conexiones") return "Conexiones institucionales";

  return pathname.replace("/", "").replaceAll("-", " ") || "Página institucional";
}

function getEntityFromPath(pathname: string): EntidadRuta {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    return {
      entidad_tipo: null,
      entidad_id: null,
    };
  }

  const tipo = parts[0] ?? null;
  const id = Number(parts[1]);

  return {
    entidad_tipo: tipo,
    entidad_id: Number.isFinite(id) ? id : null,
  };
}

function readUsuarioSesion() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as UsuarioSesionDemo;

    if (!parsed?.id || !parsed?.usuario) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("No se pudo leer usuario demo de sessionStorage:", error);
    return null;
  }
}

function cleanText(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function getElementLabel(element: Element) {
  const dataAuditLabel = element.getAttribute("data-audit-label");
  const ariaLabel = element.getAttribute("aria-label");
  const title = element.getAttribute("title");
  const text = cleanText(element.textContent);

  return (
    cleanText(dataAuditLabel) ||
    cleanText(ariaLabel) ||
    cleanText(title) ||
    text ||
    element.tagName.toLowerCase()
  );
}

function getElementType(element: Element) {
  const tagName = element.tagName.toLowerCase();

  if (tagName === "a") return "enlace";
  if (tagName === "button") return "boton";
  if (tagName === "select") return "selector";
  if (tagName === "input") {
    const type = element.getAttribute("type") ?? "input";
    return `input_${type}`;
  }

  return tagName;
}

function shouldIgnoreElement(element: Element) {
  const auditIgnore = element.closest("[data-audit-ignore='true']");
  if (auditIgnore) return true;

  const label = getElementLabel(element).toLowerCase();

  if (!label) return true;

  return false;
}

async function registrarAuditoria(params: {
  tipo_evento: "page_view" | "accion";
  pathname: string;
  search: string;
  ruta: string;
  pagina: string;
  accion: string;
  entidad: EntidadRuta;
  detalle: Record<string, unknown>;
}) {
  const usuarioSesion = readUsuarioSesion();

  if (!usuarioSesion) return;

  const { error } = await supabase.from("auditoria_usuarios_demo").insert({
    usuario_demo_id: usuarioSesion.id,
    usuario: usuarioSesion.usuario,
    nombre: usuarioSesion.nombre,
    rol: usuarioSesion.rol ?? "usuario",
    tipo_evento: params.tipo_evento,
    ruta: params.ruta,
    pagina: params.pagina,
    accion: params.accion,
    entidad_tipo: params.entidad.entidad_tipo,
    entidad_id: params.entidad.entidad_id,
    detalle: {
      ...params.detalle,
      pathname: params.pathname,
      search: params.search,
    },
    user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent : null,
  });

  if (error) {
    console.error("No se pudo registrar auditoría:", error);
  }
}

function AuditTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const lastPageViewKey = useRef("");
  const lastActionKey = useRef("");

  useEffect(() => {
    async function registrarPageView() {
      if (!pathname || pathname === "/login") return;

      const usuarioSesion = readUsuarioSesion();
      if (!usuarioSesion) return;

      const queryString = searchParams.toString();
      const rutaCompleta = queryString ? `${pathname}?${queryString}` : pathname;
      const auditKey = `${usuarioSesion.id}:page_view:${rutaCompleta}`;

      if (lastPageViewKey.current === auditKey) return;
      lastPageViewKey.current = auditKey;

      await registrarAuditoria({
        tipo_evento: "page_view",
        pathname,
        search: queryString,
        ruta: rutaCompleta,
        pagina: getPageName(pathname),
        accion: "Visita de página",
        entidad: getEntityFromPath(pathname),
        detalle: {
          origen: "global_page_view_tracker",
        },
      });
    }

    registrarPageView();
  }, [pathname, searchParams]);

  useEffect(() => {
    function registrarInteraccionDesdeEvento(event: Event, origenEvento: "pointerdown" | "click") {
      if (!pathname || pathname === "/login") return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const interactiveElement = target.closest(CLICK_SELECTOR);
      if (!interactiveElement) return;

      if (shouldIgnoreElement(interactiveElement)) return;

      const usuarioSesion = readUsuarioSesion();
      if (!usuarioSesion) return;

      const queryString = searchParams.toString();
      const rutaCompleta = queryString ? `${pathname}?${queryString}` : pathname;

      const label = getElementLabel(interactiveElement);
      const elementType = getElementType(interactiveElement);
      const href =
        interactiveElement instanceof HTMLAnchorElement
          ? interactiveElement.getAttribute("href")
          : null;

      const actionKey = `${usuarioSesion.id}:accion:${rutaCompleta}:${elementType}:${label}:${href ?? ""}`;

      if (lastActionKey.current === actionKey) return;

      lastActionKey.current = actionKey;
      window.setTimeout(() => {
        if (lastActionKey.current === actionKey) {
          lastActionKey.current = "";
        }
      }, 1200);

      registrarAuditoria({
        tipo_evento: "accion",
        pathname,
        search: queryString,
        ruta: rutaCompleta,
        pagina: getPageName(pathname),
        accion: `Interacción: ${label}`,
        entidad: getEntityFromPath(pathname),
        detalle: {
          origen: "global_interaction_tracker",
          evento: origenEvento,
          elemento: elementType,
          etiqueta: label,
          href,
          id: interactiveElement.getAttribute("id"),
          name: interactiveElement.getAttribute("name"),
          clase: interactiveElement.getAttribute("class"),
        },
      });
    }

    function handlePointerDown(event: PointerEvent) {
      registrarInteraccionDesdeEvento(event, "pointerdown");
    }

    function handleClick(event: MouseEvent) {
      registrarInteraccionDesdeEvento(event, "click");
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, [pathname, searchParams]);

  return null;
}

export default function GlobalAuditTracker() {
  return (
    <Suspense fallback={null}>
      <AuditTrackerInner />
    </Suspense>
  );
}