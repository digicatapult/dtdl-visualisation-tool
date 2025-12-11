/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml, type PropsWithChildren } from '@kitajs/html'
import express from 'express'
import { DtdlId } from '../models/strings.js'
import { PostHogScript } from './components/posthog.js'

export const parseError = (): JSX.Element => <p>Ontology Undefined</p>

export const Page = (props: PropsWithChildren<{ title: string; req?: express.Request }>): JSX.Element => (
  <>
    {'<!DOCTYPE html>'}
    <html lang="en">
      <head>
        <PostHogScript req={props.req} />
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
        <script src="/public/scripts/posthog.js"></script>
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

export const AccordionSection = (
  props: PropsWithChildren<{ heading: string; collapsed: boolean; Action?: () => JSX.Element }>
): JSX.Element => {
  const { heading, collapsed, Action, children } = props
  return (
    <section class="accordion-parent">
      <h3>
        <button
          class="accordion-button"
          {...(!collapsed && { 'aria-expanded': '' })}
          onclick="globalThis.toggleAccordion(event)"
        >
          {escapeHtml(heading)}
        </button>
        {Action ? (
          <div class="accordion-action">
            <Action />
          </div>
        ) : (
          <></>
        )}
      </h3>
      <div class="accordion-content" {...(collapsed && { 'aria-hidden': '' })}>
        <div>{children}</div>
      </div>
    </section>
  )
}

export const EditableText = ({
  edit,
  definedIn,
  putRoute,
  text,
  additionalBody,
  multiline,
  maxLength,
}: {
  edit: boolean
  definedIn: DtdlId
  putRoute: string
  text?: string
  additionalBody?: Record<string, string>
  multiline?: boolean
  maxLength?: number
}): JSX.Element => {
  const value = text ?? ''
  if (!edit) return <p>{escapeHtml(value)}</p>

  return (
    <form
      hx-put={`entity/${definedIn}/${putRoute}`}
      // trigger when textarea loses focus and value has changed
      hx-trigger={`blur[this.querySelector('textarea').value !== '${value}'] from:find textarea`}
      hx-vals={JSON.stringify(additionalBody)}
      hx-include="#sessionId, #svgWidth, #svgHeight, #currentZoom, #currentPanX, #currentPanY, #search, #diagram-type-select"
      hx-disabled-elt=".disable-during-update-req"
      hx-swap="outerHTML transition:true"
      hx-target="#mermaid-output"
      hx-indicator="#spinner"
    >
      <textarea
        name="value"
        class={`nav-panel-editable ${multiline ? 'multiline' : ''} disable-during-update-req`}
        contenteditable="plaintext-only"
        onkeyup="globalThis.validateDtdlValue(this)"
        {...(maxLength ? { maxlength: maxLength } : {})}
      >
        {escapeHtml(value)}
      </textarea>
    </form>
  )
}

export const EditableSelect = ({
  edit,
  definedIn,
  putRoute,
  text,
  additionalBody,
  options,
  disabled,
}: {
  edit: boolean
  definedIn: DtdlId
  putRoute: string
  text?: string
  additionalBody?: Record<string, string>
  options: readonly string[] | Array<{ value: string; label: string }>
  disabled?: boolean
}): JSX.Element => {
  // Normalize options to { value, label } format
  const normalizedOptions =
    typeof options[0] === 'string'
      ? (options as readonly string[]).map((opt) => ({ value: opt, label: opt }))
      : (options as Array<{ value: string; label: string }>)

  // Find the display label for the current value
  const displayLabel = text ? (normalizedOptions.find((o) => o.value === text)?.label ?? text) : ''

  if (!edit || disabled) return <p>{escapeHtml(displayLabel)}</p>

  return (
    <form
      hx-put={`entity/${definedIn}/${putRoute}`}
      hx-trigger={`change[this.querySelector('select').value !== '${text ?? ''}'] from:find select`}
      hx-vals={JSON.stringify(additionalBody)}
      hx-include="#sessionId, #svgWidth, #svgHeight, #currentZoom, #currentPanX, #currentPanY, #search, #diagram-type-select"
      hx-disabled-elt=".disable-during-update-req"
      hx-swap="outerHTML transition:true"
      hx-target="#mermaid-output"
      hx-indicator="#spinner"
    >
      <select name="value" class="nav-panel-editable disable-during-update-req">
        {!text && (
          <option value="" disabled selected>
            Select...
          </option>
        )}
        {normalizedOptions.map((option) => (
          <option value={option.value} {...(option.value === text && { selected: true })}>
            {escapeHtml(option.label)}
          </option>
        ))}
      </select>
    </form>
  )
}
