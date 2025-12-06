import { escapeHtml } from '@kitajs/html'
import { randomUUID } from 'node:crypto'

export function successToast(title: string, message: string, link?: string, linkText?: string) {
  const dialogId = randomUUID()
  return {
    dialogId,
    response: (
      <>
        <dialog open id={dialogId}>
          <img src="/public/images/tick-circle.svg" class="tick-logo" />
          <div class="toast-content">
            <h1>{escapeHtml(title)}</h1>
            <p>{escapeHtml(message)}</p>
            {link && (
              <p>
                <a href={link} target="_blank">
                  {linkText}
                </a>
              </p>
            )}
          </div>
          <form method="dialog">
            <button class="close-button">×</button>
          </form>
        </dialog>
        <div class="toast-wrapper" />
      </>
    ),
  }
}
