import { DtdlObjectModel } from '@digicatapult/dtdl-parser'

const emptyEntityProperties = {
  SupplementalTypes: [],
  SupplementalProperties: {},
  UndefinedTypes: [],
  UndefinedProperties: {},
  description: {},
  languageMajorVersion: 2,
  ClassId: 'dtmi:dtdl:class:SomeClass;2',
}
const emptyInterfaceProperties = {
  contents: {},
  commands: {},
  components: {},
  properties: {},
  relationships: {},
  telemetries: {},
  extendedBy: [],
  schemas: [],
}

const emptyRelationshipProperties = {
  schema: '',
  properties: {},
  displayName: {},
  writable: false,
}

export const flowchartFixture = `flowchart TD
dtmi:com:example:1@{ shape: subproc, label: "example 1"}
click dtmi:com:example:1 getEntity
dtmi:com:example_extended:1@{ shape: subproc, label: "example extended"}
click dtmi:com:example_extended:1 getEntity
dtmi:com:example:1 ---  dtmi:com:example_extended:1
dtmi:com:example_related:1@{ shape: subproc, label: "example related"}
click dtmi:com:example_related:1 getEntity
dtmi:com:example:1 --- |A relationship| dtmi:com:example_related:1`

export const flowchartFixtureFiltered = `flowchart TD
dtmi:com:example:1@{ shape: subproc, label: "example 1"}
click dtmi:com:example:1 getEntity
dtmi:com:example:1 --- |A relationship| dtmi:com:example_related:1
dtmi:com:example_related:1@{ shape: subproc, label: "example related"}
click dtmi:com:example_related:1 getEntity`

export const flowchartFixtureSimple = `flowchart TD
dtmi:com:example:1@{ shape: subproc, label: "example 1"}
click dtmi:com:example:1 getEntity`

export const flowchartFixtureSimpleHighlighted = `flowchart TD
dtmi:com:example:1@{ shape: subproc, label: "example 1"}
click dtmi:com:example:1 getEntity

class dtmi:com:example:1 highlighted`

export const classDiagramFixture = `classDiagram
 direction  TD
class \`dtmi:com:example:1\`["example 1"] 
click \`dtmi:com:example:1\` call getEntity()
class \`dtmi:com:example_extended:1\`["example extended"] 
click \`dtmi:com:example_extended:1\` call getEntity()
\`dtmi:com:example:1\` <|-- \`dtmi:com:example_extended:1\`
class \`dtmi:com:example_related:1\`["example related"] 
click \`dtmi:com:example_related:1\` call getEntity()
\`dtmi:com:example:1\` -- \`dtmi:com:example_related:1\` : A relationship`

export const classDiagramFixtureFiltered = `classDiagram
 direction  TD
dtmi:com:example:1@{ shape: subproc, label: "example 1"}
click dtmi:com:example:1 getEntity
dtmi:com:example:1 --- |A relationship| dtmi:com:example_related:1
dtmi:com:example_related:1@{ shape: subproc, label: "example related"}
click dtmi:com:example_related:1 getEntity`

export const classDiagramFixtureSimple = `classDiagram
 direction  TD
class \`dtmi:com:example:1\`["example 1"] 
click \`dtmi:com:example:1\` call getEntity()`

export const classDiagramFixtureSimpleHighlighted = `classDiagram
 direction  TD
class \`dtmi:com:example:1\`["example 1"] 
click \`dtmi:com:example:1\` call getEntity()

class \`dtmi:com:example:1\`:::highlighted`

