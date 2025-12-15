import { type BaseNode } from "@/nodes/base-node";
import { Edge } from "@xyflow/react";

export const initialNodes: BaseNode[] = [
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

export const initialEdges: Edge[] = [
  // {
  //   id: "n1-n2",
  //   source: "n1",
  //   target: "n2",
  //   sourceHandle: "out",
  //   targetHandle: "in",
  // },
];
