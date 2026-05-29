import type { Note } from "../../types/note";
import { NoteListItem } from "./NoteListItem";

interface NoteListProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelect: (id: string) => Promise<void>;
}

export function NoteList({ activeNoteId, notes, onSelect }: NoteListProps) {
  return (
    <div className="note-list" role="list">
      {notes.map((note) => (
        <NoteListItem
          active={note.id === activeNoteId}
          key={note.id}
          note={note}
          onSelect={() => void onSelect(note.id)}
        />
      ))}
    </div>
  );
}
