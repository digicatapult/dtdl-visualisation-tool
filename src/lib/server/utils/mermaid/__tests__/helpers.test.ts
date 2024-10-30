import { expect } from "chai"
import { dtdlIdReinstateSemicolon, dtdlIdReplaceSemicolon } from "../helpers"

describe('Helpers', () => {
    describe('Replacing and reinstating semicolon', () => {

        it('should replace the final semicolon in DTDL ID', () => {
            expect(dtdlIdReplaceSemicolon('dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal;1')).to.equal(
                'dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal:1'
            )
        })
        it('should replace the final semicolon in DTDL ID with any number after the final semicolon', () => {
            expect(dtdlIdReplaceSemicolon('dtmi:com:example;12345')).to.equal('dtmi:com:example:12345')
        })
        it('should replace the final colon in a mermaid safe ID', () => {
            expect(dtdlIdReinstateSemicolon('dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal:1')).to.equal(
                'dtmi:digitaltwins:ngsi_ld:cim:energy:ACDCTerminal;1'
            )
        })
        it('should replace the final colon in in a mermaid safe ID with any number after the final colon', () => {
            expect(dtdlIdReinstateSemicolon('dtmi:com:example:12345')).to.equal('dtmi:com:example;12345')
        })

    })

})