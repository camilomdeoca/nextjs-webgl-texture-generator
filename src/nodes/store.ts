import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Viewport,
  ReactFlowInstance,
  OnInit,
} from '@xyflow/react';
import { BaseNodeData, BaseNodeParameters, BaseNodeParameterValue, type BaseNode } from './base-node';
import { DragEndEvent } from '@dnd-kit/core';
import { nodeDefinitions } from './definitions';

type SerializableState = {
  nodes: BaseNode[];
  edges: Edge[];
  viewport: Viewport;
};

type State = {
  nodes: BaseNode[];
  edges: Edge[];
  viewport: Viewport;
  rfInstance: ReactFlowInstance<BaseNode> | null;
};

type Actions = {
  onNodesChange: OnNodesChange<BaseNode>;
  onEdgesChange: OnEdgesChange;
  onViewportChange: (viewport: Viewport) => void;
  onConnect: OnConnect;
  onInit: OnInit<BaseNode>;

  setNodes: (nodes: BaseNode[]) => void;
  addNodes: (nodes: BaseNode[]) => void;
  updateNodeData: (
    id: string,
    partialNodeData: Partial<BaseNodeData> | ((prev: BaseNode) => Partial<BaseNodeData>),
  ) => void;
  setEdges: (edges: Edge[]) => void;

  setNodeParameters: (nodeId: string, parameters: BaseNodeParameters) => void;
  setNodeValues: (nodeId: string, values: BaseNodeParameterValue[]) => void;
  setNodeTemplate: (nodeId: string, template?: string) => void;

  loadSerializableState: (serializableState: SerializableState) => void,
  save: () => void;
  load: () => void;
  export: () => void;
  import: () => void;
  handleAddNodeDragEnd: (event: DragEndEvent) => void;
};

const flowKey = 'texture-generator-flow';

// TODO: check also inside nodes and edges
function isSerializableState(flow: unknown): flow is SerializableState {
  if (typeof flow !== "object" || flow === null) return false;

  if (!("nodes" in flow) || !Array.isArray(flow.nodes)) return false;
  if (!("edges" in flow) || !Array.isArray(flow.edges)) return false;
  if (!("viewport" in flow) || typeof flow.viewport !== "object" || flow.viewport === null) return false;
  if (!("x" in flow.viewport) || typeof flow.viewport.x !== "number") return false;
  if (!("y" in flow.viewport) || typeof flow.viewport.y !== "number") return false;
  if (!("zoom" in flow.viewport) || typeof flow.viewport.zoom !== "number") return false;
  return true;
}

function loadSerializableStateFromLocalStorage(): SerializableState | undefined {
  const serializedFlow = localStorage.getItem(flowKey);
  const flow = serializedFlow && JSON.parse(serializedFlow);

  if (isSerializableState(flow)) return flow;
  else return undefined;
}

export async function loadSerializableStateFromFile(file: File): Promise<SerializableState | undefined> {
  if (!file) return;
  const text = await file.text();
  const flow = JSON.parse(text);
  
  if (isSerializableState(flow)) return flow;
  else return undefined;
}


export function getNodeConnectedToHandle (state: State & Actions, nodeId: string, handleId: string) {
  return state.nodes.find(n => {
    const sourceId = state.edges.find(e =>
      e.target === nodeId && e.targetHandle === handleId
    )?.source;
    return n.id === sourceId;
  });
}

