import { PanelTopOpen } from "lucide-react";

import { useUIStore } from "../../store/uiStore";

export function NotchHandle() {
  const expand = useUIStore((state) => state.expand);

  return (
    <button
      className="notch-handle"
      onMouseEnter={() => void expand()}
      onFocus={() => void expand()}
      onPointerEnter={() => void expand()}
      onClick={() => void expand()}
      title="展开 EdgeNotes"
      type="button"
    >
      <PanelTopOpen aria-hidden size={17} strokeWidth={2.3} />
      <span>EdgeNotes</span>
    </button>
  );
}
