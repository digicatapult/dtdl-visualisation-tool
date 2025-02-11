/// <reference types="@kitajs/html/htmx.d.ts" />

import { randomUUID } from 'node:crypto'

import { escapeHtml } from '@kitajs/html'
import { ErrorCategory, HttpError, InternalError } from '../../errors.js'

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
            <p>{escapeHtml(httpError.userMessage)}</p>
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
