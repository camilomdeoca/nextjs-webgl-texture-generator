"use client";

import Menubar from "@/components/menubar";
import BaseNode, { type BaseNode as BaseNodeType } from "@/nodes/base-node";
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
import { useCallback, useEffect, useState } from "react";

const nodeTypes = {
  baseNode: BaseNode,
};

const initialNodes: BaseNodeType[] = [
  {
    id: "n1",
    position: { x: 0, y: 0 },
    data: {
      type: "simplex",
      ownValues: [0, 1],
    },
    type: "baseNode",
  },
  {
    id: "n2",
    position: { x: 200, y: 100 },
    data: {
      type: "invert",
      ownValues: [1],
    },
    type: "baseNode",
  },
  {
    id: "n3",
    position: { x: 400, y: 100 },
    data: {
      type: "invert",
      ownValues: [1],
    },
    type: "baseNode",
  },
];

const initialEdges: Edge[] = [
  // {
  //   id: "n1-n2",
  //   source: "n1",
  //   target: "n2",
  //   sourceHandle: "out",
  //   targetHandle: "in",
  // },
];

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
  const { setViewport } = useReactFlow();  
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

  return (
    <div className="w-full h-full flex flex-col">
      <Menubar
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
      <div
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
        className="relative flex-1"
      >
        {showDragDestination && (
          <div
            className={`
              absolute inset-0 bg-neutral-950/50 z-10 pointer-events-none text-9xl
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
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
