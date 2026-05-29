import { create } from "zustand";

import type { DrawerState } from "../types/editor";
import { animateTopCenter, WINDOW_SIZE } from "../services/windowService";

interface UIStore {
  drawerState: DrawerState;
  isDraggingImage: boolean;
  isEditorFocused: boolean;
  expand: () => Promise<void>;
  collapse: (force?: boolean) => Promise<void>;
  lockEditing: () => void;
  unlockEditing: () => void;
  setDraggingImage: (value: boolean) => void;
}

const ENTER_MS = 170;
const EXIT_MS = 130;

let transitionId = 0;

const sleep = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

export const useUIStore = create<UIStore>((set, get) => ({
  drawerState: "collapsed",
  isDraggingImage: false,
  isEditorFocused: false,

  async expand() {
    const state = get().drawerState;
    if (state === "expanded" || state === "editing" || state === "expanding") {
      return;
    }

    const id = (transitionId += 1);
    set({ drawerState: "expanding" });
    await Promise.all([animateTopCenter(WINDOW_SIZE.expanded, ENTER_MS), sleep(ENTER_MS)]);
    if (id !== transitionId) {
      return;
    }

    set({ drawerState: get().isEditorFocused ? "editing" : "expanded" });
  },

  async collapse(force = false) {
    const state = get().drawerState;
    if (state === "collapsed" || state === "collapsing") {
      return;
    }

    if (!force && get().isEditorFocused) {
      return;
    }

    const id = (transitionId += 1);
    set({ drawerState: "collapsing", isDraggingImage: false, isEditorFocused: false });
    await Promise.all([animateTopCenter(WINDOW_SIZE.collapsed, EXIT_MS), sleep(EXIT_MS)]);
    if (id !== transitionId) {
      return;
    }

    set({ drawerState: "collapsed" });
  },

  lockEditing() {
    transitionId += 1;
    set({ drawerState: "editing", isEditorFocused: true });
  },

  unlockEditing() {
    set({ drawerState: "expanded", isEditorFocused: false });
  },

  setDraggingImage(value: boolean) {
    set({ isDraggingImage: value });
  },
}));
