"use client";

import React, { type DragEvent } from "react";
import { useBuilder } from "./builder-context";
import { DRAG_MIME } from "./types";

/* ─── Icon Component ─── */
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
    </svg>
  );
}

function ElementIcon() {
  return (
    <svg
      width="40"
      height="28"
      viewBox="0 0 40 28"
      fill="none"
      className="text-blue-500"
    >
      <rect
        x="6"
        y="4"
        width="28"
        height="20"
        rx="3"
        fill="currentColor"
        opacity="0.1"
        stroke="currentColor"
        strokeWidth="1.5"
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

  const onDragStartElement = (e: DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME.element, "element");
    e.dataTransfer.effectAllowed = "copy";
  };

  const selectedSection = state.selectedSectionId
    ? state.sections.find((s) => s.id === state.selectedSectionId) ?? null
    : null;

  const selectedElement = selectedSection && state.selectedElementId
    ? selectedSection.elements.find((el) => el.id === state.selectedElementId) ?? null
    : null;

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
                Vertical block container
              </p>
            </div>
          </div>
        </div>

        {/* Element */}
        <div
          draggable
          onDragStart={onDragStartElement}
          className="sidebar-drag-item p-4 rounded-xl border-2 border-slate-200/80 bg-gradient-to-br from-blue-50/50 to-white hover:from-blue-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <ElementIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Block</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Drag into a section
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

        {!selectedSection && !selectedElement && (
          <p className="text-xs text-slate-300 italic">
            Select an element on the canvas
          </p>
        )}

        {/* Section properteis */}
        {selectedSection && !selectedElement && (
          <div className="space-y-3 fade-in">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Section Name
                </p>
                <input
                  type="text"
                  value={selectedSection.name || ""}
                  placeholder="e.g. Hero Section"
                  onChange={(e) =>
                    dispatch({
                      type: "RENAME_SECTION",
                      payload: { sectionId: selectedSection.id, name: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Statistics
                </p>
                <p className="text-xs font-medium text-slate-600 mb-2">
                  {selectedSection.elements.length} element{selectedSection.elements.length !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Height
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-slate-600">
                    {selectedSection.h}
                  </span>
                  <span className="text-[10px] text-slate-400">px</span>
                </div>
              </div>
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

        {/* Element Properties */}
        {selectedSection && selectedElement && (
          <div className="space-y-3 fade-in">
            {/* Position */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  X Position
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-slate-600">
                    {selectedElement.x}
                  </span>
                  <span className="text-[10px] text-slate-400">px</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Y Position
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-slate-600">
                    {selectedElement.y}
                  </span>
                  <span className="text-[10px] text-slate-400">px</span>
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Width
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-slate-600">
                    {selectedElement.w}
                  </span>
                  <span className="text-[10px] text-slate-400">px</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Height
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-slate-600">
                    {selectedElement.h}
                  </span>
                  <span className="text-[10px] text-slate-400">px</span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                dispatch({
                  type: "REMOVE_ELEMENT",
                  payload: {
                    sectionId: selectedSection.id,
                    elementId: selectedElement.id,
                  },
                })
              }
              className="w-full py-2 px-3 rounded-lg bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors mt-2"
            >
              Remove Block
            </button>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-4 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-300">
          WireGrid v2.5 — Sectioned Canvas
        </p>
      </div>
    </aside>
  );
}
