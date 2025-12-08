import { escapeHtml } from '@kitajs/html'
import { randomUUID } from 'node:crypto'

export function successToast(title: string, link?: string, linkText?: string) {
  const dialogId = randomUUID()
  const showLink = link !== undefined
  return {
    dialogId,
    response: (
      <>
        <dialog open id={dialogId}>
          <img src="/public/images/tick-green.svg" class="tick" />
          <div class="toast-content">
            <h1>{escapeHtml(title)}</h1>
            <div class="toast-detail">
              {showLink && (
                <p>
                  <a href={link} class="authorise-link" target="_blank">
                    {escapeHtml(linkText)} ↗
                  </a>
                </p>
              )}
            </div>
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
