import { useEffect } from "react";

import { useNoteStore } from "../store/noteStore";

export function useDebouncedSave(delay = 600) {
  const noteId = useNoteStore((state) => state.activeNoteId);
  const content = useNoteStore((state) => state.activeNote?.content);
  const dirty = useNoteStore((state) => state.dirty);
  const saveActiveNote = useNoteStore((state) => state.saveActiveNote);

  useEffect(() => {
    if (!noteId || !dirty) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveActiveNote();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [content, delay, dirty, noteId, saveActiveNote]);
}
