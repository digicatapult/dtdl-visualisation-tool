const resetButton = document.getElementById('reset-pan-zoom')
const zoomInButton = document.getElementById('zoom-in')
const zoomOutButton = document.getElementById('zoom-out')


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
