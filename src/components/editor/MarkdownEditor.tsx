import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import {
  Bold,
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Italic,
  Link,
  List,
  Quote,
  Strikethrough,
} from "lucide-react";

import { imageMarkdown, saveImageAsset } from "../../services/assetService";
import {
  editorMarkdownToStorageMarkdown,
  markdownToEditorMarkdown,
} from "../../services/markdownService";

interface MarkdownEditorProps {
  noteId: string;
  value: string;
  onChange: (markdown: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface FormatButtonProps {
  active?: boolean;
  className?: string;
  disabled?: boolean;
  title: string;
  onRun: () => void;
  children: ReactNode;
}

function FormatButton({
  active,
  children,
  className,
  disabled,
  onRun,
  title,
}: FormatButtonProps) {
  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!disabled) {
      onRun();
    }
  };

  return (
    <button
      className={["format-button", active ? "active" : "", className].filter(Boolean).join(" ")}
      disabled={disabled}
      onMouseDown={handleMouseDown}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function OrderedListIcon() {
  return (
    <span aria-hidden className="ordered-list-glyph">
      <span>1</span>
      <span>2</span>
      <span>3</span>
    </span>
  );
}

function run(editor: Editor | null, command: (editor: Editor) => boolean) {
  if (!editor) {
    return;
  }

  command(editor);
}

export function MarkdownEditor({ noteId, onBlur, onChange, onFocus, value }: MarkdownEditorProps) {
  const applyingExternalContentRef = useRef(false);
  const lastValueRef = useRef(value);
  const onBlurRef = useRef(onBlur);
  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocus);
  const renderVersionRef = useRef(0);

  useEffect(() => {
    onBlurRef.current = onBlur;
    onChangeRef.current = onChange;
    onFocusRef.current = onFocus;
  }, [onBlur, onChange, onFocus]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
      }),
      LinkExtension.configure({
        autolink: true,
        defaultProtocol: "https",
        linkOnPaste: true,
        openOnClick: false,
      }),
      ImageExtension.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: "editor-image",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "task-list",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "task-list-item",
        },
      }),
      Placeholder.configure({
        placeholder: "开始输入 Markdown...",
      }),
      Markdown.configure({
        indentation: {
          style: "space",
          size: 2,
        },
        markedOptions: {
          breaks: false,
          gfm: true,
        },
      }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: "",
    contentType: "markdown",
    editorProps: {
      attributes: {
        "aria-label": "NotchNotes 风格 Markdown 编辑器",
        class: "tiptap-prosemirror",
        spellcheck: "false",
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.some((file) => file.type.startsWith("image/"))) {
          void saveImageFiles(files);
          event.preventDefault();
          return true;
        }

        return false;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.items ?? [])
          .map((item) => item.getAsFile())
          .filter((file): file is File => Boolean(file));

        if (files.some((file) => file.type.startsWith("image/"))) {
          void saveImageFiles(files);
          event.preventDefault();
          return true;
        }

        return false;
      },
    },
    immediatelyRender: false,
    onBlur: () => {
      onBlurRef.current?.();
    },
    onFocus: () => {
      onFocusRef.current?.();
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (applyingExternalContentRef.current) {
        return;
      }

      const markdown = editorMarkdownToStorageMarkdown(currentEditor.getMarkdown());
      if (markdown === lastValueRef.current) {
        return;
      }

      lastValueRef.current = markdown;
      onChangeRef.current(markdown);
    },
    shouldRerenderOnTransaction: true,
  });

  useEffect(() => {
    if (!editor || value === lastValueRef.current) {
      return;
    }

    const renderVersion = renderVersionRef.current + 1;
    renderVersionRef.current = renderVersion;

    void markdownToEditorMarkdown(value).then((editorMarkdown) => {
      if (renderVersionRef.current !== renderVersion) {
        return;
      }

      applyingExternalContentRef.current = true;
      editor.commands.setContent(editorMarkdown, { contentType: "markdown" });
      applyingExternalContentRef.current = false;
      lastValueRef.current = value;
    });
  }, [editor, noteId, value]);

  const saveImageFiles = async (files: File[]) => {
    if (!editor) {
      return false;
    }

    const images = files.filter((file) => file.type.startsWith("image/")).slice(0, 20);
    if (!images.length) {
      return false;
    }

    const assets = [];
    for (const image of images) {
      assets.push(await saveImageAsset(image, noteId));
    }

    const markdown = await markdownToEditorMarkdown(assets.map(imageMarkdown).join("\n\n"));
    editor.chain().focus().insertContent(markdown, { contentType: "markdown" }).run();
    return true;
  };

  const insertLink = () => {
    run(editor, (currentEditor) => {
      const { empty } = currentEditor.state.selection;

      if (empty) {
        return currentEditor
          .chain()
          .focus()
          .insertContent("[链接](https://)", { contentType: "markdown" })
          .run();
      }

      return currentEditor.chain().focus().extendMarkRange("link").setLink({ href: "https://" }).run();
    });
  };

  return (
    <div className="markdown-editor tiptap">
      <EditorContent className="tiptap-surface" editor={editor} />

      <div className="markdown-format-bar" aria-label="Markdown 工具栏">
        <FormatButton
          active={editor?.isActive("heading", { level: 1 })}
          disabled={!editor}
          onRun={() => run(editor, (currentEditor) => currentEditor.chain().focus().toggleHeading({ level: 1 }).run())}
          title="一级标题"
        >
          <Heading1 aria-hidden size={16} />
        </FormatButton>
        <FormatButton
          active={editor?.isActive("heading", { level: 2 })}
          disabled={!editor}
          onRun={() => run(editor, (currentEditor) => currentEditor.chain().focus().toggleHeading({ level: 2 }).run())}
          title="二级标题"
        >
          <Heading2 aria-hidden size={16} />
        </FormatButton>
        <FormatButton
          active={editor?.isActive("bold")}
          disabled={!editor}
          onRun={() => run(editor, (currentEditor) => currentEditor.chain().focus().toggleBold().run())}
          title="粗体"
        >
          <Bold aria-hidden size={15} />
        </FormatButton>
        <FormatButton
          active={editor?.isActive("italic")}
          disabled={!editor}
          onRun={() => run(editor, (currentEditor) => currentEditor.chain().focus().toggleItalic().run())}
          title="斜体"
        >
          <Italic aria-hidden size={15} />
        </FormatButton>
        <FormatButton
          active={editor?.isActive("strike")}
          disabled={!editor}
          onRun={() => run(editor, (currentEditor) => currentEditor.chain().focus().toggleStrike().run())}
          title="删除线"
        >
          <Strikethrough aria-hidden size={15} />
        </FormatButton>
        <FormatButton
          active={editor?.isActive("codeBlock")}
          disabled={!editor}
          onRun={() => run(editor, (currentEditor) => currentEditor.chain().focus().toggleCodeBlock().run())}
          title="代码块"
        >
          <Code2 aria-hidden size={15} />
        </FormatButton>
        <FormatButton disabled={!editor} onRun={insertLink} title="链接">
          <Link aria-hidden size={15} />
        </FormatButton>
        <FormatButton
          active={editor?.isActive("blockquote")}
          disabled={!editor}
          onRun={() => run(editor, (currentEditor) => currentEditor.chain().focus().toggleBlockquote().run())}
          title="引用"
        >
          <Quote aria-hidden size={15} />
        </FormatButton>
        <FormatButton
          active={editor?.isActive("bulletList")}
          disabled={!editor}
          onRun={() => run(editor, (currentEditor) => currentEditor.chain().focus().toggleBulletList().run())}
          title="无序列表"
        >
          <List aria-hidden size={15} />
        </FormatButton>
        <FormatButton
          active={editor?.isActive("orderedList")}
          className="numbered-format-button"
          disabled={!editor}
          onRun={() => run(editor, (currentEditor) => currentEditor.chain().focus().toggleOrderedList().run())}
          title="有序列表 1 2 3"
        >
          <OrderedListIcon />
        </FormatButton>
        <FormatButton
          active={editor?.isActive("taskList")}
          disabled={!editor}
          onRun={() => run(editor, (currentEditor) => currentEditor.chain().focus().toggleTaskList().run())}
          title="任务列表"
        >
          <CheckSquare aria-hidden size={15} />
        </FormatButton>
      </div>
    </div>
  );
}
