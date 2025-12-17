/// <reference types="@kitajs/html/htmx.d.ts" />

import { container } from 'tsyringe'
import { Env } from '../../env/index.js'
import { UUID } from '../../models/strings.js'

const env = container.resolve(Env)

export const PublishForm = ({ canPublish, ontologyId }: { canPublish: boolean; ontologyId: UUID }): JSX.Element => {
  if (!env.get('EDIT_ONTOLOGY')) return <></>
  return (
    <button
      id="publish-ontology"
      class={`button ${!canPublish ? 'disabled' : ''}`}
      disabled={!canPublish}
      hx-get={`/publish/dialog?ontologyId=${ontologyId}`}
      hx-target="#publish-dialog"
      hx-swap="outerHTML"
      hx-on--after-request="document.getElementById('publish-dialog').showModal()"
      title={
        canPublish
          ? 'Click to publish ontology'
          : 'Only Ontologies from github that you have write permissions on, can be published'
      }
    >
      Publish
    </button>
  )
}
