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
  setSizes()

  const panZoom = svgPanZoom('#mermaid-svg', {
    maxZoom: 10,
    minZoom: -100,
    onZoom: (newZoom) => {
      document.getElementById('currentZoom')?.setAttribute('value', newZoom)
    },
    onPan: ({ x, y }) => {
      document.getElementById('currentPanX')?.setAttribute('value', x)
      document.getElementById('currentPanY')?.setAttribute('value', y)
    },
  })
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
    throw new Error('Could not find mermaid-wrapper element')
  }
  const boundingRec = wrapper.getBoundingClientRect()
  document.getElementById('svgWidth')?.setAttribute('value', `${boundingRec.width}`)
  document.getElementById('svgHeight')?.setAttribute('value', `${boundingRec.height}`)

  const svg = document.getElementById('mermaid-svg')
  svg?.setAttribute('viewBox', `0 0 ${boundingRec.width} ${boundingRec.height}`)
  svg?.setAttribute('width', `${boundingRec.width}`)
  svg?.setAttribute('height', `${boundingRec.height}`)
}

setSizes()
addEventListener('resize', setSizes)
