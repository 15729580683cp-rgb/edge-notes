import { useEffect } from "react";

import { DrawerPanel } from "./components/shell/DrawerPanel";
import { NotchHandle } from "./components/shell/NotchHandle";
import { useDebouncedSave } from "./hooks/useDebouncedSave";
import { useDrawer } from "./hooks/useDrawer";
import { useNoteStore } from "./store/noteStore";

export function App() {
  const { drawerState } = useDrawer();
  const loadNotes = useNoteStore((state) => state.loadNotes);

  useDebouncedSave();

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  return (
    <main className="app-root">
      {drawerState === "collapsed" ? <NotchHandle /> : <DrawerPanel />}
    </main>
  );
}
