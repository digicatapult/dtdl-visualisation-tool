import { escapeHtml } from '@kitajs/html'
import { randomUUID } from 'node:crypto'

export function successToast(title: string, link?: string, linkText?: string) {
  const dialogId = randomUUID()
  return {
    dialogId,
    response: (
      <>
        <dialog open id={dialogId}>
          <img src="/public/images/tick-circle.svg" class="tick" />
          <div class="toast-content">
            <h1>{escapeHtml(title)}</h1>
            {link && (
              <p>
                <a href={link} class="authorise-link" target="_blank">
                  {linkText} ↗
                </a>
              </p>
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
