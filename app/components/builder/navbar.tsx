"use client";

import React, { useState } from "react";
import { useBuilder } from "./builder-context";

import type { WireElement } from "./types";

type LayoutNode = 
  | { type: "row"; children: LayoutNode[] }
  | { type: "col"; span: number; children: LayoutNode[] }
  | { type: "block" };

function buildLayoutTree(elements: WireElement[], parentSpan: number = 12): LayoutNode[] {
  if (elements.length === 0) return [];
  if (elements.length === 1) return [{ type: "block" }];

  // 1. Try Row split (Y-axis)
  const yIntervals = elements.map(e => ({ start: e.y, end: e.y + e.h })).sort((a, b) => a.start - b.start);
  const mergedY: { start: number; end: number }[] = [];
  yIntervals.forEach(iv => {
    if (mergedY.length === 0) mergedY.push(iv);
    else {
      const last = mergedY[mergedY.length - 1];
      if (iv.start <= last.end + 4) { // 4px tolerance
        last.end = Math.max(last.end, iv.end);
      } else {
        mergedY.push(iv);
      }
    }
  });

  if (mergedY.length > 1) {
    const rows: LayoutNode[] = [];
    mergedY.forEach(my => {
      const rowEls = elements.filter(e => e.y >= my.start - 4 && (e.y + e.h) <= my.end + 4);
      if (rowEls.length > 0) rows.push({ type: "row", children: buildLayoutTree(rowEls, parentSpan) });
    });
    if (rows.length > 1) return rows;
  }

  // 2. Try Col split (X-axis)
  const xIntervals = elements.map(e => ({ start: e.x, end: e.x + e.w, el: e })).sort((a, b) => a.start - b.start);
  const mergedX: { start: number; end: number; els: WireElement[] }[] = [];
  xIntervals.forEach(iv => {
    if (mergedX.length === 0) mergedX.push({ start: iv.start, end: iv.end, els: [iv.el] });
    else {
      const last = mergedX[mergedX.length - 1];
      if (iv.start <= last.end + 4) {
        last.end = Math.max(last.end, iv.end);
        last.els.push(iv.el);
      } else {
        mergedX.push({ start: iv.start, end: iv.end, els: [iv.el] });
      }
    }
  });

  if (mergedX.length > 1) {
    const cols: LayoutNode[] = [];
    const totalColsW = mergedX.reduce((acc, mx) => acc + (mx.end - mx.start), 0);
    mergedX.forEach(mx => {
      const ratio = (mx.end - mx.start) / totalColsW;
      let span = Math.round(ratio * 12);
      if (span < 1) span = 1;
      if (span > 12) span = 12;

      if (mx.els.length > 0) cols.push({ type: "col", span, children: buildLayoutTree(mx.els, 12) });
    });
    if (cols.length > 1) return cols;
  }

  // 3. Fallback (Overlapping or atomic)
  return elements.map(() => ({ type: "block" }));
}

function stringifyLayoutTree(nodes: LayoutNode[], indent: string = ""): string {
  let str = "";
  nodes.forEach((node, i) => {
    if (node.type === "row") {
      str += `${indent}- Row ${i + 1}:\n`;
      str += stringifyLayoutTree(node.children, indent + "  ");
    } else if (node.type === "col") {
      if (node.children.length === 1 && node.children[0].type === "block") {
        str += `${indent}- Column (span ${node.span}): Contains a single content block.\n`;
      } else {
        str += `${indent}- Column (span ${node.span}):\n`;
        str += stringifyLayoutTree(node.children, indent + "  ");
      }
    } else if (node.type === "block") {
      str += `${indent}- Content block\n`;
    }
  });
  return str;
}

export default function Navbar() {
  const { state, dispatch } = useBuilder();
  const [showPrompt, setShowPrompt] = useState(false);
  const pct = Math.round(state.zoom * 100);

  const generatePrompt = () => {
    let prompt = "Create a layout using a 12-column grid system.\n\n";

    if (state.sections.length === 0) {
      prompt += "(Empty Canvas)\n";
      return prompt;
    }

    state.sections.forEach((section, idx) => {
      prompt += `Section ${idx + 1}:\n`;

      if (section.elements.length === 0) {
        prompt += `  (Empty Section)\n\n`;
        return;
      }

      const tree = buildLayoutTree(section.elements);
      const str = stringifyLayoutTree(tree, "");
      prompt += str + "\n";
    });

    return prompt.trim();
  };

  return (
    <>
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

          <div className="w-px h-5 bg-slate-200 mx-2" />

          {/* Preview Prompt Button */}
          <button
            onClick={() => setShowPrompt(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 shadow-sm transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 2v8M8 2v8M2 4h8M2 8h8" />
            </svg>
            Preview Prompt
          </button>
        </div>

        {/* Right — info */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {state.sections.length} section{state.sections.length !== 1 ? "s" : ""} •{" "}
            {state.sections.reduce((acc, s) => acc + s.elements.length, 0)} element{state.sections.reduce((acc, s) => acc + s.elements.length, 0) !== 1 ? "s" : ""}
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            W
          </div>
        </div>
      </header>

      {/* Prompt Modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-[600px] max-w-[90vw] max-h-[85vh] flex flex-col overflow-hidden border border-slate-200/60">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">Generated Wireframe Prompt</h3>
              <button
                onClick={() => setShowPrompt(false)}
                className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2l6 6M8 2l-6 6" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              <pre className="font-mono text-[11px] text-slate-700 bg-white border border-slate-200 p-4 rounded-xl overflow-x-auto shadow-sm whitespace-pre-wrap selection:bg-blue-100">
                {generatePrompt()}
              </pre>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-white">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatePrompt());
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition-colors shadow-sm"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 2h4a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z" />
                  <path d="M4 2v2M8 2v2" />
                </svg>
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
