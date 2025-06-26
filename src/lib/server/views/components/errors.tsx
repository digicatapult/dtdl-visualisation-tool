/// <reference types="@kitajs/html/htmx.d.ts" />

import { randomUUID } from 'node:crypto'

import { escapeHtml } from '@kitajs/html'
import { ErrorCategory, HttpError, InternalError } from '../../errors.js'
import { Page } from '../common.js'

const categoryToClass = (category: ErrorCategory): 'internal-error' | 'data-error' | 'temp-error' => {
  switch (category) {
    case 'Internal':
      return 'internal-error'
    case 'Temporary':
      return 'temp-error'
    case 'User':
      return 'data-error'
  }
}

export function errorToast(error: unknown) {
  const httpError = error instanceof HttpError ? error : new InternalError(error)
  const dialogId = randomUUID()
  const modellingErrorDetail = () => {
    try {
      const parsed = JSON.parse(httpError.message)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return httpError.message
    }
  }

  return {
    dialogId,
    response: (
      <>
        <dialog open id={dialogId}>
          <img
            src="/public/images/warning.svg"
            width="54px"
            height="50px"
            class={categoryToClass(httpError.category)}
          />
          <div class="toast-content">
            <h1>{escapeHtml(httpError.userTitle)}</h1>
            {httpError.message ? (
              <details class="toast-detail">
                <summary class="detail-summary">{escapeHtml(httpError.userMessage)}</summary>
                <pre>{escapeHtml(modellingErrorDetail())}</pre>
              </details>
            ) : (
              <p>{escapeHtml(httpError.userMessage)}</p>
            )}
          </div>
          <form method="dialog">
            <button class="modal-button" />
          </form>
        </dialog>
        <div class="toast-wrapper" />
      </>
    ),
  }
}

export function ErrorPage(message: string, statusCode?: number) {
  return (
    <Page title={'UKDTC'}>
      <section id="toolbar">
        <form id="search-panel">
          <h2>
            <a href="/">UKDTC</a>
          </h2>
        </form>
      </section>
      <div id="mermaid-wrapper">
        <div id="mermaid-output-message">
          <div class="warning-logo" />
          <h2>{statusCode}</h2>
          <p>{escapeHtml(message)}</p>
        </div>
      </div>
    </Page>
  )
}
