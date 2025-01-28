document.body.addEventListener('htmx:configRequest', (ev) => {
  if (ev?.detail?.path !== 'update-layout') {
    return
  }
  const a11y = []
  if (
    window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
    window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true
  ) {
    a11y.push('reduce-motion')
  }
  ev.detail.parameters.a11y = a11y
})
