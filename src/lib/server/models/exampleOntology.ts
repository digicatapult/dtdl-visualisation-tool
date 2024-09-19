import { Direction, DtdlObjectModel } from '../utils/mermaid/flowchart.js'

export const direction = Direction.TopToBottom

export const dtdlObjectModel: DtdlObjectModel = {
  'entity 1':{
    EntityKind:'Component',
    SupplementalTypes: ['',''],
    SupplementalProperties: {'Supplemental Properties': {} },
    UndefinedTypes: [''],
    UndefinedProperties: { 'Undefined Properties': {} },
    ClassId: 'Some Class',
    description: { cdva: 'string' },
    displayName: { en: 'entity 1' },
    languageMajorVersion: 431531,
    Id: '1'
  },
  'entity 2':{
    EntityKind:'Component',
    SupplementalTypes: ['',''],
    SupplementalProperties: {'Supplemental Properties': {} },
    UndefinedTypes: [''],
    UndefinedProperties: { 'Undefined Properties': {} },
    ClassId: 'Some Class',
    description: { cdva: 'string' },
    displayName: { en: 'entity 2' },
    languageMajorVersion: 431531,
    ChildOf: '1',
    Id: '2'
  }
}