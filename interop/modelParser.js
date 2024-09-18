import { dotnet } from './_framework/dotnet.js'
const { getAssemblyExports, getConfig } = await dotnet.withDiagnosticTracing(false).create()

const config = getConfig()
const assemblyExports = await getAssemblyExports(config.mainAssemblyName)
await dotnet.run()
console.log('interop')
const ParserVersion = () => assemblyExports.DtdlParserJSInterop.ModelParserInterop.ParserVersion()
const Parse = (dtdl) => assemblyExports.DtdlParserJSInterop.ModelParserInterop.Parse(dtdl)

export { Parse, ParserVersion }
