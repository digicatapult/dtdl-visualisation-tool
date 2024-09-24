import mermaid from '/lib/mermaid/mermaid.esm.mjs'
import elkLayouts from '/lib/mermaid-elk/mermaid-layout-elk.esm.mjs'

mermaid.registerLayoutLoaders(elkLayouts)

let config = { 
    startOnLoad: true, 
    flowchart: { 
        useMaxWidth: false, 
        htmlLabels: true,
        rankSpacing: 0
    },
    maxTextSize: 99999999,
    // layout: 'elk.mrtree',
    

}
mermaid.initialize(config)