# Copilot Instructions for dtdl-visualisation-tool

## Overview

Node.js 24 + TypeScript 5.9 CLI application using Express 5, TSOA controllers, TSyringe DI, and server-side JSX (KitaJS) to visualize DTDL (Digital Twin Definition Language) ontologies. PostgreSQL database with Knex + Zod validation. HTMX for dynamic UI updates. PostHog analytics for server-side and client-side event tracking. GitHub OAuth for private repository access.

## Code Style

- **Module System**: ESNext, pure ES modules, always use `.js` extension in imports
- **Strict Mode**: Enabled except `noImplicitAny: false` (project preference)
- **Formatting**: Single quotes, no semicolons, 120 char lines (Prettier enforced)
- **Naming**:
  - Files: `camelCase.ts` or `PascalCase.ts` (for primary class exports)
  - Variables/functions: `camelCase`
  - Classes: `PascalCase` with suffixes (`Controller`, `Db`, `Generator`)
  - Constants: `UPPER_SNAKE_CASE`
  - Interfaces for DI: `ILogger`, `ICache`, `IPool` (with `I` prefix)
  - Domain types: No `I` prefix (`ModelRow`, `UpdateParams`)
- **Exports**: Prefer named exports; default exports only for primary module class
- **Imports**: Organize-imports plugin handles ordering (external → internal → types)
- **No `console.log`**: Use Pino logger (ESLint error)

## Project Structure

```
src/
├── index.ts                    # CLI entry (Commander)
├── lib/
│   ├── db/
│   │   ├── index.ts            # Database class (Knex + Zod)
│   │   ├── modelDb.ts          # Domain-specific DB operations
│   │   ├── types.ts            # Zod schemas & type definitions
│   │   └── migrations/         # Knex migrations
│   └── server/
│       ├── server.ts           # Express app setup
│       ├── ioc.ts              # TSyringe container config
│       ├── controllers/        # TSOA controllers (return HTML)
│       │   ├── HTMLController.ts  # Base for HTMX responses
│       │   └── __tests__/      # Unit tests (colocated)
│       ├── models/             # Domain types & constants
│       ├── utils/              # Business logic, parsers, cache
│       └── views/              # JSX components (KitaJS)
│           └── components/     # Feature-specific templates
test/
├── e2e/                        # Playwright tests (*.spec.ts)
└── integration/                # Mocha integration tests
```

## Architecture

**CLI Tool with Dual Commands:**
- `parse`: Parses DTDL files, loads default model into database, starts HTTP server
- `validate`: Validates DTDL files without starting server (exits with status code)

**Data Flow:**
1. CLI loads DTDL JSON files from directory
2. `Parser` validates and parses using `@digicatapult/dtdl-parser`
3. `ModelDb` stores in PostgreSQL (model, dtdl, dtdl_error tables)
4. `SvgGenerator` renders Mermaid diagrams (flowchart/classDiagram)
5. `Cache` (LRU) stores rendered SVGs to avoid re-rendering
6. Controllers return HTML (HTMX) for dynamic updates

**GitHub Integration:**
- OAuth flow: `/github/login` → GitHub → `/github/callback`
- Users authorize GitHub App to access repos
- `GithubRequest` uses Octokit with user tokens
- Private repo files fetched, validated, parsed like local files

## Common Patterns

### Dependency Injection (TSyringe)

```typescript
// Registration (ioc.ts)
container.register<ILogger>(Logger, { useValue: logger })

// Controller with injection
@injectable()
@Route('/ontology')
export class OntologyController extends HTMLController {
  constructor(
    private modelDb: ModelDb,                    // Auto-injected
    @inject(Logger) private logger: ILogger      // Symbol injection
  ) {
    super()
  }
}

// Singleton services
@singleton()
export class Env { /* ... */ }
```

### TSOA Controllers (HTMX Responses)

```typescript
@injectable()
@Route('/example')
export class ExampleController extends HTMLController {
  @SuccessResponse(200)
  @Produces('text/html')
  @Get('/:id')
  public async getExample(
    @Path() id: UUID,
    @Queries() params: UpdateParams
  ): Promise<HTML> {
    const model = await this.modelDb.getModelById(id)
    return this.html(<div>{escapeHtml(model.name)}</div>)
  }
}
```

### Database Operations

