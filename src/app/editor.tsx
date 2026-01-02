"use client";

import Menubar from "@/components/menubar";
import NodesPalette from "@/components/nodes-palette";
import BaseNode from "@/nodes/base-node";
import useStore, { loadSerializableStateFromFile } from "@/nodes/store";
import { DndContext, useDroppable } from "@dnd-kit/core";
import {
  ReactFlow,
  Background,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ReactNode, useEffect, useId, useState } from "react";
import { useShallow } from "zustand/shallow";

type DroppableProperties = {
  id: string;
  className?: string;
  children?: ReactNode;
};

function Droppable({ id, className, children }: DroppableProperties) {
  const { setNodeRef } = useDroppable({ id });
  const style = {
    // opacity: isOver ? 0.5 : 1.0,
  };
  
  return (
    <div className={className} ref={setNodeRef} style={style}>
      {children}
    </div>
  );
}


const nodeTypes = {
  baseNode: BaseNode,
};

export default function Editor() {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onViewportChange,
    onConnect,
    onInit,
    loadSerializableState,
    save,
    load,
    onExport,
    onImport,
    handleAddNodeDragEnd,
  } = useStore(
    useShallow(state => ({
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onViewportChange: state.onViewportChange,
      onConnect: state.onConnect,
      onInit: state.onInit,
      loadSerializableState: state.loadSerializableState,
      save: state.save,
      load: state.load,
      onExport: state.export,
      onImport: state.import,
      handleAddNodeDragEnd: state.handleAddNodeDragEnd,
    }))
  );

  const [showDragDestination, setShowDragDestination] = useState(false);

  useEffect(() => {
    (async () => load())();
  }, [load]);

  // TODO: make auto-saving toggleable
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     onSave();
  //   }, 5000)
  //
  //   return (() => {
  //     clearInterval(interval)
  //   })
  // }, [onSave])

  const dndId = useId();

  return (
    <div className="w-full h-full flex flex-col text-neutral-100 bg-red-950">
      <DndContext id={dndId} onDragEnd={handleAddNodeDragEnd}>
      <Menubar
        className="shadow-md shadow-black z-20"
        menus={[
          {
            label: "File",
            options: [
              { label: "Save", callback: save },
              { label: "Load", callback: load },
              { label: "Export", callback: onExport },
              { label: "Import", callback: onImport },
            ],
          },
        ]}
      />
      <div className="flex flex-row w-full h-full"  >
        <NodesPalette className="w-50 shadow-md shadow-black z-10" />
        <Droppable
          id="droppable"
          className="relative flex-1"
        >
          {showDragDestination && (
            <div
              className={`
                absolute inset-0 bg-neutral-950/50 z-20 pointer-events-none text-9xl
                flex items-center justify-center border-3 border-dashed border-amber-400/50
              `}
            >
                Drop here
            </div>
          )}
          <ReactFlow
            colorMode="dark"
            nodeTypes={nodeTypes}
            nodes={nodes}
            edges={edges}
            viewport={viewport}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onViewportChange={onViewportChange}
            onConnect={onConnect}
            onInit={onInit}
            onDragOver={e => {
              setShowDragDestination(true);
              e.preventDefault()
            }}
            onDragEnter={e => {
              e.preventDefault();
              setShowDragDestination(true);
            }}
            onDragLeave={e => {
              e.preventDefault();
              setShowDragDestination(false);
            }}
            onDrop={e => {
              e.preventDefault();
              setShowDragDestination(false);
              const file = e.dataTransfer.files[0];
              if (!file) return;
              loadSerializableStateFromFile(file)
                .then(flow => {
                  if (flow) loadSerializableState(flow);
                });

            }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </Droppable>
      </div>
      </DndContext>
    </div>
  );
}
