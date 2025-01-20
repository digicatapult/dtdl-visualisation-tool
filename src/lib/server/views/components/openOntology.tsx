/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Page } from '../common'
import { UUID } from '../../models/strings'

@singleton()
export default class OpenOntologyTemplates {
    constructor() { }

    public OpenOntologyRoot = ({ sessionId }: { sessionId: UUID }) => (
        <Page title="UKDTC">
            <input id="sessionId" name="sessionId" type="hidden" value={escapeHtml(sessionId)} />
            <section id="toolbar">
                <h2>UKDTC</h2>
            </section>
            <this.mainView />

        </Page>
    )

    public mainView = () => {
        return (
            <div id="main-view">
                <h1>Open Ontology</h1>
                <this.uploadMethod showContent={false} />
            </div>

        )
    }
    public uploadMethod = ({ showContent }: { showContent: boolean }) => {
        return (
            <section id="upload-method">
                <label
                    id="upload-file-button"
                    hx-swap="outerHTML"
                    hx-target='#upload-method'
                    hx-get={`/upload/uploadButton?showContent=${!showContent}`}
                >
                    Upload New File <div class={showContent ? 'toggle-icon show-content' : 'toggle-icon'}>^</div>
                </label>
                <div id="upload-options" class={showContent ? 'show-content' : ''}>
                    <div id="zip-upload">
                        <this.uploadZip />
                    </div>
                    <div id="bitbucket">
                        <this.uploadGithub />
                    </div>
                </div>

            </section>
        )
    }

    private uploadZip = () => {
        return (
            <form
                id="zip-form"
                hx-ext="ignore:json-enc"
                hx-target="#content-main"
                hx-select="#content-main"
                hx-post="/upload/zip"
                hx-encoding="multipart/form-data"
                hx-trigger="change from:#zip"
                hx-include="#sessionId"
            >
                <label id="zip-button" for="zip" class="upload-option">
                    .zip
                </label>
                <input type="file" id="zip" name="file" accept=".zip" />
            </form>
        )
    }
    private uploadGithub = () => {
        return (
            <form
                id="github-form"
                hx-ext="ignore:json-enc"
                hx-target="#content-main"
                hx-select="#content-main"
                hx-post="/upload/zip"
                hx-encoding="multipart/form-data"
                hx-trigger="change from:#zip"
                hx-include="#sessionId"
            >
                <label id="zip-button" for="zip" class="upload-option">
                    GitHub
                </label>
                <input type="file" id="zip" name="file" accept=".zip" />
            </form>
        )
    }
}
