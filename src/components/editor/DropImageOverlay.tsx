import { ImagePlus } from "lucide-react";

export function DropImageOverlay() {
  return (
    <div className="drop-image-overlay">
      <ImagePlus aria-hidden size={30} />
      <span>松开以添加图片</span>
    </div>
  );
}
