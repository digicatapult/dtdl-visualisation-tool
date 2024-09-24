# dtdl-visualisation-tool

A CLI tool for visualising dtdl ontologies.

## Prerequisites

`node` >= 20
`dotnet` [CLI](https://learn.microsoft.com/en-us/dotnet/core/install/)
Run `dotnet workload install wasm-tools` to install `wasm-tools`

## Getting started

The build command should be run first to create the converted ts files.

```shell
npm run build
```

Create a release build of the DTDLParser WASM interop, outputs to the typescript build directory under `build/interop/`

```shell
npm run interop:build
```

To start the basic application

```shell
npm run local
```

To install npm CLI tool. It will be linked to local binaries so can be executed as `dtdl-visualiser`

```shell
npm i -g
```

## using CLI

```sh
dtdl-visualiser help
```

## parse

Attempts to parse every DTDL JSON file within the supplied directory and its sub-directories. Files are combined and parsed as a single JSON to ensure resolutions between entities are resolved correctly. If parsing is successful, the server starts.

```sh
dtdl-visualiser parse -P <http-server-port> -p <path-to-dtdl-ontology-directory>
```

For example:

```sh
dtdl-visualiser parse -p dtdl/simple
dtdl-visualiser parse -p dtdl/error
```

## validate

Attempts to validate every DTDL JSON file within the supplied directory and its sub-directories. Files are validated one at a time. The process exits immediately if a file fails validation.

```sh
dtdl-visualiser validate -p <path-to-dtdl-ontology-directory>
```

For example:

```sh
dtdl-visualiser validate -p dtdl
```

By default, validation ignores `ResolutionException`s that occur when parsing a single entity that references another entity. To include Resolution exceptions in validation add `-r`:

```sh
dtdl-visualiser validate -p dtdl -r
```
