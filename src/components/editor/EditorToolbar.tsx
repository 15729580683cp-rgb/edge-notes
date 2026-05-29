import { CircleAlert, ImagePlus, Pin, PinOff, Save, Trash2 } from "lucide-react";

import type { SaveStatus } from "../../types/editor";
import type { Note } from "../../types/note";

interface EditorToolbarProps {
  activeNote: Note | null;
  saveStatus: SaveStatus;
  onInsertImage: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

function statusText(status: SaveStatus) {
  switch (status) {
    case "editing":
      return "正在编辑";
    case "saving":
      return "保存中";
    case "saved":
      return "已保存";
    case "error":
      return "保存失败";
    default:
      return "就绪";
  }
}

export function EditorToolbar({
  activeNote,
  onDelete,
  onInsertImage,
  onTogglePin,
  saveStatus,
}: EditorToolbarProps) {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <button
          className="icon-button"
          disabled={!activeNote}
          onClick={onInsertImage}
          title="添加图片"
          type="button"
        >
          <ImagePlus aria-hidden size={18} />
        </button>
        <button
          className={`icon-button ${activeNote?.pinned ? "active" : ""}`}
          disabled={!activeNote}
          onClick={onTogglePin}
          title={activeNote?.pinned ? "取消置顶" : "置顶"}
          type="button"
        >
          {activeNote?.pinned ? <PinOff aria-hidden size={17} /> : <Pin aria-hidden size={17} />}
        </button>
        <button
          className="icon-button danger"
          disabled={!activeNote}
          onClick={onDelete}
          title="删除"
          type="button"
        >
          <Trash2 aria-hidden size={17} />
        </button>
      </div>

      <div className={`save-status ${saveStatus}`}>
        {saveStatus === "error" ? (
          <CircleAlert aria-hidden size={14} />
        ) : (
          <Save aria-hidden size={14} />
        )}
        <span>{statusText(saveStatus)}</span>
      </div>
    </div>
  );
}
