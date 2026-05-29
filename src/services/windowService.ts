import { invokeCommand, runningInTauri } from "./tauri";

interface WindowSize {
  width: number;
  height: number;
}

export const WINDOW_SIZE = {
  collapsed: {
    width: 260,
    height: 40,
  },
  expanded: {
    width: 860,
    height: 620,
  },
} as const;

let currentWindowSize: WindowSize = WINDOW_SIZE.collapsed;

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

export async function setTopCenter(width: number, height: number) {
  currentWindowSize = { width, height };

  if (!runningInTauri()) {
    return;
  }

  await invokeCommand<void>("set_window_top_center", { width, height });
}

export async function animateTopCenter(target: WindowSize, duration = 170) {
  if (!runningInTauri()) {
    currentWindowSize = target;
    return;
  }

  const start = currentWindowSize;
  const steps = Math.max(4, Math.round(duration / 16));

  for (let step = 1; step <= steps; step += 1) {
    const progress = easeOutCubic(step / steps);
    const width = Math.round(start.width + (target.width - start.width) * progress);
    const height = Math.round(start.height + (target.height - start.height) * progress);
    await setTopCenter(width, height);
  }

  currentWindowSize = target;
}
