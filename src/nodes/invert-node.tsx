import { NodeProps, useNodeConnections, useNodesData, useReactFlow } from "@xyflow/react";
import BaseNodeComponent, { BaseNode } from "./base-node";
import { useEffect } from "react";

const invertNodeCodeTemplate = `
vec4 input1;
$INPUT1(input1, $UV)
vec3 col = vec3(1.0) - input1.xyz;
$OUT = vec4(col, 1.0);
`;

function InvertNode({ id, data }: NodeProps<BaseNode>) {
  const { updateNodeData } = useReactFlow();

  const connection = useNodeConnections({
    handleType: "target",
    handleId: "in",
  });

  const inputData = useNodesData(connection?.[0]?.source);

  useEffect(() => {
    const inputCodeTemplate = (inputData?.data.shaderTemplate as string | null)
      ?.replaceAll("$UV", "$UV")
      ?.replaceAll("$OUT", "input1");

    const finalCodeTemplate = inputCodeTemplate !== undefined
      ? invertNodeCodeTemplate
        .replaceAll("$INPUT1(input1, $UV)", `{\n${inputCodeTemplate}\n}`)
      : undefined;

    updateNodeData(id, {
      shaderTemplate: finalCodeTemplate,
      uniformsNamesAndValues: inputData?.data.uniformsNamesAndValues,
    });
  }, [inputData, id, updateNodeData]);

  return (
    <BaseNodeComponent
      name="Invert"
      inputs={[{ name: "in" }]}
      outputs={[{ name: "out" }]}
      shaderTemplate={data.shaderTemplate}
      uniforms={data.uniformsNamesAndValues}
    >
      {data.shaderTemplate}
    </BaseNodeComponent>
  );
}

export default InvertNode;
