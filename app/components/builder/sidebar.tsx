"use client";

import React, { type DragEvent } from "react";
import { useBuilder } from "./builder-context";
import { DRAG_MIME } from "./types";

/* ─── Icon Components ─── */
function SectionIcon() {
  return (
    <svg
      width="40"
      height="28"
      viewBox="0 0 40 28"
      fill="none"
      className="text-blue-500"
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="26"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      <rect
        x="5"
        y="5"
        width="30"
        height="4"
        rx="1.5"
        fill="currentColor"
        opacity="0.2"
      />
      <rect
        x="5"
        y="12"
        width="30"
        height="4"
        rx="1.5"
        fill="currentColor"
        opacity="0.12"
      />
      <rect
        x="5"
        y="19"
        width="18"
        height="4"
        rx="1.5"
        fill="currentColor"
        opacity="0.08"
      />
    </svg>
  );
}

function ColumnIcon() {
  return (
    <svg
      width="40"
      height="28"
      viewBox="0 0 40 28"
      fill="none"
      className="text-blue-500"
    >
      <rect
        x="2"
        y="2"
        width="10"
        height="24"
        rx="2.5"
        fill="currentColor"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect
        x="15"
        y="2"
        width="10"
        height="24"
        rx="2.5"
        fill="currentColor"
        opacity="0.14"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect
        x="28"
        y="2"
        width="10"
        height="24"
        rx="2.5"
        fill="currentColor"
        opacity="0.08"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

/* ─── Sidebar ─── */
export default function Sidebar() {
  const { state, dispatch } = useBuilder();

  /* ── drag start handlers ── */
  const onDragStartSection = (e: DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME.section, "section");
    e.dataTransfer.effectAllowed = "copy";
  };

  const onDragStartColumn = (e: DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME.column, "column");
    e.dataTransfer.effectAllowed = "copy";
  };

  const selectedSection = state.sections.find(
    (s) => s.id === state.selectedSectionId
  );
  let selectedColumn = null;
  let selectedRow = null;
  if (selectedSection && state.selectedColumnId) {
    for (const row of selectedSection.rows) {
      const col = row.columns.find((c) => c.id === state.selectedColumnId);
      if (col) {
        selectedColumn = col;
        selectedRow = row;
        break;
      }
    }
  }

  return (
    <aside className="w-[260px] bg-white border-r border-slate-200/60 flex flex-col shrink-0 overflow-hidden">
      {/* ── header ── */}
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Components
        </h2>
      </div>

      {/* ── draggable items ── */}
      <div className="px-4 space-y-3">
        {/* Section */}
        <div
          draggable
          onDragStart={onDragStartSection}
          className="sidebar-drag-item p-4 rounded-xl border-2 border-slate-200/80 bg-gradient-to-br from-blue-50/50 to-white hover:from-blue-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <SectionIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Section</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Horizontal container for columns
              </p>
            </div>
          </div>
        </div>

        {/* Column */}
        <div
          draggable
          onDragStart={onDragStartColumn}
          className="sidebar-drag-item p-4 rounded-xl border-2 border-slate-200/80 bg-gradient-to-br from-blue-50/50 to-white hover:from-blue-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <ColumnIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Column</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Adjustable 1–12 grid span
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── separator ── */}
      <div className="mx-5 my-5 h-px bg-slate-100" />

      {/* ── Properties Panel ── */}
      <div className="px-5 flex-1 overflow-y-auto">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Properties
        </h2>

        {!selectedSection && !selectedColumn && (
          <p className="text-xs text-slate-300 italic">
            Select an element on the canvas
          </p>
        )}

        {/* Section properties */}
        {selectedSection && !selectedColumn && (
          <div className="space-y-3 fade-in">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Section
              </p>
              <p className="text-xs font-medium text-slate-600">
                {selectedSection.rows.length} row{selectedSection.rows.length !== 1 ? "s" : ""} •{" "}
                {selectedSection.rows.reduce((acc, row) => acc + row.columns.length, 0)} col{selectedSection.rows.reduce((acc, row) => acc + row.columns.length, 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() =>
                dispatch({
                  type: "REMOVE_SECTION",
                  payload: { sectionId: selectedSection.id },
                })
              }
              className="w-full py-2 px-3 rounded-lg bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors"
            >
              Remove Section
            </button>
          </div>
        )}

        {/* Column properties */}
        {selectedSection && selectedColumn && (
          <div className="space-y-3 fade-in">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                Column Span
              </p>
              {/* Span controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedColumn && selectedRow && selectedSection && selectedColumn.span > 1) {
                      dispatch({
                        type: "RESIZE_COLUMN",
                        payload: {
                          sectionId: selectedSection.id,
                          rowId: selectedRow.id,
                          columnId: selectedColumn.id,
                          span: selectedColumn.span - 1,
                        },
                      });
                    }
                  }}
                  disabled={selectedColumn!.span <= 1}
                  className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <span className="text-lg font-bold text-blue-600">
                    {selectedColumn!.span}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/ 12</span>
                </div>
                <button
                  onClick={() => {
                    if (!selectedRow || !selectedSection || !selectedColumn) return;
                    const used = selectedRow.columns.reduce(
                      (s, c) => s + c.span,
                      0
                    );
                    const maxSpan =
                      12 - used + selectedColumn.span;
                    if (selectedColumn.span < maxSpan) {
                      dispatch({
                        type: "RESIZE_COLUMN",
                        payload: {
                          sectionId: selectedSection.id,
                          rowId: selectedRow.id,
                          columnId: selectedColumn.id,
                          span: selectedColumn.span + 1,
                        },
                      });
                    }
                  }}
                  disabled={(() => {
                    if (!selectedRow || !selectedColumn) return true;
                    const used = selectedRow.columns.reduce(
                      (s, c) => s + c.span,
                      0
                    );
                    return selectedColumn.span >= 12 - used + selectedColumn.span;
                  })()}
                  className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all"
                >
                  +
                </button>
              </div>

              {/* Visual span bar */}
              <div className="mt-3 grid grid-cols-12 gap-0.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-sm transition-colors ${
                      i < selectedColumn.span
                        ? "bg-blue-500"
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Width percentage */}
            <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
              <p className="text-[10px] uppercase tracking-wider text-blue-400 mb-1">
                Width
              </p>
              <p className="text-sm font-semibold text-blue-600">
                {((selectedColumn.span / 12) * 100).toFixed(1)}%
              </p>
            </div>

            <button
              onClick={() =>
                dispatch({
                  type: "REMOVE_COLUMN",
                  payload: {
                    sectionId: selectedSection.id,
                    rowId: selectedRow!.id,
                    columnId: selectedColumn.id,
                  },
                })
              }
              className="w-full py-2 px-3 rounded-lg bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors"
            >
              Remove Column
            </button>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-4 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-300">
          WireGrid v1.0 — 12-col layout builder
        </p>
      </div>
    </aside>
  );
}
