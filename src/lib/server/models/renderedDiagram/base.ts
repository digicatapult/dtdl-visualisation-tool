export type OutputType = 'text' | 'svg'
export abstract class RenderedDiagram<T extends OutputType = OutputType> {
  abstract get type(): T
  abstract renderToString(): string

  toJSON(): { type: T; content: string } {
    return {
      type: this.type,
      content: this.renderToString(),
    }
  }
}
