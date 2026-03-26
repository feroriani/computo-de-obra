import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type WheelEvent,
} from "react";

type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /**
   * auto: solo activa scroll cuando el contenido excede el alto disponible.
   * always: fuerza scroll vertical.
   * never: desactiva scroll vertical.
   */
  mode?: "auto" | "always" | "never";
  /**
   * En WebViews (Wails) a veces el wheel “se escapa” al ancestro y se percibe como
   * scroll de ventana/jank. Si está activo, se corta bubbling al ancestro.
   */
  containWheel?: boolean;
};

export function ScrollArea({
  children,
  className = "",
  style,
  mode = "auto",
  containWheel = true,
}: ScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [needsScroll, setNeedsScroll] = useState(mode === "always");

  const recalc = useCallback(() => {
    if (mode === "always") {
      setNeedsScroll(true);
      return;
    }
    if (mode === "never") {
      setNeedsScroll(false);
      return;
    }
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    setNeedsScroll(content.scrollHeight > viewport.clientHeight + 1);
  }, [mode]);

  useLayoutEffect(() => {
    recalc();
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    let rafId = 0;
    const scheduleRecalc = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(recalc);
    };

    const roViewport = new ResizeObserver(scheduleRecalc);
    const roContent = new ResizeObserver(scheduleRecalc);
    roViewport.observe(viewport);
    roContent.observe(content);

    return () => {
      cancelAnimationFrame(rafId);
      roViewport.disconnect();
      roContent.disconnect();
    };
  }, [children, recalc]);

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!containWheel) return;
    e.stopPropagation();
  };

  const overflowClass =
    mode === "never"
      ? "overflow-hidden"
      : mode === "always"
        ? "overflow-y-scroll"
        : "overflow-y-auto";

  return (
    <div
      ref={viewportRef}
      data-needs-scroll={needsScroll ? "true" : "false"}
      className={`min-h-0 flex-1 overscroll-contain ${overflowClass} ${className}`}
      style={{
        scrollbarGutter: "stable",
        overscrollBehavior: "contain",
        ...style,
      }}
      onWheel={onWheel}
      onPointerDown={() => {
        const ae = document.activeElement as HTMLElement | null;
        if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) ae.blur();
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

