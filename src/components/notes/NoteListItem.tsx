import { Pin } from "lucide-react";

import type { Note } from "../../types/note";

const formatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

interface NoteListItemProps {
  note: Note;
  active: boolean;
  onSelect: () => void;
}

export function NoteListItem({ active, note, onSelect }: NoteListItemProps) {
  return (
    <button
      className={`note-list-item ${active ? "active" : ""}`}
      onClick={onSelect}
      type="button"
    >
      <span className="note-title-row">
        <span className="note-title">{note.title}</span>
        {note.pinned ? <Pin aria-hidden size={13} /> : null}
      </span>
      <span className="note-excerpt">{note.excerpt || " "}</span>
      <span className="note-date">{formatter.format(note.updatedAt)}</span>
    </button>
  );
}
