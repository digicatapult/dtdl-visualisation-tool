import { escapeHtml, type PropsWithChildren } from '@kitajs/html'

export const parseError = (): JSX.Element => <p>Ontology Undefined</p>

export const Page = (props: PropsWithChildren<{ title: string }>): JSX.Element => (
  <>
    {'<!DOCTYPE html>'}
    <html lang="en">
      <head>
        <script src="/public/scripts/mermaidConfig.js" type="module"></script>
        <link rel="icon" type="image/ico" sizes="48x48" href="/public/images/favicon.ico" />
        <link rel="stylesheet" type="text/css" href="/public/styles/main.css" />
        <title>{escapeHtml(props.title)}</title>
      </head>
      <body>{props.children}</body>
    </html>
  </>
)
