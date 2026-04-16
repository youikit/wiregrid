"use client";

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  type DragEvent,
  type MouseEvent as RMouseEvent,
} from "react";
import { useBuilder } from "./builder-context";
import { DRAG_MIME, type WireElement, type WireSection } from "./types";

const PADDING_X = 48; // Edge padding within 1200px
const COL_W = 70;     // 12 columns * 70px = 840px
const GAP_X = 24;     // 11 gaps * 24px = 264px. 840 + 264 + 96 = 1200px
const SNAP_Y = 24;

// Math helper for getting nearest column start position
function getSnappedX(rawX: number) {
  let col = Math.round((rawX - PADDING_X) / (COL_W + GAP_X));
  col = Math.max(0, Math.min(11, col));
  return PADDING_X + col * (COL_W + GAP_X);
}

// Math helper for getting nearest column span width
function getSnappedW(rawW: number) {
  let span = Math.round((rawW + GAP_X) / (COL_W + GAP_X));
  span = Math.max(1, Math.min(12, span));
  return span * COL_W + (span - 1) * GAP_X;
}

export default function Canvas() {
  const { state, dispatch } = useBuilder();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [activeDropIdx, setActiveDropIdx] = useState<number | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const actionRef = useRef<{
    type: "drag" | "resize" | "resize-section";
    sectionId: string;
    elementId?: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  /* ── Collision Helper ── */
  const isColliding = useCallback(
    (sectionId: string, id: string, testX: number, testY: number, testW: number, testH: number) => {
      const section = state.sections.find((s) => s.id === sectionId);
      if (!section) return false;
      return section.elements.some((el) => {
        if (el.id === id) return false;
        return (
          testX < el.x + el.w &&
          testX + testW > el.x &&
          testY < el.y + el.h &&
          testY + testH > el.y
        );
      });
    },
    [state.sections]
  );

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
     Artboard: Drop Sections
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
     Section: Drop Elements
     ────────────────────────────────────────── */
  const onSectionDragOver = useCallback(
    (e: DragEvent, sectionId: string) => {
      if (!e.dataTransfer.types.includes(DRAG_MIME.element)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setActiveSectionId(sectionId);
    },
    []
  );

  const onSectionDrop = useCallback(
    (e: DragEvent, sectionId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveSectionId(null);
      
      if (!e.dataTransfer.getData(DRAG_MIME.element)) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const scale = state.zoom;

      let localX = (e.clientX - rect.left) / scale;
      let localY = (e.clientY - rect.top) / scale;

      localX = getSnappedX(localX);
      localY = Math.max(0, Math.round(localY / SNAP_Y) * SNAP_Y);

      const defaultW = getSnappedW(350); // defaults to ~4 columns
      // Auto-resolve collision by pushing down
      while (isColliding(sectionId, "new", localX, localY, defaultW, SNAP_Y * 5)) {
        localY += SNAP_Y;
      }

      dispatch({
        type: "ADD_ELEMENT",
        payload: { sectionId, x: localX, y: localY },
      });
    },
    [dispatch, state.zoom, isColliding]
  );

  /* ──────────────────────────────────────────
     Section: Resize Height
     ────────────────────────────────────────── */
  const startSectionResize = useCallback(
    (e: RMouseEvent, section: WireSection) => {
      e.preventDefault();
      e.stopPropagation();

      actionRef.current = {
        type: "resize-section",
        sectionId: section.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: 0,
        origY: 0,
        origW: 0,
        origH: section.h,
      };

      const scale = state.zoom;

      const onMove = (me: globalThis.MouseEvent) => {
        const r = actionRef.current;
        if (!r) return;
        const deltaY = (me.clientY - r.startY) / scale;
        const newH = Math.max(100, Math.round((r.origH + deltaY) / SNAP_Y) * SNAP_Y);

        dispatch({
          type: "RESIZE_SECTION",
          payload: { sectionId: r.sectionId, height: newH },
        });
      };

      const onUp = () => {
        actionRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "row-resize";
    },
    [dispatch, state.zoom]
  );


  /* ──────────────────────────────────────────
     Elements: Movement Drag Handler
     ────────────────────────────────────────── */
  const startDrag = useCallback(
    (e: RMouseEvent, sectionId: string, el: WireElement) => {
      e.preventDefault();
      e.stopPropagation();

      actionRef.current = {
        type: "drag",
        sectionId,
        elementId: el.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: el.x,
        origY: el.y,
        origW: el.w,
        origH: el.h,
      };

      const scale = state.zoom;

      const onMove = (me: globalThis.MouseEvent) => {
        const r = actionRef.current;
        if (!r || !r.elementId) return;
        
        const deltaX = (me.clientX - r.startX) / scale;
        const deltaY = (me.clientY - r.startY) / scale;

        const newX = getSnappedX(r.origX + deltaX);
        const newY = Math.max(0, Math.round((r.origY + deltaY) / SNAP_Y) * SNAP_Y);

        if (!isColliding(r.sectionId, r.elementId, newX, newY, r.origW, r.origH)) {
          dispatch({
            type: "UPDATE_BOUNDS",
            payload: {
              sectionId: r.sectionId,
              elementId: r.elementId,
              x: newX,
              y: newY,
              w: r.origW,
              h: r.origH,
            },
          });
        }
      };

      const onUp = () => {
        actionRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "grabbing";
    },
    [dispatch, state.zoom, isColliding]
  );

  /* ──────────────────────────────────────────
     Elements: Resize Handler
     ────────────────────────────────────────── */
  const startResize = useCallback(
    (e: RMouseEvent, sectionId: string, el: WireElement, handle: "e" | "s" | "se") => {
      e.preventDefault();
      e.stopPropagation();

      actionRef.current = {
        type: "resize",
        sectionId,
        elementId: el.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: el.x,
        origY: el.y,
        origW: el.w,
        origH: el.h,
      };

      const scale = state.zoom;

      const onMove = (me: globalThis.MouseEvent) => {
        const r = actionRef.current;
        if (!r || !r.elementId) return;

        const deltaX = (me.clientX - r.startX) / scale;
        const deltaY = (me.clientY - r.startY) / scale;

        let newW = r.origW;
        let newH = r.origH;

        if (handle === "e" || handle === "se") {
          newW = getSnappedW(r.origW + deltaX);
          
          // Ensure width doesn't overflow 1200px container boundary
          if (r.origX + newW > 1200 - PADDING_X) {
            newW = getSnappedW(1200 - PADDING_X - r.origX);
          }
        }
        if (handle === "s" || handle === "se") {
          newH = Math.max(SNAP_Y, Math.round((r.origH + deltaY) / SNAP_Y) * SNAP_Y);
        }

        if (!isColliding(r.sectionId, r.elementId, r.origX, r.origY, newW, newH)) {
          dispatch({
            type: "UPDATE_BOUNDS",
            payload: {
              sectionId: r.sectionId,
              elementId: r.elementId,
              x: r.origX,
              y: r.origY,
              w: newW,
              h: newH,
            },
          });
        }
      };

      const onUp = () => {
        actionRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      
      if (handle === "e") document.body.style.cursor = "col-resize";
      else if (handle === "s") document.body.style.cursor = "row-resize";
      else document.body.style.cursor = "nwse-resize";
    },
    [dispatch, state.zoom, isColliding]
  );

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

  /* ──────────────────────────────────────────
     Render
     ────────────────────────────────────────── */
  const renderElement = (sectionId: string, el: WireElement) => {
    const isSelected = state.selectedElementId === el.id;
    return (
      <div
        key={el.id}
        className={`absolute rounded-lg border-2 transition-shadow shadow-sm group select-none ${
          isSelected
            ? "border-blue-500 bg-blue-100/70 shadow-blue-500/20 z-20"
            : "border-slate-300 bg-white/90 hover:border-blue-400 hover:bg-blue-50/80 z-10"
        }`}
        style={{
          left: el.x,
          top: el.y,
          width: el.w,
          height: el.h,
          cursor: "grab",
        }}
        onMouseDown={(e) => {
          dispatch({ type: "SELECT_SECTION", payload: sectionId });
          dispatch({ type: "SELECT_ELEMENT", payload: el.id });
          startDrag(e, sectionId, el);
        }}
      >
        {/* Dimensions display when selected */}
        {isSelected && (
          <span className="absolute top-2 left-2 text-[10px] font-medium text-blue-600 bg-blue-100 px-1.5 rounded opacity-80 pointer-events-none">
            {el.w} × {el.h}
          </span>
        )}

        {/* Delete Button (Visible on hover/select) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "REMOVE_ELEMENT", payload: { sectionId, elementId: el.id } });
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-50 cursor-pointer border border-white"
          title="Remove Block"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 2l6 6M8 2l-6 6" />
          </svg>
        </button>

        {/* Resize Handle - Right */}
        <div
          className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-30 group-hover:bg-blue-400/20 transition-colors"
          onMouseDown={(e) => startResize(e, sectionId, el, "e")}
        />
        {/* Resize Handle - Bottom */}
        <div
          className="absolute bottom-0 left-0 w-full h-2 cursor-row-resize z-30 group-hover:bg-blue-400/20 transition-colors"
          onMouseDown={(e) => startResize(e, sectionId, el, "s")}
        />
        {/* Resize Handle - Corner */}
        <div
          className="absolute -right-1 -bottom-1 w-4 h-4 cursor-nwse-resize z-40 bg-blue-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white shadow-sm"
          onMouseDown={(e) => startResize(e, sectionId, el, "se")}
        />
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-auto canvas-scroll bg-slate-50 relative"
      onClick={() => {
        dispatch({ type: "SELECT_SECTION", payload: null });
        dispatch({ type: "SELECT_ELEMENT", payload: null });
      }}
    >
      <div
        className="flex justify-center min-h-full"
        style={{ padding: "48px 80px 120px" }}
      >
        {/* The Artboard Center container */}
        <div
          className="relative"
          style={{
            width: 1200,
            transform: `scale(${state.zoom})`,
            transformOrigin: "top center",
          }}
        >
          <DropZone index={0} />

          {state.sections.map((section, idx) => {
            const isSelected = state.selectedSectionId === section.id;
            const isTarget = activeSectionId === section.id;

            return (
              <React.Fragment key={section.id}>
                <div
                  className={`relative w-full rounded-2xl border-2 transition-colors overflow-hidden group/section shadow-sm ${
                    isTarget 
                      ? "border-blue-400 bg-blue-50/20" 
                      : isSelected
                      ? "border-blue-300 bg-white"
                      : "border-slate-200 bg-white"
                  }`}
                  style={{ height: section.h }}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "SELECT_SECTION", payload: section.id });
                  }}
                  onDragOver={(e) => onSectionDragOver(e, section.id)}
                  onDragLeave={() => setActiveSectionId(null)}
                  onDrop={(e) => onSectionDrop(e, section.id)}
                >
                  {/* Section Label */}
                  <div className="absolute top-0 right-0 py-1.5 px-3 bg-slate-100 rounded-bl-xl text-[10px] font-semibold tracking-wider text-slate-500 pointer-events-none z-10 border-l border-b border-slate-200 shadow-sm flex items-center gap-1.5">
                    {section.name ? section.name : `SECTION ${idx + 1}`}
                  </div>

                  {/* 12-Column Grid Guide (Vertical Lines) */}
                  {state.showGrid && (
                    <div 
                      className="absolute top-0 bottom-0 flex pointer-events-none opacity-30"
                      style={{ left: PADDING_X, right: PADDING_X, gap: GAP_X }}
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-blue-500/5 border-x border-blue-500/10 h-full"
                          style={{ width: COL_W }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Absolute Elements Wrapper */}
                  <div className="relative w-full h-full z-0 pointer-events-auto">
                    {section.elements.map((el) => renderElement(section.id, el))}

                    {section.elements.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-[11px] font-medium text-slate-400">
                          Drag blocks here
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Delete Section Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({
                        type: "REMOVE_SECTION",
                        payload: { sectionId: section.id },
                      });
                    }}
                    className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 opacity-0 group-hover/section:opacity-100 flex items-center justify-center z-20 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>

                  {/* Resize Section Handler */}
                  <div 
                    className="absolute bottom-0 left-0 w-full h-2 cursor-row-resize z-30 group-hover/section:bg-blue-400/10 transition-colors"
                    onMouseDown={(e) => startSectionResize(e, section)}
                  />
                  <div className="absolute bottom-1 right-3 text-[10px] font-medium text-slate-400 pointer-events-none opacity-0 group-hover/section:opacity-100 z-10">
                    {section.h}px
                  </div>
                </div>

                <DropZone index={idx + 1} />
              </React.Fragment>
            );
          })}

          {/* Empty Canvas CTA */}
          {state.sections.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-36 pulse-border border-2 border-dashed rounded-2xl transition-colors bg-white mt-4"
              onDragOver={(e) => onDropZoneDragOver(e, 0)}
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
                Drag a <span className="text-blue-500">Section</span> from the sidebar
              </p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-[260px] text-center leading-relaxed">
                Sections act as vertical containers for your free-form content blocks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
