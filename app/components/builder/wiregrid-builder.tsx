"use client";

import React from "react";
import { BuilderProvider } from "./builder-context";
import Navbar from "./navbar";
import Sidebar from "./sidebar";
import Canvas from "./canvas";

export default function WiregridBuilder() {
  return (
    <BuilderProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <Canvas />
        </div>
      </div>
    </BuilderProvider>
  );
}
