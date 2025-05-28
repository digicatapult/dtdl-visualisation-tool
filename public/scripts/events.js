document.body.addEventListener('dtdlVisualisationError', (ev) => {
  const id = ev.detail.dialogId
  if (!id) {
    return
  }

  setTimeout(() => {
    const detailsElement = document.getElementById(id)?.querySelector('details');
    if (detailsElement && detailsElement.open) {
      return;
    }
    document.getElementById(id)?.close()
  }, 10000)

  // Close all open details elements when the toast is closed
  // Child toast will otherwise remain in a translated position
  const dialog = document.getElementById(id)
  dialog.addEventListener('close', () => {
    dialog.querySelectorAll('details[open]').forEach(detail => {
      detail.open = false
    })
  })

})