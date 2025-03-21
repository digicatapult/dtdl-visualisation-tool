import { escapeHtml, type PropsWithChildren } from '@kitajs/html'
import { DtdlId } from '../models/strings'
import { UpdateType } from '../utils/dtdl/save'

export const parseError = (): JSX.Element => <p>Ontology Undefined</p>

export const Page = (props: PropsWithChildren<{ title: string }>): JSX.Element => (
  <>
    {'<!DOCTYPE html>'}
    <html lang="en">
      <head>
        <script src="/lib/htmx.org/htmx.min.js"></script>
        <script src="/lib/htmx-ext-json-enc/json-enc.js"></script>
        <script src="/lib/htmx-ext-response-targets/response-targets.js"></script>
        {/* Helpful for debugging */}
        {/* <meta
          name="htmx-config"
          content={JSON.stringify({ defaultSwapDelay: '1000', defaultSettleDelay: '1000' })}
        ></meta> */}
        <script src="/lib/svg-pan-zoom/svg-pan-zoom.min.js"></script>
        <script src="/public/scripts/callbacks.js" type="module"></script>
        <script src="/public/scripts/events.js" type="module"></script>
        <script src="/public/scripts/a11y.js" type="module"></script>
        <script src="/public/scripts/mpa.js"></script>
        <link rel="icon" type="image/ico" sizes="48x48" href="/public/images/favicon.ico" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;700&display=swap" />
        <link rel="stylesheet" type="text/css" href="/public/styles/main.css" />
        <link rel="stylesheet" type="text/css" href="/public/styles/mermaid.css" />
        <link rel="stylesheet" type="text/css" href="/public/styles/accordion.css" />
        <link rel="stylesheet" type="text/css" href="/public/styles/openOntology.css" />
        <link rel="stylesheet" type="text/css" href="/public/styles/github.css" />
        <title>{escapeHtml(props.title)}</title>
      </head>
      <body hx-ext="json-enc, response-targets" hx-target-error=".toast-wrapper:empty">
        <div id="toast-container">
          <div class="toast-wrapper" />
        </div>
        <div id="content-main" title={props.title}>
          {props.children}
        </div>
      </body>
    </html>
  </>
)

export const AccordionSection = (props: PropsWithChildren<{ heading: string; collapsed: boolean }>): JSX.Element => (
  <section>
    <h3>
      <button
        class="accordion-button"
        {...(!props.collapsed && { 'aria-expanded': '' })}
        onclick="globalThis.toggleAccordion(event)"
      >
        {escapeHtml(props.heading)}
      </button>
    </h3>
    <div class="accordion-content" {...(props.collapsed && { 'aria-hidden': '' })}>
      <div>{props.children}</div>
    </div>
  </section>
)

export const EditableText = ({
  edit,
  entityId,
  content,
  updateType,
  multiline,
}: {
  edit: boolean
  entityId: DtdlId
  content: string
  updateType: UpdateType
  multiline?: boolean
}): JSX.Element => {
  if (!edit) return <>{escapeHtml(content)}</>

  return (
    <form
      hx-post="save"
      hx-trigger="blur from:find textarea"
      hx-vals={`{"entityId": "${entityId}", "updateType": "${updateType}", "initialValue": "${content}"}`}
      hx-include="#sessionId, #svgWidth, #svgHeight, #currentZoom, #currentPanX, #currentPanY, #search, #diagramType"
      hx-swap="outerHTML transition:true"
      hx-target="#mermaid-output"
      hx-indicator="#spinner"
    >
      <textarea
        name="content"
        class={`nav-panel-editable ${multiline ? 'multiline' : ''}`}
        contenteditable="plaintext-only"
      >
        {escapeHtml(content)}
      </textarea>
    </form>
  )
}
