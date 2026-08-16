import { useEffect, useRef } from "react";

export default function useModalControls(onClose) {
  const ref = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const firstControl = ref.current?.querySelector("button, input, select, textarea, a[href]");
    firstControl?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [onClose]);

  return ref;
}
