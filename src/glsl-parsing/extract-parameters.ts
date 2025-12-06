export type NodeParam = {
  name: string,
  type: string,
};

function getGLSLCodeNodeParams(code: string): NodeParam[] {
  // Match a function declaration or definition:
  // funcName ( ... )
  const funcName = "mainImage";
  const afterParamName = "fragCoord";
  const regex = new RegExp(funcName + "\\s*\\(([^)]*)\\)", "m");
  const match = code.match(regex);
  if (!match) throw new Error(`Did not find definition of function ${funcName}`);

  // Get the parameters inside (...)
  let paramList = match[1];
  paramList = paramList.replace(/\/\/.*$/gm, ""); // Remove line comments
  paramList = paramList.replace(/\/\*.*\*\//g, ""); // Remove block comments
  const params = paramList.split(",").map(p => p.trim());

  const idx = params.findIndex(p => p.includes(afterParamName));
  if (idx === -1) throw new Error(`Did not find function parameter ${afterParamName}.`);

  const after = params.slice(idx + 1);

  return after.map(p => {
    const cleaned = p.replace(/\b(in|out|inout|const)\b/g, "").trim();
    const parts = cleaned.split(/\s+/);
    const name = parts.pop();
    if (name === undefined) throw new Error("Parameter has no name or type");
    const type = parts.join(" ");
    return { name, type };
  });
}

export default getGLSLCodeNodeParams;
