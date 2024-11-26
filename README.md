# dtdl-visualisation-tool

A CLI tool for visualising dtdl ontologies.

## Prerequisites

`node` >= 20

## Getting started

The build command should be run first to create the converted ts files.

```shell
npm run build
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

### visualise render of parsed ontology

```sh
dtdl-visualiser parse -p dtdl/simple
```

Go to http://localhost:3000

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

## Environment variables

| variable name    | required | default         | description                                                                       |
| ---------------- | -------- | --------------- | --------------------------------------------------------------------------------- |
| LOG_LEVEL        | n        | info            | Logging level. Valid values are [ trace , debug , info , warn , error , fatal ]   |
| CACHE_TTL        | n        | `1000 * 60 * 5` | Time to live (in seconds) for cached diagrams                                     |
| CACHE_SIZE       | n        | `100`           | Maximum number of diagrams to cache                                               |
| SEARCH_THRESHOLD | n        | `0.3`           | Threshold for a fuzzy search match. 0.0 is a perfect match, 1.0 matches anything. |
