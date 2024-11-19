const resetButton = document.getElementById('reset-pan-zoom')
const zoomInButton = document.getElementById('zoom-in')
const zoomOutButton = document.getElementById('zoom-out')

globalThis.toggleAccordion = (event) => {
  const content = event.target.closest('section')?.querySelector('.accordion-content')

  event.target.toggleAttribute('aria-expanded')
  content?.toggleAttribute('aria-hidden')
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
