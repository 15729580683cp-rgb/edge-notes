import { resolveAssetUrl } from "./assetService";

const STORAGE_ASSET_PATTERN = /edgenotes:\/\/asset\/([A-Za-z0-9_-]+)/g;
const EDITOR_ASSET_PATTERN =
  /(asset:\/\/[^)\s]+|http:\/\/asset\.localhost\/[^)\s]+|blob:[^)\s]+)#edgenotes-asset-([A-Za-z0-9_-]+)/g;

export function extractTitle(markdown: string): string {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "未命名便签";
  }

  return stripMarkdown(lines[0]).slice(0, 60) || "未命名便签";
}

export function extractExcerpt(markdown: string): string {
  return markdown
    .split("\n")
    .map(stripMarkdown)
    .filter(Boolean)
    .join(" ")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 120);
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/!\[.*?\]\(.*?\)/g, "[图片]")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+\.\s+/, "")
    .replace(/^\s*>\s+/, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export function appendMarkdownBlock(content: string, markdown: string): string {
  const trimmed = content.trimEnd();
  const block = markdown.trim();

  if (!trimmed) {
    return `${block}\n`;
  }

  return `${trimmed}\n\n${block}\n`;
}

export function parseAssetIds(markdown: string): string[] {
  return [...markdown.matchAll(STORAGE_ASSET_PATTERN)].map((match) => match[1]);
}

export async function markdownToEditorMarkdown(markdown: string): Promise<string> {
  let result = markdown;
  const assetIds = [...new Set(parseAssetIds(markdown))];

  for (const assetId of assetIds) {
    const previewUrl = await resolveAssetUrl(assetId);
    result = result.replaceAll(`edgenotes://asset/${assetId}`, previewUrl);
  }

  return result;
}

export function editorMarkdownToStorageMarkdown(markdown: string): string {
  return markdown.replace(
    EDITOR_ASSET_PATTERN,
    (_match, _url, assetId: string) => `edgenotes://asset/${assetId}`,
  );
}
