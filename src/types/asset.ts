export interface SavedAsset {
  id: string;
  noteId: string;
  fileName: string;
  mimeType: string;
  size: number;
  markdownUrl: string;
  previewUrl: string;
}

export interface AssetRecord extends SavedAsset {
  type: "image";
  filePath: string;
  createdAt: number;
  orphaned: boolean;
}
