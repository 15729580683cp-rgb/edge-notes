import { useEffect } from "react";

import { useUIStore } from "../store/uiStore";

export function useDrawer() {
  const collapse = useUIStore((state) => state.collapse);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void collapse(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapse]);

  return useUIStore();
}
