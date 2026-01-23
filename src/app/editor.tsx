"use client";

import Menubar from "@/components/menubar";
import NodesPalette from "@/components/nodes-palette";
import { DndContext, useDroppable } from "@dnd-kit/core";
import {
  ReactFlow,
  Background,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ReactNode, useEffect, useId, useState } from "react";
import { useShallow } from "zustand/shallow";
import { Settings } from "@/components/settings";
import { BaseNode } from "@/components/nodes/base-node";
import { loadSerializableStateFromFile, useStore } from "@/nodes/store";
import { UnmountOnConditionDelayed } from "@/components/ui/unmount-on-condition-delayed";
import { Overlay } from "@/components/ui/overlay";
import Image from "next/image";
import Toolbar from "@/components/toolbar";
import { ModelPreview } from "@/components/model-preview";

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
    loadDemo,
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
      loadDemo: state.loadDemo,
      onExport: state.export,
      onImport: state.import,
      handleAddNodeDragEnd: state.handleAddNodeDragEnd,
    }))
  );

  const [showDragDestination, setShowDragDestination] = useState(false);

  useEffect(() => {
      (async () => {
        load();
      })();
  }, [load, loadSerializableState]);

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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [modelPreviewOpen, setModelPreviewOpen] = useState(true);

  return (
    <div className="w-full h-full flex flex-col text-neutral-100 bg-red-950">
      <DndContext id={dndId} onDragEnd={handleAddNodeDragEnd}>
      <Menubar
        className="shadow-sm shadow-black z-30"
        menus={[
          {
            label: "File",
            options: [
              { iconSrc: "save.svg",        label: "Save", callback: save },
              { iconSrc: "folder_open.svg", label: "Load", callback: load },
              { iconSrc: "file_save.svg",   label: "Save to file", callback: onExport },
              { iconSrc: "upload_file.svg", label: "Import", callback: onImport },
              {                             label: "Load demo", callback: loadDemo },
              { iconSrc: "delete.svg",      label: "Clear storage", callback: () => localStorage.clear() },
            ],
          },
          {
            label: "Edit",
            options: [
              { iconSrc: "settings.svg", label: "Settings", callback: () => setSettingsOpen(true) },
            ],
          },
        ]}
      />
      <Toolbar
        className="shadow-md shadow-black z-20"
        tools={[
          {
            label: "Nodes palette",
            imageSrc: "palette.svg",
            callback: () => setPaletteOpen(prev => !prev),
          },
          {
            label: "Preview on a model",
            imageSrc: "preview.svg",
            callback: () => setModelPreviewOpen(prev => !prev),
          },
        ]}
      />
      <div className="flex flex-row grow min-h-0"  >
        <UnmountOnConditionDelayed showCondition={paletteOpen}>
          <div className={`
            overflow-y-auto overflow-x-hidden h-full bg-neutral-800 border-r border-neutral-700
            shadow-md shadow-black z-10 flex flex-col w-55
            scrollbar scrollbar-track-neutral-800 scrollbar-thumb-neutral-700
            ${paletteOpen ? "animate-fade-in-width" : "animate-fade-out-width"}
          `}>
            <div className={`flex flex-row m-2 mb-0`}>
              <button
                className="p-1 hover:bg-neutral-700 rounded-md"
                onClick={() => setPaletteOpen(false)}
              >
                <Image
                  className={`
                    h-6 w-6 aspect-square select-none pointer-events-none
                  `}
                  src="close.svg"
                  alt=""
                  width={5}
                  height={5}
                />
              </button>
              <span className={`m-auto text-lg justify-center`}>
                Nodes palette
              </span>
            </div>
            <NodesPalette className={`w-full grow`} />
          </div>
        </UnmountOnConditionDelayed>
        <Droppable
          id="droppable"
          className="relative flex-1"
        >
          {showDragDestination && (
            <div className={`
              absolute inset-0 bg-neutral-950/50 z-20 pointer-events-none text-9xl
              flex items-center justify-center border-3 border-dashed border-amber-400/50
            `}>
              Drop here
            </div>
          )}
          <ReactFlow
            colorMode="dark"
            minZoom={0.01}
            maxZoom={30}
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
        <UnmountOnConditionDelayed showCondition={modelPreviewOpen}>
          <div className={`
            h-full bg-neutral-800 border-r border-neutral-700
            shadow-md shadow-black z-10 flex flex-col w-96
            ${modelPreviewOpen ? "animate-fade-in-width" : "animate-fade-out-width"}
          `}>
            <div className={`flex flex-row m-2 mb-0`}>
              <button
                className="p-1 hover:bg-neutral-700 rounded-md"
                onClick={() => setModelPreviewOpen(false)}
              >
                <Image
                  className="h-6 w-6 aspect-square select-none pointer-events-none"
                  src="close.svg"
                  alt=""
                  width={5}
                  height={5}
                />
              </button>
              <span className="m-auto text-lg justify-center">
                Model preview
              </span>
            </div>
            <ModelPreview className={`w-full grow min-h-0`} />
          </div>
        </UnmountOnConditionDelayed>
      </div>
      <UnmountOnConditionDelayed showCondition={settingsOpen}>
        <Overlay>
          <div className="w-full h-full">
            <Settings
              className={`
                w-1/3 absolute m-auto inset-0 h-1/3 z-50
                ${settingsOpen
                  ? "animate-fade-in-opacity"
                  : "animate-fade-out-opacity pointer-events-none"}
              `}
              onClose={() => setSettingsOpen(false)}
            />
          </div>
          {settingsOpen && <div
            onMouseDown={() => setSettingsOpen(false)}
            className="fixed inset-0 z-40"
          />}
        </Overlay>
      </UnmountOnConditionDelayed>
      </DndContext>
    </div>
  );
}