export function getNodesData(state: State & Actions, nodeIds: string[]): (BaseNodeData | undefined)[] {
  return nodeIds.map(id => state.nodes.find(node => node.id == id)?.data);
}

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useStore = create<State & Actions>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  rfInstance: null,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onViewportChange: (viewport) => {
    set({ viewport });
  },
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  onInit: (rfInstance) => {
    set({ rfInstance });
  },

  setNodes: (nodes) => {
    set({ nodes });
  },
  addNodes: (nodes: BaseNode[]) => {
    set({ nodes: [...get().nodes, ...nodes] });
  },
  updateNodeData: (id, nodeDataUpdate) => {
    set({
      nodes: get().nodes.map(node => {
        if (node.id == id) {
          const newData = typeof nodeDataUpdate === "function" ? nodeDataUpdate(node) : nodeDataUpdate;
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
        }
        return node;
      }),
    });
  },
  setEdges: (edges) => {
    set({ edges });
  },

  setNodeValues: (nodeId, values) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          if (!node.data.parameters) throw new Error("No parameters.");
          // it's important to create a new object here, to inform React Flow about the changes
          return {
            ...node,
            data: {
              ...node.data,
              parameters: {
                ...node.data.parameters,
                values: [
                  ...values,
                  ...node.data.parameters.values.splice(0, values.length),
                ],
              },
              ownValues: values,
            },
          };
        }

        return node;
      }),
    });
  },
  setNodeParameters: (nodeId, parameters) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          // if (!node.data.parameters) throw new Error("No parameters.");

          return {
            ...node,
            data: {
              ...node.data,
              parameters,
            },
          };
        }

        return node;
      }),
    });
  },
  setNodeTemplate: (nodeId, template) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          // if (!node.data.parameters) throw new Error("No parameters.");

          return {
            ...node,
            data: {
              ...node.data,
              shaderTemplate: template,
            },
          };
        }

        return node;
      }),
    });
  },

  loadSerializableState: (serializableState) => {
    set({
      nodes: serializableState.nodes,
      edges: serializableState.edges,
      viewport: serializableState.viewport,
    });
  },
  save: () => {
    const flow = {
      nodes: get().nodes,
      edges: get().edges,
      viewport: get().viewport,
    };
    localStorage.setItem(flowKey, JSON.stringify(flow));
  },
  load: () => {
    (async () => {
      const flow = loadSerializableStateFromLocalStorage();
      if (flow) set({
        nodes: flow.nodes,
        edges: flow.edges,
        viewport: flow.viewport,
      });
    })();
  },
  export: () => {
    const flow = {
      nodes: get().nodes,
      edges: get().edges,
      viewport: get().viewport,
    };
    const blob = new Blob([JSON.stringify(flow)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "texture-generator-project.json"
    link.click();
  },
  import: () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const flow = await loadSerializableStateFromFile(file);
      if (flow) set({
        nodes: flow.nodes,
        edges: flow.edges,
        viewport: flow.viewport,
      });
    };

    input.click();
  },
  handleAddNodeDragEnd: (event: DragEndEvent) => {
    console.log("START ADD NODE");
    if ( event.collisions
      && event.collisions.length > 0
      && event.activatorEvent instanceof PointerEvent
      && event.active.data.current
      && "nodeTypeKey" in event.active.data.current
      && typeof event.active.data.current.nodeTypeKey === "string"
    ) {
      const rfInstance = get().rfInstance;
      if (!rfInstance) {
        console.warn("Null React Flow instance.");
        return;
      }
      const flowPosition = rfInstance.screenToFlowPosition({
        x: event.activatorEvent.clientX + event.delta.x,
        y: event.activatorEvent.clientY + event.delta.y,
      });

      const definition = nodeDefinitions.get(event.active.data.current.nodeTypeKey);

      if (!definition) {
        throw new Error(`invalid node type key: \`${event.active.data.current.nodeTypeKey}\``);
      }

      const generatedId = "id"+Math.random().toString(16).slice(2);

      const node: BaseNode = {
        id: generatedId,
        position: flowPosition,
        data: {
          type: event.active.data.current.nodeTypeKey,
          ownValues: definition?.parameters.map(({defaultValue}) => defaultValue),
        },
        type: "baseNode",
      };

      get().addNodes([node]);
    } else {
      console.warn("ERROR: adding node", event);
    }
  },
}));

export default useStore;
