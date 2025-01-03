globalThis.toggleAccordion = (event) => {
  const content = event.target.closest('section')?.querySelector('.accordion-content')

  event.target.toggleAttribute('aria-expanded')
  content?.toggleAttribute('aria-hidden')
}

globalThis.toggleNavPanel = (event) => {
  const panel = event.target.parentElement

  panel?.toggleAttribute('aria-expanded')
}

/**
 * Takes an input element id and extracts the value from it as a number if it has a value. Otherwise returns a default value provided
 * @param {String} elementId - Id of the element to get the value attribute from
 * @param {Number} defaultValue - Number to return if element Id does not have a valid value
 * @returns - The parsed value or default
 */
function valueFromElementOrDefault(elementId, defaultValue) {
  const value = document.getElementById(elementId)?.getAttribute('value')
  if (value === null || value === undefined) {
    return defaultValue
  }
  return parseFloat(value)
}

globalThis.setMermaidListeners = function setMermaidListeners() {
  const resetButton = document.getElementById('reset-pan-zoom')
  const zoomInButton = document.getElementById('zoom-in')
  const zoomOutButton = document.getElementById('zoom-out')

  const element = document.getElementById('mermaid-svg')
  if (!element) {
    document.getElementById('mermaid-output')?.removeAttribute('pending-listeners')
    return
  }
  setSizes()

  function onPan({ x, y }) {
    document.getElementById('currentPanX')?.setAttribute('value', x)
    document.getElementById('currentPanY')?.setAttribute('value', y)
  }

  function onZoom(newZoom) {
    document.getElementById('currentZoom')?.setAttribute('value', newZoom)
    onPan(panZoom.getPan())
  }

  const panZoom = svgPanZoom('#mermaid-svg', {
    maxZoom: 10,
    minZoom: -100,
  })

  panZoom.zoom(valueFromElementOrDefault('currentZoom', 1))
  panZoom.pan({
    x: valueFromElementOrDefault('currentPanX', 0),
    y: valueFromElementOrDefault('currentPanY', 0),
  })
  panZoom.setOnPan(onPan)
  panZoom.setOnZoom(onZoom)

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

  const listener = (ev) => {
    if (ev?.detail?.pathInfo?.requestPath !== '/update-layout') {
      return
    }
    panZoom.disablePan()
    panZoom.disableZoom()
    document.body.removeEventListener('htmx:beforeRequest', listener)
  }
  document.body.addEventListener('htmx:beforeRequest', listener)

  document.getElementById('mermaid-output')?.removeAttribute('pending-listeners')
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
