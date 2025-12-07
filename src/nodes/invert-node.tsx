import { NodeProps, useNodeConnections, useNodesData, useReactFlow } from "@xyflow/react";
import { BaseNodeComponent, BaseNode } from "./base-node";
import { useEffect } from "react";
import { insertTemplateIntoInputCalls } from "@/glsl-parsing/glsl-templates";

const invertNodeCodeTemplate = `
vec4 input1;
vec2 uv1 = $UV;
$INPUT0(input1, uv1)
vec3 col = vec3(1.0) - input1.xyz;
$OUT = vec4(col, 1.0);
`;

function InvertNode({ id, data }: NodeProps<BaseNode>) {
  const { updateNodeData } = useReactFlow();

  const connection = useNodeConnections({
    handleType: "target",
    handleId: "in",
  });

  const inputData = useNodesData<BaseNode>(connection?.[0]?.source);

  useEffect(() => {
    const finalCodeTemplate = inputData?.data.shaderTemplate !== undefined
      ? insertTemplateIntoInputCalls(id, invertNodeCodeTemplate, [inputData?.data.shaderTemplate])
      : undefined;

    updateNodeData(id, {
      shaderTemplate: finalCodeTemplate,
      uniformNames: inputData?.data?.uniformNames,
      uniformValues: inputData?.data?.uniformValues,
    });
  }, [inputData, id, updateNodeData]);

  return (
    <BaseNodeComponent
      name="Invert"
      inputs={[{ name: "in" }]}
      outputs={[{ name: "out" }]}
      shaderTemplate={data.shaderTemplate}
      uniformNames={data.uniformNames}
      uniformValues={data.uniformValues}
    >
      {data.shaderTemplate}
    </BaseNodeComponent>
  );
}

export default InvertNode;
