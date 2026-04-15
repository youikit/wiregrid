export interface WireColumn {
  id: string;
  span: number; // 1–12
}

export interface WireRow {
  id: string;
  columns: WireColumn[];
}

export interface WireSection {
  id: string;
  rows: WireRow[];
}

export type DragItemType = "section" | "column";

/** MIME types used in HTML5 drag-and-drop dataTransfer */
export const DRAG_MIME = {
  section: "application/wiregrid-section",
  column: "application/wiregrid-column",
} as const;
