document.body.addEventListener('toastEvent', (ev) => {
  const id = ev.detail.dialogId
  if (!id) {
    return
  }

  const dialog = document.getElementById(id)
  if (!dialog) {
    return
  }

  const toastWrapper = dialog.nextElementSibling
  const closeAllDetails = () => {
    dialog.querySelectorAll('details[open]').forEach((detail) => {
      detail.open = false
    })

    if (toastWrapper && toastWrapper.classList?.contains('toast-wrapper')) {
      toastWrapper.style.removeProperty('--toast-detail-open-height')
    }
  }

  const setToastDetailOpenHeight = (detailsElement) => {
    if (!toastWrapper || !toastWrapper.classList?.contains('toast-wrapper')) {
      return
    }

    if (!detailsElement || !detailsElement.open) {
      toastWrapper.style.removeProperty('--toast-detail-open-height')
      return
    }

    const content = detailsElement.querySelector('pre') ?? detailsElement.lastElementChild
    if (!content) {
      toastWrapper.style.removeProperty('--toast-detail-open-height')
      return
    }

    const rect = content.getBoundingClientRect()
    const styles = window.getComputedStyle(content)
    const marginTop = Number.parseFloat(styles.marginTop) || 0
    const marginBottom = Number.parseFloat(styles.marginBottom) || 0
    const total = rect.height + marginTop + marginBottom

    toastWrapper.style.setProperty('--toast-detail-open-height', `${total}px`)
  }

  setTimeout(() => {
    const detailsElement = document.getElementById(id)?.querySelector('details')
    if (detailsElement && detailsElement.open) {
      return
    }
    document.getElementById(id)?.close()
  }, 10000)

  // Close all open details elements when the toast is closed
  // Child toast will otherwise remain in a translated position
  dialog.addEventListener('close', () => {
    closeAllDetails()
  })

  // If the dialog loses its [open] attribute without firing a 'close' event
  // (e.g. manual DOM edits), force-close any expanded <details> to avoid gaps.
  const observer = new MutationObserver(() => {
    if (!dialog.hasAttribute('open')) {
      closeAllDetails()
    }
  })

  observer.observe(dialog, { attributes: true, attributeFilter: ['open'] })

  dialog.querySelectorAll('details').forEach((detailsElement) => {
    setToastDetailOpenHeight(detailsElement)
    detailsElement.addEventListener('toggle', () => {
      if (!dialog.hasAttribute('open') && detailsElement.open) {
        detailsElement.open = false
      }
      setToastDetailOpenHeight(detailsElement)
    })
  })
})
