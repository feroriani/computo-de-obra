import { useEffect } from "react";

/**
 * WebKit/Wails: cuando se abre un modal/drawer con overlay, el scroll de fondo puede
 * seguir “pintándose” (scrollbars que se desvanecen). Este hook fuerza el bloqueo
 * del scroll global (body/html) mientras el overlay esté abierto.
 */
export function useBlockBackgroundScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [active]);
}

