let panZoom = null

globalThis.toggleAccordion = (event) => {
  const content = event.target.closest('section')?.querySelector('.accordion-content')

  event.target.toggleAttribute('aria-expanded')
  content?.toggleAttribute('aria-hidden')
}

globalThis.toggleNavPanel = (event) => {
  const panel = event.target.parentElement

  panel?.toggleAttribute('aria-expanded')
}

htmx.on('htmx:load', (e) => {
  if (e?.detail.elt.baseURI.includes('github')) {
    document.getElementById('github-modal').showModal()

    // Update the browser history to remove query parameters
    window.history.replaceState({}, '', '/')
  }
})

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
    setMinimap()
  }

  function onZoom(newZoom) {
    document.getElementById('currentZoom')?.setAttribute('value', newZoom)
    onPan(panZoom.getPan())
    setMinimap()
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
    if (ev?.detail?.pathInfo?.requestPath !== 'update-layout') {
      return
    }
    panZoom.disablePan()
    panZoom.disableZoom()
    document.body.removeEventListener('htmx:beforeRequest', listener)
  }
  document.body.addEventListener('htmx:beforeRequest', listener)

  document.getElementById('mermaid-output')?.removeAttribute('pending-listeners')

  setMinimap()
}

function setSizes() {
  const wrapper = document.getElementById('mermaid-wrapper')
  if (!wrapper) {
    return
  }
  const boundingRec = wrapper.getBoundingClientRect()
  document.getElementById('svgWidth')?.setAttribute('value', `${boundingRec.width}`)
  document.getElementById('svgHeight')?.setAttribute('value', `${boundingRec.height}`)

  const svg = document.querySelector('#mermaid-output #mermaid-svg')
  svg?.setAttribute('viewBox', `0 0 ${boundingRec.width} ${boundingRec.height}`)
  svg?.setAttribute('width', `${boundingRec.width}`)
  svg?.setAttribute('height', `${boundingRec.height}`)

  setMinimap()
}

function setMinimap() {
  const contentMain = document.querySelector('#content-main')
  const mainSvg = document.querySelector('#mermaid-output #mermaid-svg')
  const mainViewport = document.querySelector('#mermaid-output .svg-pan-zoom_viewport')
  const minimap = document.getElementById('minimap')

  if (!(contentMain && mainSvg && mainViewport && minimap)) return

  const minimapStyles = window.getComputedStyle(minimap)
  const desiredAspectRatio = parseFloat(minimapStyles.width) / parseFloat(minimapStyles.height)

  const { width: viewportSvgWidth, height: viewportSvgHeight } = mainSvg.getBoundingClientRect()
  const { width: rawSvgWidth, height: rawSvgHeight } = mainViewport.getBBox()

  const actualAspectRatio = rawSvgWidth / rawSvgHeight // aspect ratio of the generated svg
  const scaleFactor = actualAspectRatio / desiredAspectRatio

  // make the minimap svg as big as possible within bounds of the minimap
  const minimapSvgWidth = actualAspectRatio < desiredAspectRatio ? 100 * scaleFactor : 100
  const minimapSvgHeight = actualAspectRatio < desiredAspectRatio ? 100 : 100 / scaleFactor

  contentMain.style.setProperty('--minimap-svg-width', `${minimapSvgWidth}%`)
  contentMain.style.setProperty('--minimap-svg-height', `${minimapSvgHeight}%`)

  const zoomScale = panZoom.getZoom()
  const { x, y } = panZoom.getPan()

  // invert translations, positive translation of svg means negative translation of lens
  const translateX = x * -1
  const translateY = y * -1

  const lensWidth = `${(viewportSvgWidth / zoomScale / rawSvgWidth) * 100}%`
  const lensHeight = `${(viewportSvgHeight / zoomScale / rawSvgHeight) * 100}%`
  const lensLeft = `${(translateX / zoomScale / rawSvgWidth) * 100}%`
  const lensTop = `${(translateY / zoomScale / rawSvgHeight) * 100}%`

  contentMain.style.setProperty('--minimap-lens-width', lensWidth)
  contentMain.style.setProperty('--minimap-lens-height', lensHeight)
  contentMain.style.setProperty('--minimap-lens-left', lensLeft)
  contentMain.style.setProperty('--minimap-lens-top', lensTop)

  const minimapSvg = document.getElementById('minimap-svg')
  if (!minimap || !minimapSvg) return

  minimap.onclick = (event) => {
    // compute click coordinates relative to the svg
    const { left, top, width: svgWidth, height: svgHeight } = minimapSvg.getBoundingClientRect()
    const x = event.clientX - left
    const y = event.clientY - top

    const percentX = x / svgWidth
    const percentY = y / svgHeight

    // offset so centre of lens moves to click coords
    const percentCentreOffsetX = viewportSvgWidth / rawSvgWidth / zoomScale / 2
    const percentCentreOffsetY = viewportSvgHeight / rawSvgHeight / zoomScale / 2

    const targetX = (percentX - percentCentreOffsetX) * rawSvgWidth * zoomScale * -1
    const targetY = (percentY - percentCentreOffsetY) * rawSvgHeight * zoomScale * -1

    panZoom.pan({ x: targetX, y: targetY })
  }
}

setSizes()
addEventListener('resize', setSizes)
