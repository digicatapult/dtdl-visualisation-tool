import { DtdlModel } from '../../../../models/dtdlOmParser.js'
import { DtdlPath } from '../../parser.js'

const entityDefaults = {
  ClassId: '',
  SupplementalTypes: [],
  SupplementalProperties: {},
  UndefinedTypes: [],
  UndefinedProperties: {},
  description: {},
  comment: '',
}

const interfaceDefaults = {
  ...entityDefaults,
  extends: [],
  extendedBy: [],
  contents: [],
  schemas: [],
  properties: {},
  relationships: {},
  telemetries: {},
  commands: {},
  components: {},
}

const relationshipDefaults = {
  ...entityDefaults,
  properties: {},
  name: 'rel',
  writable: false,
}

export const singleInterfaceFirst: DtdlModel = {
  first: {
    ...interfaceDefaults,
    EntityKind: 'Interface',
    Id: 'first',
    displayName: { en: 'display name' },
  },
}

export const singleInterfaceFirstFilePaths: DtdlPath[] = [
  {
    type: 'file',
    name: 'firstFile.json',
    entries: [{ type: 'fileEntry', dtdlType: 'Interface', name: 'display name', id: 'first', entries: [] }],
  },
]

export const multipleInterfaces: DtdlModel = {
  ...singleInterfaceFirst,
  second: {
    ...interfaceDefaults,
    EntityKind: 'Interface',
    Id: 'second',
  },
  third: {
    ...interfaceDefaults,
    EntityKind: 'Interface',
    Id: 'third',
  },
}

export const multipleInterfacesAndRelationship: DtdlModel = {
  ...multipleInterfaces,
  relFirstSecond: {
    ...relationshipDefaults,
    EntityKind: 'Relationship',
    Id: 'relFirstSecond',
    target: 'first',
    ChildOf: 'second',
  },
  relInvalidTarget: {
    ...relationshipDefaults,
    EntityKind: 'Relationship',
    Id: 'relInvalidTarget',
    ChildOf: 'third',
    target: 'invalid',
  },
}

export const expandedWithRelationships: DtdlModel = {
  first: {
    ...interfaceDefaults,
    EntityKind: 'Interface',
    Id: 'first',
  },
  second: {
    ...interfaceDefaults,
    EntityKind: 'Interface',
    Id: 'second',
  },
  third: {
    ...interfaceDefaults,
    EntityKind: 'Interface',
    Id: 'third',
  },
  relFirstSecond: {
    ...relationshipDefaults,
    EntityKind: 'Relationship',
    Id: 'relFirstSecond',
    target: 'first',
    ChildOf: 'second',
  },
  ['rel second third']: {
    ...relationshipDefaults,
    EntityKind: 'Relationship',
    Id: 'rel second third',
    target: 'second',
    ChildOf: 'third',
  },
}

export const extendedInterface: DtdlModel = {
  parent: {
    ...interfaceDefaults,
    EntityKind: 'Interface',
    Id: 'parent',
    extendedBy: ['child'],
    extends: [],
  },
  child: {
    ...interfaceDefaults,
    EntityKind: 'Interface',
    Id: 'child',
    extends: ['parent'],
  },
}

export const interfaceWithContents: DtdlModel = {
  first: {
    ...interfaceDefaults,
    EntityKind: 'Interface',
    Id: 'first',
    properties: { someProperty: 'someProperty' },
    telemetries: { someTelemetry: 'someTelemetry' },
  },
  someProperty: {
    ...entityDefaults,
    EntityKind: 'Property',
    Id: 'someProperty',
    name: 'someProperty',
    schema: 'string',
  },
  someTelemetry: {
    ...entityDefaults,
    EntityKind: 'Telemetry',
    Id: 'someTelemetry',
    name: 'someTelemetry',
    schema: 'string',
  },
}
