export type DrawerState =
  | "collapsed"
  | "expanding"
  | "expanded"
  | "editing"
  | "collapsing";

export type SaveStatus = "idle" | "editing" | "saving" | "saved" | "error";
