const resetButton = document.getElementById('reset-pan-zoom')
const zoomInButton = document.getElementById('zoom-in')
const zoomOutButton = document.getElementById('zoom-out')

globalThis.toggleAccordion = (event) => {
  const section = event.target.closest('section')
  if (!section) return

  const button = section.querySelector('button')
  const content = section.querySelector('.accordion-content')

  if (button?.getAttribute('aria-expanded') === 'true') {
    button?.setAttribute('aria-expanded', 'false')
    content?.setAttribute('aria-hidden', 'true')
  } else {
    button?.setAttribute('aria-expanded', 'true')
    content?.setAttribute('aria-hidden', 'false')
  }
}

globalThis.setMermaidListeners = function setMermaidListeners() {
  if (document.getElementById('mermaid-svg')) {
    const panZoom = svgPanZoom('#mermaid-svg', { maxZoom: 20 })
    resetButton.onclick = () => {
      panZoom.resetZoom()
      panZoom.resetPan()
    }
    zoomInButton.onclick = () => {
      panZoom.zoomIn()
    }
    zoomOutButton.onclick = () => {
      panZoom.zoomOut()
    }
  }
}
