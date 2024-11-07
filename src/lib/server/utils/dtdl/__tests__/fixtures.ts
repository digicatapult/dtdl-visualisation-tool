import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { DtdlModelWithMetadata } from '../filter'

export const singleInterfaceFirst: DtdlObjectModel = {
  first: {
    EntityKind: 'Interface',
    Id: 'first',
  },
} as unknown as DtdlModelWithMetadata

export const multipleInterfaces: DtdlObjectModel = {
  ...singleInterfaceFirst,
  second: {
    EntityKind: 'Interface',
    Id: 'second',
  },
  third: {
    EntityKind: 'Interface',
    Id: 'third',
  },
} as unknown as DtdlModelWithMetadata

export const multipleInterfacesAndRelationship: DtdlObjectModel = {
  ...multipleInterfaces,
  relFirstSecond: {
    EntityKind: 'Relationship',
    Id: 'relFirstSecond',
    target: 'first',
    ChildOf: 'second',
  },
  relInvalidTarget: {
    EntityKind: 'Relationship',
    Id: 'relInvalidTarget',
    ChildOf: 'third',
    target: 'invalid',
  },
} as unknown as DtdlModelWithMetadata

export const expandedWithRelationships: DtdlObjectModel = {
  first: {
    EntityKind: 'Interface',
    Id: 'first',
  },
  second: {
    EntityKind: 'Interface',
    Id: 'second',
  },
  third: {
    EntityKind: 'Interface',
    Id: 'third',
  },
  relFirstSecond: {
    EntityKind: 'Relationship',
    Id: 'relFirstSecond',
    target: 'first',
    ChildOf: 'second',
  },
  relSecondThird: {
    EntityKind: 'Relationship',
    Id: 'relSecondThird',
    target: 'second',
    ChildOf: 'third',
  },
} as unknown as DtdlModelWithMetadata
