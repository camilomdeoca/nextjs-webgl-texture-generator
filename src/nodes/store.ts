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
  Node,
} from '@xyflow/react';
import { DragEndEvent } from '@dnd-kit/core';
import { BaseNodeParameterValue, nodeDefinitions } from './definitions';
import { buildFinalTemplate } from '@/glsl-parsing/glsl-templates';
import { allDefined } from '@/utils/lists';
import { create } from 'zustand';
import { useRef } from 'react';

export type BaseNodeParameterDefinition = {
  name: string,
  id: string,
  uniformName: string,
  uniformType: string,
  inputType: string,
};

type SerializableState = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;

  inputNodes: [string, string[]][];
  ownValues: [string, BaseNodeParameterValue[]][];
  templates: [string, string][];
  types: [string, string][];
};

type State = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  rfInstance: ReactFlowInstance | null;

  // Input nodes ids (including indirect inputs)
  inputNodes: Map<string, Set<string>>;
  ownValues: Map<string, BaseNodeParameterValue[]>;
  templates: Map<string, string>;
  types: Map<string, string>;
};

type Actions = {
  updateTemplatesFromNode: (id: string) => void;
  updateInputNodesFromNode: (id: string) => void;
  setNodeValue: (id: string, paramIdx: number, value: BaseNodeParameterValue) => void;

  onConnect: OnConnect;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onViewportChange: (viewport: Viewport) => void;
  onInit: OnInit;

  setNodes: (nodes: Node[]) => void;
  addNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;

  loadSerializableState: (serializableState: SerializableState) => void,
  save: () => void;
  load: () => void;
  export: () => void;
  import: () => void;
  handleAddNodeDragEnd: (event: DragEndEvent) => void;
};

const flowKey = 'texture-generator-flow';

export function useCustomComparison<S, U>(
  selector: (state: S) => U,
  isEqual: (a: U, b: U) => boolean,
): (state: S) => U {
  const prev = useRef<U>(undefined)
  return (state) => {
    const next = selector(state)
    return prev.current !== undefined && isEqual(prev.current, next)
      ? (prev.current as U)
      : (prev.current = next)
  }
}

