import type { Note } from "../types/note";
import { extractExcerpt, extractTitle } from "./markdownService";
import { invokeCommand, runningInTauri } from "./tauri";

const STORAGE_KEY = "edge-notes.dev.notes";

function createLocalNote(content = ""): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: extractTitle(content),
    content,
    excerpt: extractExcerpt(content),
    createdAt: now,
    updatedAt: now,
    pinned: false,
    deleted: false,
  };
}

function readDevNotes(): Note[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const seed = createLocalNote(
      "# 欢迎使用 EdgeNotes\n\n把鼠标移到顶部标签，写 Markdown，粘贴或拖入图片。",
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify([seed]));
    return [seed];
  }

  return JSON.parse(raw) as Note[];
}

function writeDevNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function sortNotes(notes: Note[]) {
  return [...notes]
    .filter((note) => !note.deleted)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

export async function listNotes(): Promise<Note[]> {
  if (runningInTauri()) {
    return invokeCommand<Note[]>("list_notes");
  }

  return sortNotes(readDevNotes());
}

export async function getNote(id: string): Promise<Note> {
  if (runningInTauri()) {
    return invokeCommand<Note>("get_note", { id });
  }

  const note = readDevNotes().find((item) => item.id === id && !item.deleted);
  if (!note) {
    throw new Error("便签不存在");
  }

  return note;
}

export async function createNote(): Promise<Note> {
  if (runningInTauri()) {
    return invokeCommand<Note>("create_note");
  }

  const note = createLocalNote();
  writeDevNotes([note, ...readDevNotes()]);
  return note;
}

export async function updateNote(id: string, content: string): Promise<Note> {
  if (runningInTauri()) {
    return invokeCommand<Note>("update_note", { id, content });
  }

  const notes = readDevNotes();
  const index = notes.findIndex((note) => note.id === id);

  if (index < 0) {
    throw new Error("便签不存在");
  }

  const updated: Note = {
    ...notes[index],
    content,
    title: extractTitle(content),
    excerpt: extractExcerpt(content),
    updatedAt: Date.now(),
  };

  notes[index] = updated;
  writeDevNotes(notes);
  return updated;
}

export async function deleteNote(id: string): Promise<void> {
  if (runningInTauri()) {
    return invokeCommand<void>("delete_note", { id });
  }

  const notes = readDevNotes().map((note) =>
    note.id === id ? { ...note, deleted: true, updatedAt: Date.now() } : note,
  );
  writeDevNotes(notes);
}

export async function searchNotes(keyword: string): Promise<Note[]> {
  if (runningInTauri()) {
    return invokeCommand<Note[]>("search_notes", { keyword });
  }

  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return listNotes();
  }

  return sortNotes(
    readDevNotes().filter(
      (note) =>
        !note.deleted &&
        (note.title.toLowerCase().includes(normalized) ||
          note.content.toLowerCase().includes(normalized)),
    ),
  );
}

export async function toggleNotePin(id: string): Promise<Note> {
  if (runningInTauri()) {
    return invokeCommand<Note>("toggle_note_pin", { id });
  }

  const notes = readDevNotes();
  const index = notes.findIndex((note) => note.id === id);

  if (index < 0) {
    throw new Error("便签不存在");
  }

  const updated = {
    ...notes[index],
    pinned: !notes[index].pinned,
    updatedAt: Date.now(),
  };

  notes[index] = updated;
  writeDevNotes(notes);
  return updated;
}