```typescript
// Use ModelDb abstraction, not Database directly
@singleton()
export class ModelDb {
  constructor(private db: Database, private parser: Parser) {}

  async getModelById(id: UUID): Promise<ModelRow> {
    const [model] = await this.db.get('model', { id })
    if (!model) throw new InternalError(`Failed to find model: ${id}`)
    return model
  }

  async insertModel(name: string, files: DtdlFile[]): Promise<UUID> {
    return this.db.withTransaction(async (db) => {
      const [{ id }] = await db.insert('model', { name })
      // ... more inserts
      return id
    })
  }
}
```

### Error Handling

```typescript
// Custom error hierarchy
export class InternalError extends HttpError {
  constructor(error?: Error | string | unknown) {
    super('Internal', 500, 'Internal Error', 
          'Please contact the technical team or try again later', 
          error.message)
  }
}

// Throw errors, don't catch and log
async operation(id: UUID): Promise<Result> {
  const [item] = await this.db.get('table', { id })
  if (!item) throw new InternalError(`Not found: ${id}`)
  return item
}
```

### Server-Side JSX (KitaJS)

```tsx
/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'

@singleton()
export default class Templates {
  public Component = ({ title, items }: Props): JSX.Element => (
    <section id="example">
      <h2>{escapeHtml(title)}</h2>
      <ul>
        {items.map(item => (
          <li hx-get={`/api/${escapeHtml(item)}`} hx-target="#result">
            {escapeHtml(item)}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

### Testing

```typescript
// Unit tests (Mocha + Chai + Sinon) - colocated in __tests__ directories
import { expect } from 'chai'
import { describe, it } from 'mocha'
import sinon from 'sinon'

describe('ModelDb', () => {
  afterEach(() => sinon.restore())

  const mockDb = { get: sinon.stub() } as unknown as Database
  const service = new ModelDb(mockDb, mockParser)

  it('should return model when found', async () => {
    mockDb.get.resolves([{ id: '1', name: 'Test' }])
    expect(await service.getModelById('1')).to.deep.equal({ id: '1', name: 'Test' })
  })

  it('should throw when not found', async () => {
    mockDb.get.resolves([])
    await expect(service.getModelById('invalid')).to.be.rejectedWith(InternalError)
  })
})

// E2E tests (Playwright + Testcontainers)
import { expect, test } from '@playwright/test'
import { waitForSuccessResponse } from './helpers/waitForHelpers.js'

test('search functionality', async ({ page }) => {
  await page.goto('./?diagramType=flowchart&search=Node')
  await page.waitForSelector("text='ConnectivityNodeContainer'")

  await page.focus('#search')
  await waitForSuccessResponse(
    page, 
    () => page.fill('#search', 'Container'),
    '/update-layout'
  )
  
  await expect(page.locator('#mermaid-output').getByText('Container')).toBeVisible()
})
```

**Testcontainers Setup:**
- `globalSetup.ts` brings up PostgreSQL and dtdl-visualiser containers before tests
- `globalTeardown.ts` tears down containers after all tests complete
- GitHub OAuth flow automated with test users (requires `GH_TEST_USER`, `GH_TEST_PASSWORD`, `GH_TEST_2FA_SECRET` env vars)
- PostHog mock server started on `POSTHOG_MOCK_PORT` to intercept analytics during tests

**Environment Variable Loading in Tests - CRITICAL:**

The application uses a dual-environment variable loading pattern that can cause unexpected behavior:

```typescript
// In src/lib/server/env/index.ts
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: 'test/test.env' })        // Loads test.env FIRST
  dotenv.config({ override: true })               // Loads .env SECOND with override: true
}
```

**Problem**: `.env` always overrides `test.env` due to `override: true`, meaning:
- ✅ **Good**: `.env` values used in development/manual testing
- ⚠️ **Bad**: `.env` values override test-specific settings during E2E tests
- ❌ **Critical**: External scripts (PostHog, Iubenda) enabled in `.env` can interfere with test flows

**Solution Pattern**:
1. Keep external integrations **disabled** in `.env` during active development:
   ```env
   POSTHOG_ENABLED=false
   IUBENDA_ENABLED=false
   ```
2. Use container-level environment variables in `testContainersSetup.ts` for test-specific configs
3. Create dedicated test containers with `*Enabled: true` flags when testing integrations
4. Run integration tests on separate ports (e.g., Iubenda tests on port 3002)

**Why This Matters**:
- External JavaScript widgets can block or interfere with automated OAuth flows
- GitHub OAuth in `globalSetup.ts` must complete before other tests run
- Test isolation requires predictable environment state

**Example** (from Iubenda integration):
```typescript
// test/globalSetup.ts - Start Iubenda container AFTER OAuth
const visualisationUIIubenda = await startVisualisationContainer(
  {
    containerName: 'dtdl-visualiser-iubenda',
    hostPort: 3002,
    iubendaEnabled: true,  // Override at container level
  },
  visualisationImage
)

