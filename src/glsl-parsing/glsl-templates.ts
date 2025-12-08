export function insertTemplateIntoInputCalls(
  id: string,
  outputTemplate: string,
  inputTemplates: string[],
): string {
  let result = outputTemplate;
  for (let i = 0; i < inputTemplates.length; i++) {
    const inputTemplate = inputTemplates[i];

    const regexStringDefinition = `\\$INPUT${i}\\s*\\(\\s*([a-zA-Z0-9_]+)\\s*,\\s*([a-zA-Z0-9_]+)\\s*\\)`
    const regex = new RegExp(regexStringDefinition, "g");
    const matches = [...result.matchAll(regex)];
    // console.log(matches);

    for (const match of matches) {
      const inputCallToReplace = match[0];

      const outputVar = match[1];
      const uvVar = match[2];

      if (inputCallToReplace === undefined) throw new Error("No input call");
      if (outputVar === undefined) throw new Error("No output variable");
      if (uvVar === undefined) throw new Error("No uv variable");

      // Prepend the output and uv coordinates variables to fix the case
      // in wich the output variable name is inside the input template.
      // For example if I apply two times the same node.
      const processedInputTemplate = inputTemplate
        .replace(/^[\s\n]*/, "")
        .replace(/[\s\n]*$/, "")
        .replaceAll(/^/gm, "  ")
        .replaceAll("$OUT", `${id}_${outputVar}`)
        .replaceAll("$UV", `${id}_${uvVar}`);

      const regexVars = new RegExp(`(\\W)(${outputVar}|${uvVar})(\\W)`, "g");

      const processedInputCallToReplace = inputCallToReplace
        .replaceAll(regexVars, `$1${id}_$2$3`)

      // TODO: do something more robust that doesnt replace
      // ocurrences of a variable inside other symbols
      result = result
        .replaceAll(regexVars, `$1${id}_$2$3`)
        .replace(processedInputCallToReplace, `{\n${processedInputTemplate}\n}`);
    }
  }
  return result;
}

export function prependUniformVariablesWithId(id: string, template: string, uniformNames: string[]): string {
  let result = template;
  for (const name of uniformNames) {
    result = result.replaceAll(`\$${name}`, `${id}_${name}`);
  }
  return result;
}
