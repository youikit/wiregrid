"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type { WireElement, WireSection } from "./types";

/* ─── State shape ─── */
export interface BuilderState {
  sections: WireSection[];
  showGrid: boolean;
  zoom: number;
  selectedSectionId: string | null;
  selectedElementId: string | null;
}

/* ─── Actions ─── */
export type BuilderAction =
  | { type: "ADD_SECTION"; payload?: { insertIndex?: number } }
  | { type: "REMOVE_SECTION"; payload: { sectionId: string } }
  | { type: "RENAME_SECTION"; payload: { sectionId: string; name: string } }
  | { type: "RESIZE_SECTION"; payload: { sectionId: string; height: number } }
  | { type: "ADD_ELEMENT"; payload: { sectionId: string; x: number; y: number; w?: number; h?: number } }
  | { type: "REMOVE_ELEMENT"; payload: { sectionId: string; elementId: string } }
  | { type: "UPDATE_BOUNDS"; payload: { sectionId: string; elementId: string; x: number; y: number; w: number; h: number } }
  | { type: "TOGGLE_GRID" }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "SELECT_SECTION"; payload: string | null }
  | { type: "SELECT_ELEMENT"; payload: string | null };

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
      const newSection: WireSection = { id: uid(), h: 400, elements: [] };
      const sections = [...state.sections];
      const idx = action.payload?.insertIndex;
      if (idx !== undefined) {
        sections.splice(idx, 0, newSection);
      } else {
        sections.push(newSection);
      }
      return { ...state, sections, selectedSectionId: newSection.id, selectedElementId: null };
    }

    case "REMOVE_SECTION":
      return {
        ...state,
        sections: state.sections.filter((s) => s.id !== action.payload.sectionId),
        selectedSectionId: state.selectedSectionId === action.payload.sectionId ? null : state.selectedSectionId,
      };

    case "RENAME_SECTION":
      return {
        ...state,
        sections: state.sections.map((sec) =>
          sec.id === action.payload.sectionId ? { ...sec, name: action.payload.name } : sec
        )
      };

    case "RESIZE_SECTION":
      return {
        ...state,
        sections: state.sections.map((sec) => 
          sec.id === action.payload.sectionId ? { ...sec, h: Math.max(100, action.payload.height) } : sec
        )
      };

    case "ADD_ELEMENT": {
      return {
        ...state,
        sections: state.sections.map((sec) => {
          if (sec.id !== action.payload.sectionId) return sec;
          const newElement: WireElement = {
            id: uid(),
            x: action.payload.x,
            y: action.payload.y,
            w: action.payload.w || 352,
            h: action.payload.h || 120,
          };
          return { ...sec, elements: [...sec.elements, newElement] };
        }),
      };
    }

    case "REMOVE_ELEMENT":
      return {
        ...state,
        sections: state.sections.map((sec) => {
          if (sec.id !== action.payload.sectionId) return sec;
          return { ...sec, elements: sec.elements.filter((e) => e.id !== action.payload.elementId) };
        }),
        selectedElementId: state.selectedElementId === action.payload.elementId ? null : state.selectedElementId,
      };

    case "UPDATE_BOUNDS":
      return {
        ...state,
        sections: state.sections.map((sec) => {
          if (sec.id !== action.payload.sectionId) return sec;
          return {
            ...sec,
            elements: sec.elements.map((el) => {
              if (el.id !== action.payload.elementId) return el;
              return {
                ...el,
                x: action.payload.x,
                y: action.payload.y,
                w: Math.max(24, action.payload.w),
                h: Math.max(24, action.payload.h),
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
        selectedElementId: null,
      };

    case "SELECT_ELEMENT":
      return {
        ...state,
        selectedElementId: action.payload,
      };

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
  selectedElementId: null,
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
