export interface WireElement {
  id: string;
  x: number; // pixels
  y: number; // pixels
  w: number; // pixels
  h: number; // pixels
}

export interface WireSection {
  id: string;
  name?: string; // Optional custom name
  h: number; // height of the section block (in pixels)
  elements: WireElement[];
}

export type DragItemType = "section" | "element";

/** MIME types used in HTML5 drag-and-drop dataTransfer */
export const DRAG_MIME = {
  section: "application/wiregrid-section",
  element: "application/wiregrid-element",
} as const;
