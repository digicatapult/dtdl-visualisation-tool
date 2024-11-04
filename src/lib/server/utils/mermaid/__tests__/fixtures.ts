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
