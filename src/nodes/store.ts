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
import { BaseNodeData, type BaseNode } from './base-node';
import { DragEndEvent } from '@dnd-kit/core';
import { nodeDefinitions } from './definitions';
import { buildFinalTemplate } from '@/glsl-parsing/glsl-templates';

export type BaseNodeParameterValue = number;

export type BaseNodeParameterDefinition = {
  name: string,
  id: string,
  uniformName: string,
  uniformType: string,
  inputType: string,
};

export type BaseNodeParameters = {
  definitions: BaseNodeParameterDefinition[],
  values: BaseNodeParameterValue[],
};

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

  parameters: Map<string, BaseNodeParameterDefinition[]>;
  values: Map<string, BaseNodeParameterValue[]>;
  ownValues: Map<string, BaseNodeParameterValue[]>;
  templates: Map<string, string>;
  types: Map<string, string>;
};

type Actions = {
  updateTemplatesFromNode: (id: string) => void;
  updateParametersFromNode: (id: string) => void;
  updateValuesFromNode: (id: string) => void;
  setNodeValue: (id: string, paramIdx: number, value: BaseNodeParameterValue) => void;

  onConnect: OnConnect;

  onNodesChange: OnNodesChange<BaseNode>;
  onEdgesChange: OnEdgesChange;
  onViewportChange: (viewport: Viewport) => void;
  onInit: OnInit<BaseNode>;

  setNodes: (nodes: BaseNode[]) => void;
  addNodes: (nodes: BaseNode[]) => void;
  updateNodeData: (
    id: string,
    partialNodeData: Partial<BaseNodeData> | ((prev: BaseNode) => Partial<BaseNodeData>),
  ) => void;
  setEdges: (edges: Edge[]) => void;

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


export function getNodeConnectedToHandle(state: State & Actions, nodeId: string, handleId: string) {
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

function allDefined<T>(arr: (T | undefined)[]): arr is T[] {
  return arr.every(v => v !== undefined);
}

function assertAllDefined<T>(
  arr: (T | undefined)[],
  msg: string = "Array contains undefined",
): asserts arr is T[] {
  if (arr.some(v => v === undefined)) {
    throw new Error(msg);
  }
}

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useStore = create<State & Actions>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  rfInstance: null,

  parameters: new Map(),
  values: new Map(),
  ownValues: new Map(),
  templates: new Map(),
  types: new Map(),

  updateTemplatesFromNode: (id) => {
    const type = get().types.get(id);
    if (!type) throw new Error(`Node: ${id} has no type.`);

    const definition = nodeDefinitions.get(type);
    if (!definition) throw new Error(`Invalid node type: ${type}.`);

    // TODO: have the incomming and outgoing nodes in two maps to make this lookup faster
    const inputEdges = get().edges.filter(edge => edge.target === id);
    
    const inputNodeIds = definition.inputs.map(input => {
      return inputEdges.find(edge => edge.targetHandle == input.handleId)?.source;
    });
    if (!allDefined(inputNodeIds)) return; // Some input is not connected for node

    const inputTemplates = inputNodeIds.map(id => {
      return get().templates.get(id);
    });
    assertAllDefined(inputTemplates, `Input node for ${id} doesn't have a template`);

    const finalTemplate = buildFinalTemplate(
      id,
      definition.template,
      definition.parameters.map(p => p.uniformName),
      inputTemplates,
    );

    const newTemplates = new Map(get().templates.entries());
    newTemplates.set(id, finalTemplate);

    set({ templates: newTemplates });

    // trigger nodes that have this one as input
    const outputNodeIds = get().edges
      .filter(edge => edge.source === id)
      .map(e => e.target);
    for (const id of outputNodeIds) {
      get().updateTemplatesFromNode(id);
    }
  },
  updateParametersFromNode: (id: string) => {
    const type = get().types.get(id);
    if (!type) throw new Error(`Node: ${id} has no type.`);

    const definition = nodeDefinitions.get(type);
    if (!definition) throw new Error(`Invalid node type: ${type}.`);

    // TODO: have the incomming and outgoing nodes in two maps to make this lookup faster
    const inputEdges = get().edges.filter(edge => edge.target === id);

    const inputNodeIds = definition.inputs.map(input => {
      return inputEdges.find(edge => edge.targetHandle == input.handleId)?.source;
    });
    if (!allDefined(inputNodeIds)) return; // Some input is not connected

    const inputsParameters = inputNodeIds.map(id => {
      return get().parameters.get(id);
    });
    assertAllDefined(inputsParameters, `Some input doesn't have parameters for node ${id}.`);

    const ownParameters: BaseNodeParameterDefinition[] = definition.parameters.map(param => {
      return {
        name: param.name,
        id: id,
        uniformName: param.uniformName,
        uniformType: param.uniformType,
        inputType: param.inputType,
      };
    });

    const newParameters = new Map(get().parameters.entries());
    newParameters.set(
      id,
      [
        ...ownParameters,
        ...inputsParameters.flat(),
      ],
    );

    set({ parameters: newParameters });

    // trigger nodes that have this one as input
    const outputNodeIds = get().edges
      .filter(edge => edge.source === id)
      .map(e => e.target);
    for (const id of outputNodeIds) {
      get().updateParametersFromNode(id);
    }
  },
  updateValuesFromNode: (id: string) => {
    const type = get().types.get(id);
    if (!type) throw new Error(`Node: ${id} has no type.`);

    const definition = nodeDefinitions.get(type);
    if (!definition) throw new Error(`Invalid node type: ${type}.`);

    // TODO: have the incomming and outgoing nodes in two maps to make this lookup faster
    const inputEdges = get().edges.filter(edge => edge.target === id);

    const inputNodeIds = definition.inputs.map(input => {
      return inputEdges.find(edge => edge.targetHandle == input.handleId)?.source;
    });
    if (!allDefined(inputNodeIds)) return; // Some input is not connected

    const inputsValues = inputNodeIds.map(id => {
      return get().values.get(id);
    });
    assertAllDefined(inputsValues, `Some input doesn't have values for node ${id}.`);

    const ownValues = get().ownValues.get(id);
    if (!ownValues) throw new Error(`Node ${id} doesn't have own values.`);

    const newValues = new Map(get().values.entries());
    newValues.set(
      id,
      [
        ...ownValues,
        ...inputsValues.flat(),
      ],
    );

    set({ values: newValues });

    // trigger nodes that have this one as input
    const outputNodeIds = get().edges
      .filter(edge => edge.source === id)
      .map(e => e.target);
    for (const id of outputNodeIds) {
      get().updateValuesFromNode(id);
    }
  },

  setNodeValue: (id: string, paramIdx: number, value: BaseNodeParameterValue) => {
    const prevOwnValues = get().ownValues.get(id);
    if (!prevOwnValues) throw new Error(`Node ${id} doesn't have own values.`);

    const newOwnValues = new Map(get().ownValues.entries());
    
    const newOwnValuesForThisNode = [...prevOwnValues];
    newOwnValuesForThisNode[paramIdx] = value;
    newOwnValues.set(id, newOwnValuesForThisNode);

    set({ ownValues: newOwnValues });

    get().updateValuesFromNode(id);
  },
  
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });

    get().updateParametersFromNode(connection.target);
    get().updateValuesFromNode(connection.target);
    get().updateTemplatesFromNode(connection.target);
  },

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
    // const targettedNodes: State["targettedNodes"] = new Map();
    // for (const edge of edges) {
    //   if (!targettedNodes.has(edge.source)) targettedNodes.set(edge.source, []);
    //   const targettedNodesForThisSource = targettedNodes.get(edge.source)!;
    //   targettedNodesForThisSource.push(edge.target);
    // }

    set({
      edges,
      // targettedNodes,
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
    if (event.collisions
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

      const generatedId = "id" + Math.random().toString(16).slice(2);

      const node: BaseNode = {
        id: generatedId,
        position: flowPosition,
        data: {
          ownValues: [],
        },
        type: "baseNode",
      };

      const newOwnValues = new Map(get().ownValues.entries());
      newOwnValues.set(generatedId, definition.parameters.map(p => p.defaultValue));

      const newTypes = new Map(get().types.entries());
      newTypes.set(generatedId, event.active.data.current.nodeTypeKey);

      set({
        ownValues: newOwnValues,
        types: newTypes,
      })

      get().addNodes([node]);

      get().updateParametersFromNode(generatedId);
      get().updateValuesFromNode(generatedId);
      get().updateTemplatesFromNode(generatedId);
      console.log(get());
    } else {
      console.warn("ERROR: adding node", event);
    }
  },
}));

export default useStore;
