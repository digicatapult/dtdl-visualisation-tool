export const diagramTypes = [
    'flowchart',
    'classDiagram',
] as const

export type DiagramType = (typeof diagramTypes)[number]