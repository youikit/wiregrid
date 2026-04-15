"use client";

import React from "react";
import { useBuilder } from "./builder-context";

export default function Navbar() {
  const { state, dispatch } = useBuilder();
  const pct = Math.round(state.zoom * 100);

  return (
    <header className="glass-nav h-14 border-b border-slate-200/60 flex items-center justify-between px-5 shrink-0 z-50 relative">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-500/20">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="11" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="11" width="5" height="5" rx="1" />
            <rect x="11" y="11" width="5" height="5" rx="1" />
          </svg>
        </div>
        <span className="text-base font-bold tracking-tight text-slate-800">
          Wire<span className="text-blue-600">Grid</span>
        </span>
      </div>

      {/* Center — toolbar */}
      <div className="flex items-center gap-1 bg-slate-100/80 rounded-lg px-1 py-1">
        {/* Grid toggle */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_GRID" })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            state.showGrid
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
          title="Toggle 12-column grid"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          >
            <rect x="1" y="1" width="12" height="12" rx="1.5" />
            <line x1="5" y1="1" x2="5" y2="13" />
            <line x1="9" y1="1" x2="9" y2="13" />
            <line x1="1" y1="5" x2="13" y2="5" />
            <line x1="1" y1="9" x2="13" y2="9" />
          </svg>
          Grid
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Zoom controls */}
        <button
          onClick={() =>
            dispatch({ type: "SET_ZOOM", payload: state.zoom - 0.1 })
          }
          disabled={state.zoom <= 0.5}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-white/60 transition-all disabled:opacity-30"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <line x1="2" y1="6" x2="10" y2="6" />
          </svg>
        </button>

        <button
          onClick={() => dispatch({ type: "SET_ZOOM", payload: 1 })}
          className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors min-w-[44px] text-center"
        >
          {pct}%
        </button>

        <button
          onClick={() =>
            dispatch({ type: "SET_ZOOM", payload: state.zoom + 0.1 })
          }
          disabled={state.zoom >= 2}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-white/60 transition-all disabled:opacity-30"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <line x1="6" y1="2" x2="6" y2="10" />
            <line x1="2" y1="6" x2="10" y2="6" />
          </svg>
        </button>
      </div>

      {/* Right — info */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">
          {state.sections.length} section
          {state.sections.length !== 1 ? "s" : ""} •{" "}
          {state.sections.reduce((s, sec) => s + sec.rows.reduce((rs, row) => rs + row.columns.length, 0), 0)} column
          {state.sections.reduce((s, sec) => s + sec.rows.reduce((rs, row) => rs + row.columns.length, 0), 0) !== 1
            ? "s"
            : ""}
        </span>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
          W
        </div>
      </div>
    </header>
  );
}
