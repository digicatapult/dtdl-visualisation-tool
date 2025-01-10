/// <reference types="@kitajs/html/htmx.d.ts" />

import { ErrorCategory, HttpError, InternalError } from '../../errors'

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

  return (
    <>
      <dialog open>
        <img src="public/images/warning.svg" width="54px" height="50px" class={categoryToClass(httpError.category)} />
        <div class="toast-content">
          <h1>{httpError.userTitle}</h1>
          <p>{httpError.userMessage}</p>
        </div>
        <form method="dialog">
          <button />
        </form>
      </dialog>
      <div class="toast-wrapper" />
    </>
  )
}