export const mockDtdlObjectModel = {
  'dtmi:com:example;1': {
    Id: 'dtmi:com:example;1',
    displayName: {
      en: 'example 1',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  'dtmi:com:example_extended;1': {
    Id: 'dtmi:com:example_extended;1',
    displayName: {
      en: 'example extended',
    },
    EntityKind: 'Interface',
    extends: ['dtmi:com:example;1'],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  'dtmi:com:example_related;1': {
    Id: 'dtmi:com:example_related;1',
    displayName: {
      en: 'example related',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  'dtmi:com:example_relationship;1': {
    Id: 'dtmi:com:example_relationship;1',
    name: 'A relationship',
    EntityKind: 'Relationship',
    ChildOf: 'dtmi:com:example;1',
    target: 'dtmi:com:example_related;1',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'dtmi:com:example_relationship_undefined_interface;1': {
    Id: 'dtmi:com:example_relationship;1',
    name: 'A relationship',
    EntityKind: 'Relationship',
    ChildOf: 'dtmi:com:example;1',
    target: 'dtmi:com:example_undefined_interface;1',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
} as DtdlObjectModel

export const simpleMockDtdlObjectModel = {
  'dtmi:com:example;1': {
    Id: 'dtmi:com:example;1',
    displayName: {
      en: 'example 1',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
} as DtdlObjectModel

export const generatedSVGFixture = `<svg id="my-svg" width="121" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="flowchart" height="49.5" viewBox="0 0 121 49.5" role="graphics-document document" aria-roledescription="flowchart-v2" style="background-color: white;"><style>#my-svg{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;fill:#333;}#my-svg .error-icon{fill:#552222;}#my-svg .error-text{fill:#552222;stroke:#552222;}#my-svg .edge-thickness-normal{stroke-width:1px;}#my-svg .edge-thickness-thick{stroke-width:3.5px;}#my-svg .edge-pattern-solid{stroke-dasharray:0;}#my-svg .edge-thickness-invisible{stroke-width:0;fill:none;}#my-svg .edge-pattern-dashed{stroke-dasharray:3;}#my-svg .edge-pattern-dotted{stroke-dasharray:2;}#my-svg .marker{fill:#333333;stroke:#333333;}#my-svg .marker.cross{stroke:#333333;}#my-svg svg{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;}#my-svg p{margin:0;}#my-svg .label{font-family:"trebuchet ms",verdana,arial,sans-serif;color:#333;}#my-svg .cluster-label text{fill:#333;}#my-svg .cluster-label span{color:#333;}#my-svg .cluster-label span p{background-color:transparent;}#my-svg .label text,#my-svg span{fill:#333;color:#333;}#my-svg .node rect,#my-svg .node circle,#my-svg .node ellipse,#my-svg .node polygon,#my-svg .node path{fill:#ECECFF;stroke:#9370DB;stroke-width:1px;}#my-svg .rough-node .label text,#my-svg .node .label text,#my-svg .image-shape .label,#my-svg .icon-shape .label{text-anchor:middle;}#my-svg .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#my-svg .rough-node .label,#my-svg .node .label,#my-svg .image-shape .label,#my-svg .icon-shape .label{text-align:center;}#my-svg .node.clickable{cursor:pointer;}#my-svg .root .anchor path{fill:#333333!important;stroke-width:0;stroke:#333333;}#my-svg .arrowheadPath{fill:#333333;}#my-svg .edgePath .path{stroke:#333333;stroke-width:2.0px;}#my-svg .flowchart-link{stroke:#333333;fill:none;}#my-svg .edgeLabel{background-color:rgba(232,232,232, 0.8);text-align:center;}#my-svg .edgeLabel p{background-color:rgba(232,232,232, 0.8);}#my-svg .edgeLabel rect{opacity:0.5;background-color:rgba(232,232,232, 0.8);fill:rgba(232,232,232, 0.8);}#my-svg .labelBkg{background-color:rgba(232, 232, 232, 0.5);}#my-svg .cluster rect{fill:#ffffde;stroke:#aaaa33;stroke-width:1px;}#my-svg .cluster text{fill:#333;}#my-svg .cluster span{color:#333;}#my-svg div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:12px;background:hsl(80, 100%, 96.2745098039%);border:1px solid #aaaa33;border-radius:2px;pointer-events:none;z-index:100;}#my-svg .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#333;}#my-svg rect.text{fill:none;stroke-width:0;}#my-svg .icon-shape,#my-svg .image-shape{background-color:rgba(232,232,232, 0.8);text-align:center;}#my-svg .icon-shape p,#my-svg .image-shape p{background-color:rgba(232,232,232, 0.8);padding:2px;}#my-svg .icon-shape rect,#my-svg .image-shape rect{opacity:0.5;background-color:rgba(232,232,232, 0.8);fill:rgba(232,232,232, 0.8);}#my-svg :root{--mermaid-font-family:"trebuchet ms",verdana,arial,sans-serif;}</style><g><marker id="my-svg_flowchart-v2-pointEnd" class="marker flowchart-v2" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" class="arrowMarkerPath" style="stroke-width: 1; stroke-dasharray: 1, 0;"/></marker><marker id="my-svg_flowchart-v2-pointStart" class="marker flowchart-v2" viewBox="0 0 10 10" refX="4.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path d="M 0 5 L 10 10 L 10 0 z" class="arrowMarkerPath" style="stroke-width: 1; stroke-dasharray: 1, 0;"/></marker><marker id="my-svg_flowchart-v2-circleEnd" class="marker flowchart-v2" viewBox="0 0 10 10" refX="11" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><circle cx="5" cy="5" r="5" class="arrowMarkerPath" style="stroke-width: 1; stroke-dasharray: 1, 0;"/></marker><marker id="my-svg_flowchart-v2-circleStart" class="marker flowchart-v2" viewBox="0 0 10 10" refX="-1" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><circle cx="5" cy="5" r="5" class="arrowMarkerPath" style="stroke-width: 1; stroke-dasharray: 1, 0;"/></marker><marker id="my-svg_flowchart-v2-crossEnd" class="marker cross flowchart-v2" viewBox="0 0 11 11" refX="12" refY="5.2" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M 1,1 l 9,9 M 10,1 l -9,9" class="arrowMarkerPath" style="stroke-width: 2; stroke-dasharray: 1, 0;"/></marker><marker id="my-svg_flowchart-v2-crossStart" class="marker cross flowchart-v2" viewBox="0 0 11 11" refX="-1" refY="5.2" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M 1,1 l 9,9 M 10,1 l -9,9" class="arrowMarkerPath" style="stroke-width: 2; stroke-dasharray: 1, 0;"/></marker><g class="root"><g class="clusters"/><g class="edgePaths"/><g class="edgeLabels"/><g class="nodes"><g class="node default clickable " id="flowchart-dtmi:com:example:1-0" transform="translate(60.5, 24.75)"><polygon points="0,0 89,0 89,-33.5 0,-33.5 0,0 -8,0 97,0 97,-33.5 -8,-33.5 -8,0" class="label-container" transform="translate(-44.5,16.75)"/><g class="label" style="" transform="translate(0, -9.25)"><rect/><g><rect class="background" style="stroke: none"/><text y="-10.1" style=""><tspan class="text-outer-tspan" x="0" y="-0.1em" dy="1.1em"><tspan font-style="normal" class="text-inner-tspan" font-weight="normal">example</tspan><tspan font-style="normal" class="text-inner-tspan" font-weight="normal"> 1</tspan></tspan></text></g></g></g></g></g></g></svg>`
