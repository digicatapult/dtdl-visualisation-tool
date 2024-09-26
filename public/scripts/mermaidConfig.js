import elkLayouts from '/lib/mermaid-elk/mermaid-layout-elk.esm.mjs'
import mermaid from '/lib/mermaid/mermaid.esm.mjs'

mermaid.registerLayoutLoaders(elkLayouts)

let config = {
  startOnLoad: false,
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    rankSpacing: 0,
  },
  maxTextSize: 99999999
}

async function renderMermaid () {

  let element = document.getElementById('mermaidOutput');
  const graphDefinition = document.getElementById('graphMarkdown').innerText
  const { svg, bindFunctions } = await mermaid.render('tmpRenderedDiv', graphDefinition)
  element.innerHTML = svg
}

let layouts = document.querySelectorAll('#layouts')

for (const layout of layouts){
  layout.onclick = async () => {
    mermaid.mermaidAPI.updateSiteConfig({layout: layout.innerText})
    await renderMermaid()
  }
}

mermaid.initialize(config)
await renderMermaid()
