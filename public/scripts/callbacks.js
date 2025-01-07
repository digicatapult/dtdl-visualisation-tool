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
let panZoom = null
const styles = window.getComputedStyle(document.getElementById('minimap'))

const desiredAspectRatio = parseFloat(styles.width) / parseFloat(styles.height)
const contentMain = document.querySelector('#content-main')

globalThis.setMermaidListeners = function setMermaidListeners() {
  console.log('Setting mermaid listeners')
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
    minimap()
  }

  function onZoom(newZoom) {
    document.getElementById('currentZoom')?.setAttribute('value', newZoom)
    onPan(panZoom.getPan())
    minimap()
  }

  panZoom = svgPanZoom('#mermaid-svg', {
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
  minimap()
}

function setSizes() {
  const wrapper = document.getElementById('mermaid-wrapper')
  if (!wrapper) {
    throw new Error('Could not find mermaid-wrapper element')
  }
  const boundingRec = wrapper.getBoundingClientRect()
  document.getElementById('svgWidth')?.setAttribute('value', `${boundingRec.width}`)
  document.getElementById('svgHeight')?.setAttribute('value', `${boundingRec.height}`)

  const svg = document.querySelector('#mermaid-output #mermaid-svg')
  svg?.setAttribute('viewBox', `0 0 ${boundingRec.width} ${boundingRec.height}`)
  svg?.setAttribute('width', `${boundingRec.width}`)
  svg?.setAttribute('height', `${boundingRec.height}`)
}

function minimap() {
  const svg = document.querySelector('#mermaid-output #mermaid-svg')
  const viewport = document.querySelector('#mermaid-output .svg-pan-zoom_viewport')

  const minimapSvg = document.querySelector('#minimap #mermaid-svg')

  if (svg && minimapSvg && viewport) {
    const width = svg.getBoundingClientRect().width
    const height = svg.getBoundingClientRect().height
    const vW = viewport.getBBox().width
    const vH = viewport.getBBox().height

    const actualAspectRatio = vW / vH

    const minimapHeight = actualAspectRatio < desiredAspectRatio ? 100 : 100 * (desiredAspectRatio / actualAspectRatio)
    const minimapWidth = actualAspectRatio < desiredAspectRatio ? 100 * (actualAspectRatio / desiredAspectRatio) : 100

    contentMain.style.setProperty('--minimap-width', `${minimapWidth}%`)
    contentMain.style.setProperty('--minimap-height', `${minimapHeight}%`)

    const scale = panZoom.getZoom()
    const { x, y } = panZoom.getPan()
    const translateX = x / scale
    const translateY = y / scale

    const lensWidth = ((width / vW) * 100) / scale + '%'
    const lensHeight = ((height / vH) * 100) / scale + '%'

    contentMain.style.setProperty('--minimap-lens-width', lensWidth)
    contentMain.style.setProperty('--minimap-lens-height', lensHeight)
    contentMain.style.setProperty('--lens-left', `${((-1 * translateX) / vW) * 100}%`)
    contentMain.style.setProperty('--lens-top', `${((-1 * translateY) / vH) * 100}%`)
  }
}

setSizes()
minimap()
addEventListener('resize', setSizes)
addEventListener('resize', minimap)
