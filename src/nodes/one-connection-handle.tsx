import { Handle, HandleProps, useNodeConnections } from "@xyflow/react";

export function OneConnectionHandle(props: HandleProps) {
  const connections = useNodeConnections({
    handleType: props.type,
    handleId: props.id || undefined,
  });

  return (
    <Handle {...props} isConnectable={connections.length < 1} />
  );
}
