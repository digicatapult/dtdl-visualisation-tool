import { InterfaceType, RelationshipType } from '@digicatapult/dtdl-parser'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { classDiagramFixture, mockDtdlObjectModel } from './fixtures'
import ClassDiagram from '../classDiagram'

describe('Mermaid', () => {
    describe('ClassDiagram', () => {
        const classDiagram = new ClassDiagram()
        it('should return a flowchart in markdown', () => {
            expect(classDiagram.generateMarkdown(mockDtdlObjectModel)).to.equal(classDiagramFixture)
        })
        it('should return a list of mermaid markdown string that represents an interface ', () => {
            const interfaceAsMarkdown = classDiagram.interfaceToMarkdown(
                mockDtdlObjectModel['dtmi:com:example_extended;1'] as InterfaceType
            )
            const test = [
                'class `dtmi:com:example_extended:1`[\"example extended\"] \nclick `dtmi:com:example_extended:1` call getEntity()',
                '`dtmi:com:example:1` <|-- `dtmi:com:example_extended:1`',
            ]
            expect(interfaceAsMarkdown).to.deep.equal(test)
        })
        it('should return a list of mermaid markdown string that represents a relationship ', () => {
            const relationshipAsMarkdown = classDiagram.relationshipToMarkdown(
                mockDtdlObjectModel,
                mockDtdlObjectModel['dtmi:com:example_relationship;1'] as RelationshipType
            )
            const test = ['`dtmi:com:example:1` -- `dtmi:com:example_related:1` : A relationship']
            expect(relationshipAsMarkdown).to.deep.equal(test)
        })
        it('should return undefined for a relationship with an undefined interface', () => {
            const relationshipAsMarkdown = classDiagram.relationshipToMarkdown(
                mockDtdlObjectModel,
                mockDtdlObjectModel['dtmi:com:example_relationship_undefined_interface;1'] as RelationshipType
            )
            const test = []
            expect(relationshipAsMarkdown).to.deep.equal(test)
        })
        it('should return node string without a callback defined', () => {
            const interfaceAsMarkdown = classDiagram.createNodeString(mockDtdlObjectModel['dtmi:com:example_extended;1'], false)
            const test = 'class `dtmi:com:example_extended:1`["example extended"] '
            expect(interfaceAsMarkdown).to.deep.equal(test)
        })
    })
})
