"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type { WireSection, WireColumn } from "./types";

/* ─── State shape ─── */
export interface BuilderState {
  sections: WireSection[];
  showGrid: boolean;
  zoom: number;
  selectedSectionId: string | null;
  selectedColumnId: string | null;
}

/* ─── Actions ─── */
export type BuilderAction =
  | { type: "ADD_SECTION"; payload?: { insertIndex?: number } }
  | { type: "REMOVE_SECTION"; payload: { sectionId: string } }
  | { type: "ADD_COLUMN"; payload: { sectionId: string; span?: number; targetRowId?: string } }
  | {
      type: "REMOVE_COLUMN";
      payload: { sectionId: string; rowId: string; columnId: string };
    }
  | {
      type: "RESIZE_COLUMN";
      payload: { sectionId: string; rowId: string; columnId: string; span: number };
    }
  | { type: "TOGGLE_GRID" }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "SELECT_SECTION"; payload: string | null }
  | { type: "SELECT_COLUMN"; payload: string | null };

/* ─── Helpers ─── */
let counter = 0;
function uid(): string {
  return `wg-${Date.now()}-${++counter}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/* ─── Reducer ─── */
function builderReducer(
  state: BuilderState,
  action: BuilderAction
): BuilderState {
  switch (action.type) {
    case "ADD_SECTION": {
      const newSection: WireSection = { id: uid(), rows: [] };
      const sections = [...state.sections];
      const idx = action.payload?.insertIndex;
      if (idx !== undefined) {
        sections.splice(idx, 0, newSection);
      } else {
        sections.push(newSection);
      }
      return { ...state, sections, selectedSectionId: newSection.id };
    }

    case "REMOVE_SECTION":
      return {
        ...state,
        sections: state.sections.filter(
          (s) => s.id !== action.payload.sectionId
        ),
        selectedSectionId:
          state.selectedSectionId === action.payload.sectionId
            ? null
            : state.selectedSectionId,
      };

    case "ADD_COLUMN":
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id !== action.payload.sectionId) return section;

          const spanToAdd = action.payload.span ?? 3;
          let newRows = [...section.rows];
          
          let targetRow = action.payload.targetRowId ? newRows.find(r => r.id === action.payload.targetRowId) : newRows[newRows.length - 1];

          const used = targetRow ? targetRow.columns.reduce((s, c) => s + c.span, 0) : 12;
          const remaining = 12 - used;

          if (!targetRow || remaining <= 0) {
            // Must create a new row
            const newRow = { id: uid(), columns: [{ id: uid(), span: spanToAdd }] };
            newRows.push(newRow);
          } else {
            // Append to target row
            const actualSpan = Math.min(spanToAdd, remaining);
            const col = { id: uid(), span: actualSpan };
            const rowIndex = newRows.findIndex(r => r.id === targetRow.id);
            newRows[rowIndex] = { ...targetRow, columns: [...targetRow.columns, col] };
          }
          return { ...section, rows: newRows };
        }),
      };

    case "REMOVE_COLUMN":
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id !== action.payload.sectionId) return section;
          const newRows = section.rows.map(row => {
            if (row.id !== action.payload.rowId) return row;
            return {
              ...row,
              columns: row.columns.filter(c => c.id !== action.payload.columnId)
            };
          }).filter(row => row.columns.length > 0);
          return { ...section, rows: newRows };
        }),
        selectedColumnId:
          state.selectedColumnId === action.payload.columnId
            ? null
            : state.selectedColumnId,
      };

    case "RESIZE_COLUMN":
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id !== action.payload.sectionId) return section;
          return {
            ...section,
            rows: section.rows.map((row) => {
              if (row.id !== action.payload.rowId) return row;
              return {
                ...row,
                columns: row.columns.map((col) => {
                  if (col.id !== action.payload.columnId) return col;
                  return {
                    ...col,
                    span: Math.max(1, Math.min(12, action.payload.span)),
                  };
                }),
              };
            }),
          };
        }),
      };

    case "TOGGLE_GRID":
      return { ...state, showGrid: !state.showGrid };

    case "SET_ZOOM":
      return {
        ...state,
        zoom: Math.max(0.5, Math.min(2, action.payload)),
      };

    case "SELECT_SECTION":
      return {
        ...state,
        selectedSectionId: action.payload,
        selectedColumnId: null,
      };

    case "SELECT_COLUMN":
      return { ...state, selectedColumnId: action.payload };

    default:
      return state;
  }
}

/* ─── Initial state ─── */
const initialState: BuilderState = {
  sections: [],
  showGrid: true,
  zoom: 1,
  selectedSectionId: null,
  selectedColumnId: null,
};

/* ─── Context ─── */
const BuilderCtx = createContext<{
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
} | null>(null);

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(builderReducer, initialState);
  return (
    <BuilderCtx.Provider value={{ state, dispatch }}>
      {children}
    </BuilderCtx.Provider>
  );
}

export function useBuilder() {
  const ctx = useContext(BuilderCtx);
  if (!ctx) throw new Error("useBuilder must be used inside BuilderProvider");
  return ctx;
}
