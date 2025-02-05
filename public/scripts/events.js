document.body.addEventListener('dtdlVisualisationError', (ev) => {
  const id = ev.detail.dialogId
  if (!id) {
    return
  }

  setTimeout(() => {
    document.getElementById(id)?.close()
  }, 10000)
})