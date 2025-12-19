/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { commonUpdateAttrs } from './constants.js'

const MermaidMessage = (message: JSX.Element, target: string): JSX.Element => (
  <div id="mermaid-output-message">
    <div class={target == 'mermaid-warning-message' ? 'warning-logo' : 'info-logo'} />
    <p>{escapeHtml(message)}</p>
  </div>
)

export const MermaidTarget = ({
  generatedOutput,
  target,
  swapOutOfBand,
}: {
  generatedOutput?: JSX.Element
  target: string
  swapOutOfBand?: boolean
}): JSX.Element => {
  const attributes = generatedOutput
    ? { 'hx-on::after-settle': `globalThis.setMermaidListeners()`, 'pending-listeners': '' }
    : {
        'hx-trigger': 'load',
        ...commonUpdateAttrs,
      }
  const output = generatedOutput ?? ''
  const content = target === 'mermaid-output' ? output : MermaidMessage(output, target)
  return (
    <div id="mermaid-output" class="mermaid" hx-swap-oob={swapOutOfBand ? 'true' : undefined} {...attributes}>
      {content}
    </div>
  )
}