// TODO: check also inside array fields
function isSerializableState(flow: unknown): flow is SerializableState {
  if (typeof flow !== "object" || flow === null) return false;

  if (!("nodes" in flow) || !Array.isArray(flow.nodes)) return false;
  if (!("edges" in flow) || !Array.isArray(flow.edges)) return false;
  if (!("inputNodes" in flow) || !Array.isArray(flow.inputNodes)) return false;
  if (!("ownValues" in flow) || !Array.isArray(flow.ownValues)) return false;
  if (!("templates" in flow) || !Array.isArray(flow.templates)) return false;
  if (!("types" in flow) || !Array.isArray(flow.types)) return false;
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

function serializableStateFromState(state: State & Actions): SerializableState {
  return {
    nodes: state.nodes,
    edges: state.edges,
    viewport: state.viewport,
    inputNodes: state.inputNodes.entries()
      .map<[string, string[]]>(
        ([id, inputs]) => [id, inputs.values().toArray()]
      )
      .toArray(),
    ownValues: state.ownValues.entries().toArray(),
    templates: state.templates.entries().toArray(),
    types: state.types.entries().toArray(),
  };
}

export async function loadSerializableStateFromFile(file: File): Promise<SerializableState | undefined> {
  if (!file) return;
  const text = await file.text();
  const flow = JSON.parse(text);

  if (isSerializableState(flow)) return flow;
  else return undefined;
}

export function getParametersFromNode(
  state: State & Actions,
  id: string,
): BaseNodeParameterDefinition[] | undefined {
  const inputNodes = state.inputNodes.get(id);
  if (!inputNodes) return undefined;
  
  const parameters = [...inputNodes.values(), id].flatMap(inputId => {
    const inputType = state.types.get(inputId);
    if (!inputType) throw new Error(`node ${inputId} isn't in types map.`);

    const definition = nodeDefinitions.get(inputType);
    if (!definition) throw new Error(`node ${inputId} has invalid type: ${inputType}.`);

    return definition.parameters.map(param => {
      return {
        name: param.name,
        id: inputId,
        uniformName: param.uniformName,
        uniformType: param.uniformType,
        inputType: param.inputType,
      }
    });
  });

  return parameters;
}

export function getValuesForParameters(
  state: State & Actions,
  parameters: BaseNodeParameterDefinition[],
): BaseNodeParameterValue[] | undefined {
  const values = parameters.map(param => {
    const nodeType = state.types.get(param.id);
    if (!nodeType) return undefined;

    const definition = nodeDefinitions.get(nodeType);
    if (!definition) throw new Error(`node ${param.id} has invalid type: ${nodeType}.`);

    const paramIdx = definition.parameters.findIndex(paramDef => paramDef.uniformName === param.uniformName);
    if (paramIdx < 0) throw new Error(`There is no ${param.uniformName} in type: ${nodeType}`);

    const value = state.ownValues.get(param.id)?.[paramIdx];
    if (!value) throw new Error(`No value for parameter ${param.uniformName} in node ${param.id}`);

    return value;
  });
  if (!allDefined(values)) return undefined;
  return values;
}

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useStore = create<State & Actions>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  rfInstance: null,

  inputNodes: new Map(),
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
    
    const newTemplates = new Map(get().templates.entries());
    if (!allDefined(inputNodeIds)) { // Some input is not connected for node
      newTemplates.delete(id);
    } else {
      const inputTemplates = inputNodeIds.map(id => {
        return get().templates.get(id);
      });

      if (!allDefined(inputTemplates)) { // Some of the inputs doesnt have a defined template
        newTemplates.delete(id);
      } else {
        const finalTemplate = buildFinalTemplate(
          id,
          definition.template,
          definition.parameters.map(p => p.uniformName),
          inputTemplates,
        );

        newTemplates.set(id, finalTemplate);
      }
    }

    set({ templates: newTemplates });

    // trigger nodes that have this one as input
    const outputNodeIds = get().edges
      .filter(edge => edge.source === id)
      .map(e => e.target);
    for (const id of outputNodeIds) {
      get().updateTemplatesFromNode(id);
    }
  },
  updateInputNodesFromNode: (id: string) => {
    const type = get().types.get(id);
    if (!type) throw new Error(`Node: ${id} has no type.`);

    const definition = nodeDefinitions.get(type);
    if (!definition) throw new Error(`Invalid node type: ${type}.`);

    // TODO: have the incomming and outgoing nodes in two maps to make this lookup faster
    const inputEdges = get().edges.filter(edge => edge.target === id);

    const directInputNodeIds = definition.inputs.map(input => {
      return inputEdges.find(edge => edge.targetHandle == input.handleId)?.source;
    });
    const newInputNodes = new Map(get().inputNodes.entries());

    if (!allDefined(directInputNodeIds)) { // Some input is not connected
      newInputNodes.delete(id);
    } else {
      const inputsInputNodes = directInputNodeIds.map(id => {
        return get().inputNodes.get(id);
      });
      if (!allDefined(inputsInputNodes)) {
        newInputNodes.delete(id);
      } else {
        newInputNodes.set(
          id,
          new Set([
            ...directInputNodeIds,
            ...inputsInputNodes.map(ids => ids.values().toArray()).flat(),
          ]),
        );
      }
    }

    set({ inputNodes: newInputNodes });

    // trigger nodes that have this one as input
    const outputNodeIds = get().edges
      .filter(edge => edge.source === id)
      .map(e => e.target);
    for (const id of outputNodeIds) {
      get().updateInputNodesFromNode(id);
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
  },
  
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });

    get().updateInputNodesFromNode(connection.target);
    get().updateTemplatesFromNode(connection.target);
  },

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
    for (const change of changes) {
      if (change.type === "remove") {
        get().types.delete(change.id);
        get().ownValues.delete(change.id);
      }
    }
  },
  onEdgesChange: (changes) => {
    const nodesToUpdate = [];
    for (const change of changes) {
      if (change.type === "remove") {
        const edge = get().edges.find(edge => edge.id == change.id);
        if (!edge) throw new Error(`Couldn't find edge ${change.id}.`);
        nodesToUpdate.push(edge.target);
      }
    }

    set({
      edges: applyEdgeChanges(changes, get().edges),
    });

    for (const id of nodesToUpdate) {
      get().updateInputNodesFromNode(id);
      get().updateTemplatesFromNode(id);
    }
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
  addNodes: (nodes: Node[]) => {
    set({ nodes: [...get().nodes, ...nodes] });
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
      inputNodes: new Map(serializableState.inputNodes.map(([id, inputs]) => [id, new Set(inputs)])),
      ownValues: new Map(serializableState.ownValues),
      templates: new Map(serializableState.templates),
      types: new Map(serializableState.types),
    });
  },
  save: () => {
    const serializableState = serializableStateFromState(get());
    localStorage.setItem(flowKey, JSON.stringify(serializableState));
  },
  load: () => {
    (async () => {
      const serializableState = loadSerializableStateFromLocalStorage();
      console.log("LOADED", serializableState);
      if (serializableState) get().loadSerializableState(serializableState);
    })();
  },
  export: () => {
    const serializableState = serializableStateFromState(get());
    const blob = new Blob([JSON.stringify(serializableState)], { type: "application/json" });
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
      const serializableState = await loadSerializableStateFromFile(file);
      if (serializableState) set({
        nodes: serializableState.nodes,
        edges: serializableState.edges,
        viewport: serializableState.viewport,
      });
    };

    input.click();
  },
  handleAddNodeDragEnd: (event: DragEndEvent) => {
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

      const node: Node = {
        id: generatedId,
        position: flowPosition,
        data: {},
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

      get().updateInputNodesFromNode(generatedId);
      get().updateTemplatesFromNode(generatedId);
    } else {
      console.warn("ERROR: adding node", event);
    }
  },
}));

export default useStore;
