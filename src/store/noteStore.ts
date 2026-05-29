import { create } from "zustand";

import type { SaveStatus } from "../types/editor";
import type { Note } from "../types/note";
import { imageMarkdown, chooseAndImportImages } from "../services/assetService";
import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  searchNotes,
  toggleNotePin,
  updateNote,
} from "../services/noteService";
import { appendMarkdownBlock, extractExcerpt, extractTitle } from "../services/markdownService";

interface NoteStore {
  notes: Note[];
  activeNote: Note | null;
  activeNoteId: string | null;
  searchKeyword: string;
  saveStatus: SaveStatus;
  dirty: boolean;
  editorRevision: number;
  errorMessage: string | null;
  loadNotes: () => Promise<void>;
  createNote: () => Promise<void>;
  selectNote: (id: string) => Promise<void>;
  updateActiveContent: (content: string) => void;
  appendMarkdownToActive: (markdown: string) => void;
  importImagesForActive: () => Promise<void>;
  saveActiveNote: () => Promise<void>;
  deleteActiveNote: () => Promise<void>;
  searchNotes: (keyword: string) => Promise<void>;
  togglePinActive: () => Promise<void>;
}

function withLocalContent(note: Note, content: string): Note {
  return {
    ...note,
    content,
    title: extractTitle(content),
    excerpt: extractExcerpt(content),
    updatedAt: Date.now(),
  };
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  activeNote: null,
  activeNoteId: null,
  searchKeyword: "",
  saveStatus: "idle",
  dirty: false,
  editorRevision: 0,
  errorMessage: null,

  async loadNotes() {
    try {
      const notes = await listNotes();

      if (notes.length === 0) {
        await get().createNote();
        return;
      }

      const activeId = get().activeNoteId ?? notes[0].id;
      const activeNote = await getNote(activeId).catch(() => getNote(notes[0].id));

      set({
        notes,
        activeNote,
        activeNoteId: activeNote.id,
        dirty: false,
        saveStatus: "saved",
        errorMessage: null,
      });
    } catch (error) {
      set({ errorMessage: String(error), saveStatus: "error" });
    }
  },

  async createNote() {
    try {
      const note = await createNote();
      const notes = await listNotes();
      set({
        notes,
        activeNote: note,
        activeNoteId: note.id,
        dirty: false,
        saveStatus: "saved",
        editorRevision: get().editorRevision + 1,
        errorMessage: null,
      });
    } catch (error) {
      set({ errorMessage: String(error), saveStatus: "error" });
    }
  },

  async selectNote(id: string) {
    const current = get().activeNote;

    if (current?.id === id) {
      return;
    }

    try {
      await get().saveActiveNote();
      const note = await getNote(id);
      set({
        activeNote: note,
        activeNoteId: note.id,
        dirty: false,
        saveStatus: "saved",
        editorRevision: get().editorRevision + 1,
        errorMessage: null,
      });
    } catch (error) {
      set({ errorMessage: String(error), saveStatus: "error" });
    }
  },

  updateActiveContent(content: string) {
    const note = get().activeNote;
    if (!note || note.content === content) {
      return;
    }

    const updated = withLocalContent(note, content);
    set((state) => ({
      activeNote: updated,
      activeNoteId: updated.id,
      dirty: true,
      saveStatus: "editing",
      notes: state.notes.map((item) =>
        item.id === updated.id
          ? { ...item, title: updated.title, excerpt: updated.excerpt, updatedAt: updated.updatedAt }
          : item,
      ),
    }));
  },

  appendMarkdownToActive(markdown: string) {
    const note = get().activeNote;
    if (!note) {
      return;
    }

    const content = appendMarkdownBlock(note.content, markdown);
    const updated = withLocalContent(note, content);
    set((state) => ({
      activeNote: updated,
      activeNoteId: updated.id,
      dirty: true,
      saveStatus: "editing",
      editorRevision: state.editorRevision + 1,
      notes: state.notes.map((item) =>
        item.id === updated.id
          ? { ...item, title: updated.title, excerpt: updated.excerpt, updatedAt: updated.updatedAt }
          : item,
      ),
    }));
  },

  async importImagesForActive() {
    const note = get().activeNote;
    if (!note) {
      return;
    }

    try {
      const assets = await chooseAndImportImages(note.id);
      const markdown = assets.map(imageMarkdown).join("\n\n");
      if (markdown) {
        get().appendMarkdownToActive(markdown);
      }
    } catch (error) {
      set({ errorMessage: String(error), saveStatus: "error" });
    }
  },

  async saveActiveNote() {
    const { activeNote, dirty } = get();
    if (!activeNote || !dirty) {
      return;
    }

    const snapshot = activeNote.content;
    const id = activeNote.id;
    set({ saveStatus: "saving" });

    try {
      const saved = await updateNote(id, snapshot);
      const notes = await listNotes();
      const stillCurrent = get().activeNote?.id === id && get().activeNote?.content === snapshot;

      set({
        notes,
        activeNote: stillCurrent ? saved : get().activeNote,
        dirty: !stillCurrent,
        saveStatus: stillCurrent ? "saved" : "editing",
        errorMessage: null,
      });
    } catch (error) {
      set({ saveStatus: "error", errorMessage: String(error) });
    }
  },

  async deleteActiveNote() {
    const note = get().activeNote;
    if (!note) {
      return;
    }

    try {
      await deleteNote(note.id);
      const notes = await listNotes();

      if (notes.length === 0) {
        await get().createNote();
        return;
      }

      const next = await getNote(notes[0].id);
      set({
        notes,
        activeNote: next,
        activeNoteId: next.id,
        dirty: false,
        saveStatus: "saved",
        editorRevision: get().editorRevision + 1,
        errorMessage: null,
      });
    } catch (error) {
      set({ errorMessage: String(error), saveStatus: "error" });
    }
  },

  async searchNotes(keyword: string) {
    try {
      const notes = keyword.trim() ? await searchNotes(keyword) : await listNotes();
      set({ notes, searchKeyword: keyword, errorMessage: null });
    } catch (error) {
      set({ errorMessage: String(error), saveStatus: "error" });
    }
  },

  async togglePinActive() {
    const note = get().activeNote;
    if (!note) {
      return;
    }

    try {
      const updated = await toggleNotePin(note.id);
      const notes = await listNotes();
      set({
        activeNote: { ...note, pinned: updated.pinned, updatedAt: updated.updatedAt },
        notes,
        errorMessage: null,
      });
    } catch (error) {
      set({ errorMessage: String(error), saveStatus: "error" });
    }
  },
}));
