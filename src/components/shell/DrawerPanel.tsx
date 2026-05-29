import type { DragEvent } from "react";
import { useRef } from "react";
import {
  CircleAlert,
  ImagePlus,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { MarkdownEditor } from "../editor/MarkdownEditor";
import { DropImageOverlay } from "../editor/DropImageOverlay";
import { NoteList } from "../notes/NoteList";
import { SearchBox } from "../notes/SearchBox";
import { imageMarkdown, saveImageAsset } from "../../services/assetService";
import { useNoteStore } from "../../store/noteStore";
import { useUIStore } from "../../store/uiStore";
import { WindowFrame } from "./WindowFrame";

function statusText(status: string) {
  switch (status) {
    case "editing":
      return "编辑中";
    case "saving":
      return "保存中";
    case "saved":
      return "已保存";
    case "error":
      return "失败";
    default:
      return "就绪";
  }
}

export function DrawerPanel() {
  const collapse = useUIStore((state) => state.collapse);
  const drawerState = useUIStore((state) => state.drawerState);
  const expand = useUIStore((state) => state.expand);
  const lockEditing = useUIStore((state) => state.lockEditing);
  const unlockEditing = useUIStore((state) => state.unlockEditing);
  const isDraggingImage = useUIStore((state) => state.isDraggingImage);
  const setDraggingImage = useUIStore((state) => state.setDraggingImage);
  const isEditorFocused = useUIStore((state) => state.isEditorFocused);
  const collapseTimer = useRef<number | null>(null);

  const notes = useNoteStore((state) => state.notes);
  const activeNote = useNoteStore((state) => state.activeNote);
  const activeNoteId = useNoteStore((state) => state.activeNoteId);
  const saveStatus = useNoteStore((state) => state.saveStatus);
  const editorRevision = useNoteStore((state) => state.editorRevision);
  const errorMessage = useNoteStore((state) => state.errorMessage);
  const createNote = useNoteStore((state) => state.createNote);
  const selectNote = useNoteStore((state) => state.selectNote);
  const updateActiveContent = useNoteStore((state) => state.updateActiveContent);
  const appendMarkdownToActive = useNoteStore((state) => state.appendMarkdownToActive);
  const importImagesForActive = useNoteStore((state) => state.importImagesForActive);
  const deleteActiveNote = useNoteStore((state) => state.deleteActiveNote);
  const togglePinActive = useNoteStore((state) => state.togglePinActive);

  const clearCollapseTimer = () => {
    if (collapseTimer.current) {
      window.clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  };

  const scheduleCollapse = () => {
    clearCollapseTimer();
    collapseTimer.current = window.setTimeout(() => {
      void collapse(false);
    }, 180);
  };

  const handleDragEnter = (event: DragEvent) => {
    if (Array.from(event.dataTransfer.items).some((item) => item.type.startsWith("image/"))) {
      event.preventDefault();
      setDraggingImage(true);
      void expand();
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDraggingImage(false);
    }
  };

  const handleDrop = async (event: DragEvent) => {
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length === 0 || !activeNote) {
      return;
    }

    event.preventDefault();
    setDraggingImage(false);

    const assets = [];
    for (const file of files.slice(0, 20)) {
      assets.push(await saveImageAsset(file, activeNote.id));
    }

    appendMarkdownToActive(assets.map(imageMarkdown).join("\n\n"));
  };

  return (
    <WindowFrame drawerState={drawerState}>
      <div
        className={`drawer-panel drawer-${drawerState}`}
        data-drawer-state={drawerState}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onMouseEnter={() => {
          clearCollapseTimer();
          void expand();
        }}
        onMouseLeave={() => {
          if (!isEditorFocused) {
            scheduleCollapse();
          }
        }}
      >
        <header className="notch-card-header">
          <div className="notch-brand">
            <NotebookPen aria-hidden size={16} />
            <span>EdgeNotes</span>
          </div>

          <div className="notch-actions">
            <span className={`save-status ${saveStatus}`}>
              {saveStatus === "error" ? (
                <CircleAlert aria-hidden size={13} />
              ) : (
                <Save aria-hidden size={13} />
              )}
              <span>{statusText(saveStatus)}</span>
            </span>
            <button
              className="icon-button accent"
              onClick={() => void createNote()}
              title="新建便签"
              type="button"
            >
              <Plus aria-hidden size={17} />
            </button>
            <button
              className="icon-button"
              disabled={!activeNote}
              onClick={() => void importImagesForActive()}
              title="添加图片"
              type="button"
            >
              <ImagePlus aria-hidden size={17} />
            </button>
            <button
              className={`icon-button ${activeNote?.pinned ? "active" : ""}`}
              disabled={!activeNote}
              onClick={() => void togglePinActive()}
              title={activeNote?.pinned ? "取消置顶" : "置顶"}
              type="button"
            >
              {activeNote?.pinned ? <PinOff aria-hidden size={16} /> : <Pin aria-hidden size={16} />}
            </button>
            <button
              className="icon-button danger"
              disabled={!activeNote}
              onClick={() => void deleteActiveNote()}
              title="删除"
              type="button"
            >
              <Trash2 aria-hidden size={16} />
            </button>
          </div>
        </header>

        <aside className="note-switcher">
          <SearchBox />
          <NoteList activeNoteId={activeNoteId} notes={notes} onSelect={selectNote} />
        </aside>

        <section className="editor-pane">
          {activeNote ? (
            <MarkdownEditor
              key={`${activeNote.id}-${editorRevision}`}
              noteId={activeNote.id}
              onBlur={() => {
                unlockEditing();
                scheduleCollapse();
              }}
              onChange={updateActiveContent}
              onFocus={lockEditing}
              value={activeNote.content}
            />
          ) : (
            <div className="empty-editor">
              <button
                className="empty-editor-button"
                onClick={() => void createNote()}
                type="button"
              >
                <ImagePlus aria-hidden size={18} />
                <span>新便签</span>
              </button>
            </div>
          )}

          {errorMessage ? <div className="error-toast">{errorMessage}</div> : null}
          {isDraggingImage ? <DropImageOverlay /> : null}
        </section>
      </div>
    </WindowFrame>
  );
}