// test/e2e/iubendaWidget.spec.ts
test.describe('Iubenda Widget', () => {
  test.use({ baseURL: 'http://localhost:3002' })  // Dedicated port
  // ...
})
```

**Best Practice**: When adding new external integrations:
1. Add environment flag (e.g., `SERVICE_ENABLED`)
2. Set to `false` by default in `.env`
3. Create dedicated test container if E2E testing is needed
4. Start integration containers AFTER OAuth in `globalSetup.ts`
5. Document the behavior in this file

### Running the Application for Playwright Testing

**Prerequisites:**
1. PostgreSQL must be running and migrated
2. Application must be built
3. Required environment variables must be set
4. Server must run as a background process

```bash
# Start database and run migrations
docker compose up -d
npm run db:migrate

# Build the application
npm run build

# Start server with required env vars (background process)
COOKIE_SESSION_KEYS=secret \
GH_APP_NAME=test \
GH_CLIENT_ID=test \
GH_CLIENT_SECRET=test \
node build/index.js parse -p sample/energygrid &

# Server will be available at http://localhost:3000 after parsing completes
```

**Critical Points:**
- **Working Directory**: Must run from `dtdl-visualisation-tool` directory
- **Background Process**: Use `&` or `isBackground: true` to keep server running
- **Startup Time**: Server takes several seconds to parse DTDL files before accepting connections
- **Required Env Vars**: App fails without all four: `COOKIE_SESSION_KEYS`, `GH_APP_NAME`, `GH_CLIENT_ID`, `GH_CLIENT_SECRET`

### Playwright MCP Tools for Test Development

Use these MCP browser tools for AI-assisted Playwright test development:

```typescript
// MCP server tool calls (not Playwright API methods)
// 1. Navigate and take snapshot to get current page state
await browser_navigate({ url: 'http://localhost:3000' })
await browser_snapshot()  // Always do this first!

// 2. Interact with elements using refs from snapshot for example
await browser_click({ ref: 'e42', element: 'Search button' })
await browser_type({ ref: 'e45', element: 'Search box', text: 'Equipment' })
await browser_select_option({ ref: 'e47', element: 'Diagram type', values: ['classDiagram'] })

// 3. Take new snapshot after page changes (refs expire!) for example
await browser_snapshot()

// 4. Capture screenshots for documentation for example
await browser_take_screenshot({ filename: 'search-results.png', fullPage: true })

// 5. Check for errors
await browser_console_messages({ onlyErrors: true })
```

**Key Tips:**
- Element `ref` values expire after page changes - always snapshot before clicking
- Use descriptive `element` names for better readability
- Screenshots can be full page or viewport-only
- Console messages help debug issues

### PostHog Analytics

```typescript
// Server-side tracking (fire-and-forget, non-blocking)
@injectable()
export class ExampleController extends HTMLController {
  constructor(private postHog: PostHogService) {}

  async action(req: Request, res: Response): Promise<HTML> {
    const octokitToken = req.signedCookies[octokitTokenCookie]
    const posthogId = req.signedCookies[posthogIdCookie]
    
    // Track event asynchronously
    this.postHog.trackUploadOntology(octokitToken, posthogId, {
      ontologyId: id,
      source: 'github',
      fileCount: files.length,
    }).catch((err) => this.logger.debug({ err }, 'PostHog tracking failed'))
    
    return this.html(<div>Success</div>)
  }
}
```

**Key Points:**
- Anonymous users tracked with UUID in `posthogIdCookie` (1-year expiry)
- GitHub users aliased to `github:username` after OAuth
- `ensurePostHogId` middleware sets cookie on first request
- Tracking is fire-and-forget; errors logged but don't block responses
- Events: `uploadOntology`, `updateOntologyView`, `nodeSelected`, `modeToggle`, `error`
- Enabled via `POSTHOG_ENABLED=true` + `NEXT_PUBLIC_POSTHOG_KEY`

### Async Patterns

```typescript
// Use async/await throughout
async getDtdlModelAndTree(id: UUID): Promise<{ model: DtdlObjectModel; fileTree: DtdlPath[] }> {
  const files = await this.getDtdlFiles(id)
  const parsedDtdl = await this.parser.parseAll(files)
  return { model: parsedDtdl, fileTree: this.parser.extractDtdlPaths(files, parsedDtdl) }
}

