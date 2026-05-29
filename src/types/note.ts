export interface Note {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  deleted: boolean;
}

export type NoteSummary = Pick<
  Note,
  "id" | "title" | "excerpt" | "createdAt" | "updatedAt" | "pinned"
>;
