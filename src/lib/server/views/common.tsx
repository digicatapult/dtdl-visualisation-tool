import { escapeHtml, type PropsWithChildren } from '@kitajs/html'

export const parseError = (): JSX.Element => <p>Ontology Undefined</p>

const extractHtmxProps = (props: object): Record<`hx-${string}`, unknown> => {
  return Object.fromEntries(Object.entries(props).filter(([key]) => key.startsWith('hx-')))
}

export const Page = (props: PropsWithChildren<{ title: string }>): JSX.Element => (
  <>
    {'<!DOCTYPE html>'}
    <html lang="en">
      <head>
        <script src="/lib/htmx.org/htmx.min.js"></script>
        <script src="/lib/htmx-ext-json-enc/json-enc.js"></script>
        {/* Helpful for debugging */}
        {/* <meta
          name="htmx-config"
          content={JSON.stringify({ defaultSwapDelay: '1000', defaultSettleDelay: '1000' })}
        ></meta> */}
        <script src="/lib/svg-pan-zoom/svg-pan-zoom.min.js"></script>
        <script src="/public/scripts/callbacks.js" type="module"></script>
        <link rel="icon" type="image/ico" sizes="48x48" href="/public/images/favicon.ico" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;700&display=swap" />
        <link rel="stylesheet" type="text/css" href="/public/styles/main.css" />
        <link rel="stylesheet" type="text/css" href="/public/styles/mermaid.css" />
        <link rel="stylesheet" type="text/css" href="/public/styles/accordion.css" />
        <title>{escapeHtml(props.title)}</title>
      </head>
      <body hx-ext="json-enc">
        <div id="content-main" {...extractHtmxProps(props)}>
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