// Parallel operations with Promise.all
return Promise.all(
  files.map(async (file) => {
    const errors = await this.db.get('dtdl_error', { dtdl_id: file.id })
    return { ...file, errors }
  })
)
```

## Examples

### Import Pattern
```typescript
import express from 'express'
import { container, inject, injectable } from 'tsyringe'
import { ModelDb } from '../../db/modelDb.js'  // Always .js
import type { ILogger } from '../logger.js'
import packageJson from '../package.json' with { type: 'json' }
```

### Database Migration
```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('example', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('name', 255).notNullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.uuid('model_id').notNullable()
    table.foreign('model_id').references('model.id').onDelete('CASCADE')
  })
}
```

### HTMX Response Headers
```typescript
// Redirect after action
this.setHeader('HX-Redirect', '/ontology/view')

// Out-of-band swap
return this.html(
  <div id="main">{content}</div>,
  <div id="sidebar" hx-swap-oob="true">{sidebar}</div>
)

// Error handling
res.setHeader('HX-Trigger-After-Settle', JSON.stringify({ 
  toastEvent: { dialogId: toast.dialogId } 
}))
```

### Zod Type Validation
```typescript
const insertModel = z.object({
  name: z.string(),
  preview: z.string().nullable(),
  source: z.enum(['default', 'github', 'local']),
})

export type InsertModel = z.infer<typeof insertModel>

// Parse database results
return z.array(Zod.model.get).parse(await query)
```

## Things to Avoid

- ❌ **Forgetting `.js` extension** in imports (breaks ES modules)
- ❌ **Using `console.log`** (use `logger` from Pino)
- ❌ **Type assertions** instead of type narrowing with guards
- ❌ **Returning JSON from TSOA controllers** (return HTML for HTMX)
- ❌ **Unescaped user input in JSX** (always use `escapeHtml()`)
- ❌ **Using `Database` directly in controllers** (use `ModelDb` abstraction)
- ❌ **Multi-step DB writes without transactions** (use `db.withTransaction()`)
- ❌ **`container.resolve()` in constructors** (use constructor injection)
- ❌ **Default exports** (prefer named exports, except primary class)
- ❌ **Catching errors without rethrowing** (let errors bubble to middleware)
- ❌ **Raw SQL strings** (use Knex query builder with parameters)
- ❌ **Missing Zod validation on database reads**

## Pre-Commit Test Procedure

Before committing and pushing changes, run the complete test suite:

```bash
# 1. Lint check
npm run lint

# 2. Check for unused dependencies
npm run depcheck

# 3. Unit tests
npm run test:unit

# 4. Integration tests
npm run test:integration

# 5. Rate limit tests
npm run test:ratelimit

# 6. End-to-end tests
npm run test:playwright
```

**Critical**: All tests must pass before pushing. E2E tests require:
- PostgreSQL running (`docker compose up -d`)
- Database migrated (`npm run db:migrate`)
- Application built (`npm run build`)
- Test environment variables set (see README.md for GitHub test user credentials)

## Quick Commands

```bash
npm run build              # TSOA routes + SWC compile
npm run dev                # Dev server with hot reload
npm run db:migrate         # Apply migrations
npm run test:unit          # Unit tests (Mocha)
npm run test:integration   # Integration tests (Mocha)
npm run test:ratelimit     # Rate limit tests (Mocha)
npm run test:playwright    # E2E tests (Playwright)
npm run test:e2e          # E2E tests with UI
npm run lint               # ESLint check
npm run depcheck           # Check unused dependencies
```

## Key Type Patterns

```typescript
// Branded string types with JSDoc patterns
/**
 * @pattern [0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}
 */
export type UUID = string

/**
 * @pattern dtmi:\S*\S;[\d]*
 */
export type DtdlId = string

// DI interfaces
export type ILogger = typeof logger
export interface ICache {
  get<T>(key: string, parser: z.ZodType<T>): T | undefined
  set<T>(key: string, value: T): void
}
```
