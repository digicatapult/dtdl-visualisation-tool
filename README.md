# dtdl-visualisation-tool

A CLI tool for visualising dtdl ontologies.

## Prerequisites

`node` >= 20
Docker

## Getting started

The build command should be run first to create the converted ts files.

```shell
npm i
npm run build
```

Start postgres and migrate to latest:

```sh
docker compose up -d
npm run db:migrate
```

To install npm CLI tool. It will be linked to local binaries so can be executed as `dtdl-visualiser`

```shell
npm i -g
```

## using CLI

```sh
dtdl-visualiser help
```

### parse

Attempts to parse every DTDL JSON file within the supplied directory and its sub-directories. Files are combined and parsed as a single JSON to ensure resolutions between entities are resolved correctly. If parsing is successful, the server starts.

```sh
dtdl-visualiser parse -P <http-server-port> -p <path-to-dtdl-ontology-directory>
```

For example:

```sh
dtdl-visualiser parse -p sample/energygrid
```

Go to http://localhost:3000

### validate

Attempts to validate every DTDL JSON file within the supplied directory and its sub-directories. Files are validated one at a time. The process exits immediately if a file fails validation.

```sh
dtdl-visualiser validate -p <path-to-dtdl-ontology-directory>
```

For example:

```sh
dtdl-visualiser validate -p sample/energygrid
```

By default, validation ignores `ResolutionException`s that occur when parsing a single entity that references another entity. To include Resolution exceptions in validation add `-r`:

```sh
dtdl-visualiser validate -p sample/energygrid -r
```

## Docker

The application can be run in Docker. `sample/energygrid` is automatically parsed at start up. **The image runs as `amd64` - it is very slow when emulated by Rosetta**.

`docker build -t dtdl-visualiser .` and run with `docker run -p 3000:3000 dtdl-visualiser`.

## Environment variables

| variable name    | required | default                   | description                                                                       |
| ---------------- | -------- | ------------------------- | --------------------------------------------------------------------------------- |
| LOG_LEVEL        | n        | info                      | Logging level. Valid values are [ trace , debug , info , warn , error , fatal ]   |
| CACHE_TTL        | n        | `1000 * 60 * 5`           | Time to live (in seconds) for cached diagrams                                     |
| CACHE_SIZE       | n        | `100`                     | Maximum number of diagrams to cache                                               |
| SEARCH_THRESHOLD | n        | `0.4`                     | Threshold for a fuzzy search match. 0.0 is a perfect match, 1.0 matches anything. |
| DB_HOST          | n        | `localhost`               | The database hostname / host                                                      |
| DB_NAME          | n        | `dtdl-visualisation-tool` | The database name                                                                 |
| DB_USERNAME      | n        | `postgres`                | The database username                                                             |
| DB_PASSWORD      | n        | `postgres`                | The database password                                                             |
| DB_PORT          | n        | `5432`                    | The database port number                                                          |

## Testing

This repository consists of two test types: [**e2e**, **unit**] and we are using a combination of `mocha`, `chai` and `sinon` frameworks.

### Unit Testing

Unit tests are per service/module or class, and follow the below pattern. In **tests** directories collated with the units they test.

```sh
# example
├── __tests__
│   ├── example.test.ts
│   ├── __tests__
│   │   ├── index.test.ts
├── __tests__
....
```

Unit tests are executed by running:

```sh
npm run test:unit
```

### End to End Testing

E2E tests use `playwright` and are described in`test/`.

Install dependencies for playwright with:

```sh
npx playwright install
```

Then run:

```sh
npm run test:e2e
```

A browser window will pop up where you can run tests and follow their progress. Alternatively run the tests without the ui:

```sh
npm run test:playwright
```

Test results are placed in `playwright-report`.
