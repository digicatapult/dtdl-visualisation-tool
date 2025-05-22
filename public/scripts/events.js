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
})