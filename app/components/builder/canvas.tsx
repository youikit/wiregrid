"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type DragEvent,
  type MouseEvent as RMouseEvent,
} from "react";
import { useBuilder } from "./builder-context";
import { DRAG_MIME, type WireSection } from "./types";

/* ================================================================
   Canvas — FigJam-style dot-grid canvas with a centered artboard.
   Sections stack vertically inside the artboard; columns inside
   each section follow a 12-column CSS grid. Column widths can
   be resized by dragging the right-edge handle.
   ================================================================ */

export default function Canvas() {
  const { state, dispatch } = useBuilder();
  const canvasRef = useRef<HTMLDivElement>(null);

  /* ── drop zone tracking ── */
  const [activeDropIdx, setActiveDropIdx] = useState<number | null>(null);
  const [activeColTarget, setActiveColTarget] = useState<string | null>(null);

  /* ── resize ref (lives outside React re-renders) ── */
  const resizingRef = useRef<{
    sectionId: string;
    columnId: string;
    startX: number;
    startSpan: number;
    sectionWidth: number;
    precedingSpan: number;
    maxSpan: number;
  } | null>(null);

  /* ── Ctrl+Wheel zoom ── */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        dispatch({ type: "SET_ZOOM", payload: state.zoom + delta });
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [state.zoom, dispatch]);

  /* ──────────────────────────────────────────
     Section drop handling (between sections)
     ────────────────────────────────────────── */
  const onDropZoneDragOver = useCallback(
    (e: DragEvent, idx: number) => {
      if (!e.dataTransfer.types.includes(DRAG_MIME.section)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setActiveDropIdx(idx);
    },
    []
  );

  const onDropZoneDrop = useCallback(
    (e: DragEvent, idx: number) => {
      e.preventDefault();
      if (e.dataTransfer.getData(DRAG_MIME.section)) {
        dispatch({ type: "ADD_SECTION", payload: { insertIndex: idx } });
      }
      setActiveDropIdx(null);
    },
    [dispatch]
  );

  /* ──────────────────────────────────────────
     Column drop handling (into a section)
     ────────────────────────────────────────── */
  const onSectionDragOver = useCallback(
    (e: DragEvent, sectionId: string) => {
      const isCol = e.dataTransfer.types.includes(DRAG_MIME.column);
      const isSec = e.dataTransfer.types.includes(DRAG_MIME.section);
      if (!isCol && !isSec) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (isCol) setActiveColTarget(sectionId);
    },
    []
  );

  const onSectionDragLeave = useCallback((e: DragEvent) => {
    // We can safely clear the active column target
    setActiveColTarget(null);
  }, []);

  const onSectionDrop = useCallback(
    (e: DragEvent, sectionId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.getData(DRAG_MIME.column)) {
        dispatch({ type: "ADD_COLUMN", payload: { sectionId } });
      } else if (e.dataTransfer.getData(DRAG_MIME.section)) {
        const idx = state.sections.findIndex((s) => s.id === sectionId);
        dispatch({ type: "ADD_SECTION", payload: { insertIndex: idx + 1 } });
      }
      setActiveColTarget(null);
      setActiveDropIdx(null);
    },
    [dispatch, state.sections]
  );

  /* ──────────────────────────────────────────
     Column resize (mousedown → mousemove → mouseup)
     ────────────────────────────────────────── */
  const startResize = useCallback(
    (e: RMouseEvent, sectionId: string, rowId: string, columnId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const sectionEl = (e.currentTarget as HTMLElement).closest(
        "[data-section]"
      ) as HTMLElement | null;
      if (!sectionEl) return;

      const section = state.sections.find((s) => s.id === sectionId);
      if (!section) return;

      const row = section.rows.find((r) => r.id === rowId);
      if (!row) return;

      const colIdx = row.columns.findIndex((c) => c.id === columnId);
      if (colIdx === -1) return;

      const precedingSpan = row.columns
        .slice(0, colIdx)
        .reduce((s, c) => s + c.span, 0);
      const followingSpan = row.columns
        .slice(colIdx + 1)
        .reduce((s, c) => s + c.span, 0);

      resizingRef.current = {
        sectionId,
        rowId,
        columnId,
        startX: e.clientX,
        startSpan: row.columns[colIdx].span,
        sectionWidth: sectionEl.getBoundingClientRect().width,
        precedingSpan,
        maxSpan: 12 - precedingSpan - followingSpan,
      };

      const onMove = (me: globalThis.MouseEvent) => {
        const r = resizingRef.current;
        if (!r) return;
        const gridUnit = r.sectionWidth / 12;
        const delta = me.clientX - r.startX;
        const spanDelta = Math.round(delta / gridUnit);
        const newSpan = Math.max(
          1,
          Math.min(r.maxSpan, r.startSpan + spanDelta)
        );
        dispatch({
          type: "RESIZE_COLUMN",
          // @ts-ignore
          payload: { sectionId: r.sectionId, rowId: r.rowId, columnId: r.columnId, span: newSpan },
        });
      };

      const onUp = () => {
        resizingRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [state.sections, dispatch]
  );

  /* ──────────────────────────────────────────
     Render helpers
     ────────────────────────────────────────── */

  /** Thin horizontal drop zone between sections */
  const DropZone = ({ index }: { index: number }) => {
    const active = activeDropIdx === index;
    return (
      <div
        className={`transition-all duration-200 rounded-lg ${
          active ? "h-16 my-1" : "h-3 my-0"
        }`}
        onDragOver={(e) => onDropZoneDragOver(e, index)}
        onDragLeave={() => setActiveDropIdx(null)}
        onDrop={(e) => onDropZoneDrop(e, index)}
      >
        {active && (
          <div className="h-full border-2 border-dashed border-blue-400 rounded-lg bg-blue-50/60 flex items-center justify-center drop-pulse">
            <span className="text-xs text-blue-500 font-medium">
              Drop section here
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (section: WireSection, index: number) => {
    const isSelected = state.selectedSectionId === section.id;
    const isTarget = activeColTarget === section.id;
    
    // Calculate total columns and used span across all rows for display purposes
    const totalColumns = section.rows.reduce((acc, row) => acc + row.columns.length, 0);
    const totalUsedSpan = section.rows.reduce((acc, row) => acc + row.columns.reduce((s, c) => s + c.span, 0), 0);

    return (
      <div
        key={section.id}
        data-section={section.id}
        className={`section-block relative rounded-xl border-2 p-4 mb-4 fade-in transition-colors ${
          isTarget
            ? "border-blue-400 bg-blue-50/40"
            : isSelected
            ? "border-blue-300 bg-blue-50/20"
            : "border-slate-200 bg-white/80"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          dispatch({ type: "SELECT_SECTION", payload: section.id });
        }}
        onDragOver={(e) => onSectionDragOver(e, section.id)}
        onDragLeave={onSectionDragLeave}
        onDrop={(e) => onSectionDrop(e, section.id)}
      >
        {/* Section header bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-blue-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Section {index + 1}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="col-span-badge bg-blue-50 text-blue-500 border border-blue-100">
              {section.rows.length} row{section.rows.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({
                  type: "REMOVE_SECTION",
                  payload: { sectionId: section.id },
                });
              }}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Rows container */}
        <div className="flex flex-col gap-4">
          {section.rows.map((row) => {
            const usedSpan = row.columns.reduce((s, c) => s + c.span, 0);

            return (
              <div key={row.id} className="grid grid-cols-12 gap-0 min-h-[88px] relative">
                {row.columns.map((col) => {
                  const isColSelected = state.selectedColumnId === col.id;
                  return (
                    <div
                      key={col.id}
                      className="relative group"
                      style={{ gridColumn: `span ${col.span}` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({
                          type: "SELECT_SECTION",
                          payload: section.id,
                        });
                        dispatch({
                          type: "SELECT_COLUMN",
                          payload: col.id,
                        });
                      }}
                    >
                      <div
                        className={`h-full min-h-[88px] rounded-lg border-2 mx-0.5 flex flex-col items-center justify-center transition-all ${
                          isColSelected
                            ? "border-blue-500 bg-blue-100/70 shadow-sm shadow-blue-500/10"
                            : "border-blue-200/50 bg-gradient-to-b from-blue-50/60 to-blue-50/30 hover:border-blue-300 hover:bg-blue-50/70"
                        }`}
                      >
                        <span className="text-base font-bold text-blue-600">
                          {col.span}
                        </span>
                        <span className="text-[10px] text-blue-400 font-medium mt-0.5">
                          / 12 col
                        </span>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({
                            type: "REMOVE_COLUMN",
                            payload: {
                              sectionId: section.id,
                              rowId: row.id,
                              columnId: col.id,
                            },
                          });
                        }}
                        className="absolute -top-1.5 -right-0.5 w-5 h-5 rounded-full bg-red-400 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 shadow-sm"
                      >
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 8 8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <path d="M2 2l4 4M6 2l-4 4" />
                        </svg>
                      </button>

                      {/* Resize handle */}
                      <div
                        className="resize-handle"
                        onMouseDown={(e) =>
                          startResize(e, section.id, row.id, col.id)
                        }
                      />
                    </div>
                  );
                })}

                {/* Remaining span placeholder */}
                {usedSpan < 12 && row.columns.length > 0 && (
                  <div
                    className="flex items-center justify-center min-h-[88px] border-2 border-dashed border-slate-200/80 rounded-lg mx-0.5 text-slate-300"
                    style={{ gridColumn: `span ${12 - usedSpan}` }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        opacity="0.5"
                      >
                        <line x1="8" y1="4" x2="8" y2="12" />
                        <line x1="4" y1="8" x2="12" y2="8" />
                      </svg>
                      <span className="text-[10px]">
                        {12 - usedSpan} col left
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Full empty section placeholder */}
          {section.rows.length === 0 && (
            <div className="col-span-12 flex items-center justify-center min-h-[88px] border-2 border-dashed border-blue-200 rounded-lg mx-0.5 text-blue-300 shimmer">
              <div className="flex flex-col items-center gap-1.5">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <rect x="3" y="4" width="5" height="16" rx="1.5" />
                  <rect x="10" y="4" width="5" height="16" rx="1.5" />
                  <rect x="17" y="4" width="5" height="16" rx="1.5" />
                </svg>
                <span className="text-xs font-medium">
                  Drag columns here
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── main render ── */
  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-auto canvas-scroll canvas-dots relative"
      onClick={() => {
        dispatch({ type: "SELECT_SECTION", payload: null });
        dispatch({ type: "SELECT_COLUMN", payload: null });
      }}
    >
      {/* Scrollable canvas area */}
      <div
        className="flex justify-center"
        style={{
          minHeight: "100%",
          padding: "48px 80px 120px",
        }}
      >
        {/* Artboard */}
        <div
          className="relative bg-white rounded-2xl border border-slate-200/60"
          style={{
            width: 1200,
            minHeight: 600,
            transform: `scale(${state.zoom})`,
            transformOrigin: "top center",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.04), 0 8px 40px rgba(0,0,0,0.04)",
          }}
        >
          {/* Grid overlay */}
          {state.showGrid && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="grid-overlay">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="grid-overlay-col" />
                ))}
              </div>
            </div>
          )}

          {/* Artboard content */}
          <div className="relative z-10 p-8">
            <DropZone index={0} />

            {state.sections.map((section, idx) => (
              <React.Fragment key={section.id}>
                {renderSection(section, idx)}
                <DropZone index={idx + 1} />
              </React.Fragment>
            ))}

            {/* Empty canvas CTA */}
            {state.sections.length === 0 && (
              <div
                className="flex flex-col items-center justify-center py-36 pulse-border border-2 border-dashed rounded-2xl transition-colors"
                onDragOver={(e) => {
                  if (
                    e.dataTransfer.types.includes(DRAG_MIME.section)
                  ) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    setActiveDropIdx(0);
                  }
                }}
                onDragLeave={() => setActiveDropIdx(null)}
                onDrop={(e) => onDropZoneDrop(e, 0)}
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-5 shadow-sm shadow-blue-500/5">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 36 36"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                  >
                    <rect x="4" y="6" width="28" height="10" rx="3" />
                    <rect x="4" y="20" width="28" height="10" rx="3" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  Drag a section from the sidebar
                </p>
                <p className="text-xs text-slate-400 mt-1.5 max-w-[260px] text-center leading-relaxed">
                  Start building your wireframe layout by adding sections and
                  arranging columns on a 12-column grid
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
