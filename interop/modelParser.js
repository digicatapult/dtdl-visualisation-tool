import { dotnet } from './_framework/dotnet.js'

const { getAssemblyExports, getConfig } = await dotnet.withDiagnosticTracing(false).create()

const config = getConfig()
const assemblyExports = await getAssemblyExports(config.mainAssemblyName)

const parserVersion = () => assemblyExports.DtdlParserJSInterop.ModelParserInterop.ParserVersion()
const parse = (dtdl) => assemblyExports.DtdlParserJSInterop.ModelParserInterop.Parse(dtdl)

export { parse, parserVersion }
