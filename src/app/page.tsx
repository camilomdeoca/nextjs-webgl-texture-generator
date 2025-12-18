"use client";

import {
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Editor from "./editor";

export default function Home() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
