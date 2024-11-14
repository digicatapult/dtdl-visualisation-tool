const resetButton = document.getElementById('reset-pan-zoom')
const zoomInButton = document.getElementById('zoom-in')
const zoomOutButton = document.getElementById('zoom-out')


globalThis.setMermaidListeners = function setMermaidListeners() {

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
