const resetButton = document.getElementById('reset-pan-zoom')
const zoomInButton = document.getElementById('zoom-in')
const zoomOutButton = document.getElementById('zoom-out')

globalThis.toggleAccordion = (event) => {
  const content = event.target.closest('section')?.querySelector('.accordion-content')

  event.target.toggleAttribute('aria-expanded')
  content?.toggleAttribute('aria-hidden')
}

globalThis.setMermaidListeners = function setMermaidListeners() {
  const element = document.getElementById('mermaid-svg')
  if (!element) {
    return
  }

  const panZoom = svgPanZoom('#mermaid-svg', { maxZoom: 10, minZoom: -100 })
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

function setSizes() {
  const wrapper = document.getElementById('mermaid-wrapper')
  if (!wrapper) {
    throw new Error('Could not find wrapper element')
  }
  const boundingRec = wrapper.getBoundingClientRect()

  document.getElementById('mermaid-svg')?.setAttribute('viewBox', `0 0 ${boundingRec.width} ${boundingRec.height}`)
  document.getElementById('svgWidth')?.setAttribute('value', `${boundingRec.width}`)
  document.getElementById('svgHeight')?.setAttribute('value', `${boundingRec.height}`)
}

setSizes()
addEventListener('resize', setSizes)
