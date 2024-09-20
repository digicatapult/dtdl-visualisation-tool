export const getInterop = async (): Promise<Parser> => {
  const module = await import('../../../interop/modelParser.js')
  return module as Parser
}

export interface Parser {
  parse: (file: string) => string
  parserVersion: () => string
}
