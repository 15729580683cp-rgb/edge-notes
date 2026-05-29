import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import type { AssetRecord, SavedAsset } from "../types/asset";
import { invokeCommand, runningInTauri } from "./tauri";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_BATCH = 20;
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];
const devAssetUrls = new Map<string, string>();

function withAssetMarker(url: string, assetId: string): string {
  return `${url}#edgenotes-asset-${assetId}`;
}

function assertImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("只支持图片文件");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("单张图片不能超过 10MB");
  }
}

function normalizeFileName(file: File) {
  if (file.name) {
    return file.name;
  }

  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const ext = file.type.split("/")[1] || "png";
  return `pasted-${stamp}.${ext === "jpeg" ? "jpg" : ext}`;
}

async function fileToBytes(file: File): Promise<number[]> {
  const buffer = await file.arrayBuffer();
  return Array.from(new Uint8Array(buffer));
}

function makeDevAsset(file: File, noteId: string): SavedAsset {
  const id = crypto.randomUUID();
  const previewUrl = URL.createObjectURL(file);
  devAssetUrls.set(id, withAssetMarker(previewUrl, id));

  return {
    id,
    noteId,
    fileName: normalizeFileName(file),
    mimeType: file.type,
    size: file.size,
    markdownUrl: `edgenotes://asset/${id}`,
    previewUrl: withAssetMarker(previewUrl, id),
  };
}

export async function saveImageAsset(file: File, noteId: string): Promise<SavedAsset> {
  assertImage(file);

  if (runningInTauri()) {
    return invokeCommand<SavedAsset>("save_image_asset", {
      noteId,
      fileName: normalizeFileName(file),
      mimeType: file.type,
      bytes: await fileToBytes(file),
    });
  }

  return makeDevAsset(file, noteId);
}

export async function importImageFromPath(
  sourcePath: string,
  noteId: string,
): Promise<SavedAsset> {
  return invokeCommand<SavedAsset>("import_image_from_path", {
    noteId,
    sourcePath,
  });
}

function chooseBrowserImages(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = IMAGE_EXTENSIONS.map((ext) => `.${ext}`).join(",");
    input.multiple = true;
    input.style.display = "none";

    input.addEventListener("change", () => {
      const files = Array.from(input.files ?? []);
      input.remove();
      resolve(files);
    });

    document.body.appendChild(input);
    input.click();
  });
}

export async function chooseAndImportImages(noteId: string): Promise<SavedAsset[]> {
  if (runningInTauri()) {
    const selected = await open({
      multiple: true,
      filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
    });

    const paths = Array.isArray(selected) ? selected : selected ? [selected] : [];
    return Promise.all(paths.slice(0, MAX_IMAGE_BATCH).map((path) => importImageFromPath(path, noteId)));
  }

  const files = (await chooseBrowserImages()).slice(0, MAX_IMAGE_BATCH);
  return Promise.all(files.map((file) => saveImageAsset(file, noteId)));
}

export async function resolveAssetUrl(assetId: string): Promise<string> {
  if (runningInTauri()) {
    const filePath = await invokeCommand<string>("resolve_asset_url", { assetId });
    return withAssetMarker(convertFileSrc(filePath), assetId);
  }

  return devAssetUrls.get(assetId) ?? `edgenotes://asset/${assetId}`;
}

export async function listAssets(noteId: string): Promise<AssetRecord[]> {
  if (runningInTauri()) {
    return invokeCommand<AssetRecord[]>("list_assets", { noteId });
  }

  return [];
}

export function imageMarkdown(asset: SavedAsset): string {
  return `![${asset.fileName}](${asset.markdownUrl})`;
}
