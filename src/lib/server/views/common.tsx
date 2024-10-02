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
        <script src="/public/scripts/mermaidConfig.js" type="module"></script>
        <link rel="icon" type="image/ico" sizes="48x48" href="/public/images/favicon.ico" />
        <link rel="stylesheet" type="text/css" href="/public/styles/main.css" />
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
