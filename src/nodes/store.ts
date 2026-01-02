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
  Node,
} from '@xyflow/react';
import { DragEndEvent } from '@dnd-kit/core';
import { BaseNodeParameterValue, nodeDefinitions } from './definitions';
import { buildFinalTemplate } from '@/glsl-parsing/glsl-templates';
import { allDefined } from '@/utils/lists';

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

  parameters: [string, BaseNodeParameterDefinition[]][];
  values: [string, BaseNodeParameterValue[]][];
  ownValues: [string, BaseNodeParameterValue[]][];
  templates: [string, string][];
  types: [string, string][];
};

type State = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  rfInstance: ReactFlowInstance | null;

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

// TODO: check also inside array fields
function isSerializableState(flow: unknown): flow is SerializableState {
  if (typeof flow !== "object" || flow === null) return false;

  if (!("nodes" in flow) || !Array.isArray(flow.nodes)) return false;
  if (!("edges" in flow) || !Array.isArray(flow.edges)) return false;
  if (!("parameters" in flow) || !Array.isArray(flow.parameters)) return false;
  if (!("values" in flow) || !Array.isArray(flow.values)) return false;
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
    parameters: state.parameters.entries().toArray(),
    values: state.values.entries().toArray(),
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
    const newParameters = new Map(get().parameters.entries());

    if (!allDefined(inputNodeIds)) { // Some input is not connected
      newParameters.delete(id);
    } else {
      const inputsParameters = inputNodeIds.map(id => {
        return get().parameters.get(id);
      });
      if (!allDefined(inputsParameters)) {
        newParameters.delete(id);
      } else {
        const ownParameters: BaseNodeParameterDefinition[] = definition.parameters.map(param => {
          return {
            name: param.name,
            id: id,
            uniformName: param.uniformName,
            uniformType: param.uniformType,
            inputType: param.inputType,
          };
        });

        newParameters.set(
          id,
          [
            ...ownParameters,
            ...inputsParameters.flat(),
          ],
        );
      }
    }

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
    const newValues = new Map(get().values.entries());
    if (!allDefined(inputNodeIds)) { // Some input is not connected
      newValues.delete(id);
    } else {
      const inputsValues = inputNodeIds.map(id => {
        return get().values.get(id);
      });
      if (!allDefined(inputsValues)) {
        newValues.delete(id);
      } else {
        const ownValues = get().ownValues.get(id);
        if (!ownValues) throw new Error(`Node ${id} doesn't have own values.`);

        newValues.set(
          id,
          [
            ...ownValues,
            ...inputsValues.flat(),
          ],
        );
      }
    }

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
      get().updateParametersFromNode(id);
      get().updateValuesFromNode(id);
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
      parameters: new Map(serializableState.parameters),
      values: new Map(serializableState.values),
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

      get().updateParametersFromNode(generatedId);
      get().updateValuesFromNode(generatedId);
      get().updateTemplatesFromNode(generatedId);
    } else {
      console.warn("ERROR: adding node", event);
    }
  },
}));

export default useStore;
