"use client";

import Menubar from "@/components/menubar";
import NodesPalette from "@/components/nodes-palette";
import BaseNode, { type BaseNode as BaseNodeType } from "@/nodes/base-node";
import { nodeDefinitions } from "@/nodes/definitions";
import { initialEdges, initialNodes } from "@/nodes/initial-flow";
import { DndContext, DragEndEvent, useDroppable } from "@dnd-kit/core";
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  type Node,
  type Edge,
  ReactFlowInstance,
  useReactFlow,
  ReactFlowJsonObject,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ReactNode, useCallback, useEffect, useState } from "react";

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

const flowKey = 'texture-generator-flow';

// TODO: check also inside nodes and edges
function isReactFlowJsonObject(flow: unknown): flow is ReactFlowJsonObject {
  if (typeof flow !== "object" || flow === null) return false;

  if (!("nodes" in flow) || !Array.isArray(flow.nodes)) return false;
  if (!("edges" in flow) || !Array.isArray(flow.edges)) return false;
  if (!("viewport" in flow) || typeof flow.viewport !== "object" || flow.viewport === null) return false;
  if (!("x" in flow.viewport) || typeof flow.viewport.x !== "number") return false;
  if (!("y" in flow.viewport) || typeof flow.viewport.y !== "number") return false;
  if (!("zoom" in flow.viewport) || typeof flow.viewport.zoom !== "number") return false;
  return true;
}

function loadFlowFromLocalStorage(): ReactFlowJsonObject | undefined {
  const serializedFlow = localStorage.getItem(flowKey);
  const flow = serializedFlow && JSON.parse(serializedFlow);

  if (isReactFlowJsonObject(flow)) return flow;
  else return undefined;
}

async function loadFlowFromFile(file: File): Promise<ReactFlowJsonObject | undefined> {
  if (!file) return;
  const text = await file.text();
  const flow = JSON.parse(text);
  
  if (isReactFlowJsonObject(flow)) return flow;
  else return undefined;
}

export default function Editor() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const { setViewport, screenToFlowPosition, addNodes } = useReactFlow();  
  const [showDragDestination, setShowDragDestination] = useState(false);

  const loadFlowIntoInstance = useCallback((flow: ReactFlowJsonObject) => {
    const { x = 0, y = 0, zoom = 1 } = flow.viewport;
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
    setViewport({ x, y, zoom });
  }, [setViewport]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [setNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  const onSave = useCallback(() => {
    if (rfInstance) {
      const flow = rfInstance.toObject();
      localStorage.setItem(flowKey, JSON.stringify(flow));
    }
  }, [rfInstance]);

  const onLoad = useCallback(() => {
    (async () => {
      const flow = loadFlowFromLocalStorage();
      if (flow) loadFlowIntoInstance(flow);
    })();
  }, [loadFlowIntoInstance]);
  
  const onExport = useCallback(() => {
    if (rfInstance) {
      const flow = rfInstance.toObject();
      const blob = new Blob([JSON.stringify(flow)], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "texture-generator-project.json"
      link.click();
    }
  }, [rfInstance]);

  const onImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const flow = await loadFlowFromFile(file);
      if (flow) loadFlowIntoInstance(flow);
    };

    input.click();
  }, [loadFlowIntoInstance]);

  useEffect(() => {
    (async () => {
      const flow = loadFlowFromLocalStorage();
      if (flow) loadFlowIntoInstance(flow);
      else loadFlowIntoInstance({
          nodes: initialNodes,
          edges: initialEdges,
          viewport: { x: 0, y: 0, zoom: 1 },
      })
    })();
  }, [loadFlowIntoInstance, setViewport]);

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
  
  const handleAddNodeDragEnd = useCallback((event: DragEndEvent) => {
    if ( event.collisions
      && event.collisions.length > 0
      && event.activatorEvent instanceof PointerEvent
      && event.active.data.current
      && "nodeTypeKey" in event.active.data.current
      && typeof event.active.data.current.nodeTypeKey === "string"
    ) {
      const flowPosition = screenToFlowPosition({
        x: event.activatorEvent.clientX + event.delta.x,
        y: event.activatorEvent.clientY + event.delta.y,
      });

      const definition = nodeDefinitions.get(event.active.data.current.nodeTypeKey);

      if (!definition) {
        throw new Error(`invalid node type key: \`${event.active.data.current.nodeTypeKey}\``);
      }

      const generatedId = "id"+Math.random().toString(16).slice(2);
      console.log(generatedId)

      const node: BaseNodeType = {
        id: generatedId,
        position: flowPosition,
        data: {
          type: event.active.data.current.nodeTypeKey,
          ownValues: definition?.parameters.map(({defaultValue}) => defaultValue),
        },
        type: "baseNode",
      };

      addNodes(node);
    }
  }, [addNodes, screenToFlowPosition]);

  return (
    <div className="w-full h-full flex flex-col">
      <DndContext onDragEnd={handleAddNodeDragEnd}>
      <Menubar
        className="shadow-md shadow-black z-20"
        menus={[
          {
            label: "File",
            options: [
              { label: "Save", callback: onSave },
              { label: "Load", callback: onLoad },
              { label: "Export", callback: onExport },
              { label: "Import", callback: onImport },
            ],
          },
        ]}
      />
      <div className="flex flex-row w-full h-full"  >
        <NodesPalette className="w-50 h-full shadow-md shadow-black z-10" />
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
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
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
              loadFlowFromFile(file)
                .then(flow => {
                  if (flow) loadFlowIntoInstance(flow);
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
