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
export const complexMockDtdlModel = {
  '1': {
    Id: '1',
    displayName: {
      en: 'example1',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  '2': {
    Id: '2',
    displayName: {
      en: 'example2',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  '3': {
    Id: '3',
    displayName: {
      en: 'example3',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  '4': {
    Id: '4',
    displayName: {
      en: 'example4',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  '5': {
    Id: '5',
    displayName: {
      en: 'example5',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  '6': {
    Id: '6',
    displayName: {
      en: 'example6',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  '7': {
    Id: '7',
    displayName: {
      en: 'example7',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  '8': {
    Id: '8',
    displayName: {
      en: 'example8',
    },
    EntityKind: 'Interface',
    extends: [],
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
  },
  '9': {
    Id: '9',
    displayName: {
      en: 'example9',
    },
    EntityKind: 'Interface',
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
    extendedBy: [],
    extends: ['10'],
  },
  '10': {
    Id: '10',
    displayName: {
      en: 'example10',
    },
    EntityKind: 'Interface',
    ...emptyEntityProperties,
    ...emptyInterfaceProperties,
    extendedBy: ['9'],
    extends: [],
  },
  'relationship:1:2': {
    Id: 'relationship:1:2',
    name: '1 to 2',
    EntityKind: 'Relationship',
    ChildOf: '1',
    target: '2',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'relationship:1:3': {
    Id: 'relationship:1:3',
    name: '1 to 3',
    EntityKind: 'Relationship',
    ChildOf: '1',
    target: '3',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'relationship:2:4': {
    Id: 'relationship:2:4',
    name: '2 to 4',
    EntityKind: 'Relationship',
    ChildOf: '2',
    target: '4',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'relationship:2:5': {
    Id: 'relationship:2:5',
    name: '2 to 5',
    EntityKind: 'Relationship',
    ChildOf: '2',
    target: '5',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'relationship:5:2': {
    Id: 'relationship:5:2',
    name: '5 to 2',
    EntityKind: 'Relationship',
    ChildOf: '5',
    target: '2',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'relationship:5:8': {
    Id: 'relationship:5:8',
    name: '5 to 8',
    EntityKind: 'Relationship',
    ChildOf: '5',
    target: '8',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'relationship:5:9': {
    Id: 'relationship:5:9',
    name: '5 to 9',
    EntityKind: 'Relationship',
    ChildOf: '5',
    target: '9',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'relationship:3:6': {
    Id: 'relationship:3:6',
    name: '3 to 6',
    EntityKind: 'Relationship',
    ChildOf: '3',
    target: '6',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'relationship:3:7': {
    Id: 'relationship:3:7',
    name: '3 to 7',
    EntityKind: 'Relationship',
    ChildOf: '3',
    target: '7',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
  'relationship:7:9': {
    Id: 'relationship:7:9',
    name: '7 to 9',
    EntityKind: 'Relationship',
    ChildOf: '7',
    target: '9',
    ...emptyEntityProperties,
    ...emptyRelationshipProperties,
  },
} as DtdlObjectModel
