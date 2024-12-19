import { RenderedDiagram } from './base.js'

export class PlainTextRender extends RenderedDiagram<'text'> {
  constructor(private content: string) {
    super()
  }

  get type() {
    return 'text' as const
  }
  renderToString(): string {
    return this.content
  }
}
