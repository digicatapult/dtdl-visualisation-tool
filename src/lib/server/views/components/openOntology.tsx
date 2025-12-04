/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { container, singleton } from 'tsyringe'
import version from '../../../../version.js'
import { Env } from '../../env/index.js'
import { ListItem } from '../../models/github.js'
import { RecentFile } from '../../models/openTypes.js'
import { safeUrl } from '../../utils/url.js'
import { Page } from '../common.js'

type SelectFolderProps =
  | {
      link: string
      swapOutOfBand?: boolean
      stage: 'folder'
    }
  | {
      swapOutOfBand?: boolean
      stage: 'repo' | 'branch'
    }

const env = container.resolve(Env)

@singleton()
export default class OpenOntologyTemplates {
  constructor() {}

  public OpenOntologyRoot = ({
    recentFiles,
    showGithubModal,
  }: {
    recentFiles: RecentFile[]
    showGithubModal?: boolean
  }) => {
    return (
      <Page title="UKDTC">
        <section id="upload-toolbar">
          <a href="/">
            <h2>UKDTC</h2>
          </a>
          <div>v{escapeHtml(version)}</div>
        </section>
        <div id="main-view">
          <h1>Open Ontology</h1>
          <this.getMenu showContent={false} />
          <this.recentFiles recentFiles={recentFiles} />
          {showGithubModal && (
            <dialog id="github-modal">
              <this.githubModalContent type="edit" />
              <form method="dialog">
                <button class="modal-button" autofocus />
              </form>
            </dialog>
          )}
          <div id="spinner-wrapper">
            <div id="spinner" class="spinner" />
          </div>
        </div>
      </Page>
    )
  }

  public getMenu = ({ showContent }: { showContent: boolean }) => {
    return (
      <section id="upload-method" class={showContent ? 'show-content' : ''}>
        <button
          id="upload-ontology-button"
          title="Upload New Ontology"
          hx-swap="outerHTML"
          hx-target="#upload-method"
          hx-trigger="click"
          hx-get={`/open/menu?showContent=${!showContent}`}
        >
          <div class="upload-icon" />
          <div class="toggle-icon">⋁</div>
        </button>
        <div id="upload-options-wrapper">
          <div id="upload-options">
            <this.uploadZip />
            <this.uploadGithub />
          </div>
        </div>
      </section>
    )
  }

  public githubModalContent = ({ type }: { type?: 'view' | 'edit' }) => {
    const showEditable = type === 'edit'
    const populateListLink = showEditable
      ? safeUrl(`/github/installations`, { page: '1' })
      : safeUrl(`/github/repos`, { page: '1' })
    const otherType = showEditable ? 'view' : 'edit'
    return (
      <div id="github-modal-content">
        <div id="github-modal-title-wrapper">
          <b>Select a repository to {type}</b>
          <a
            hx-get={`/github/modal?type=${otherType}`}
            hx-target="#github-modal-content"
            hx-swap="outerHTML"
            class="authorise-link"
          >
            {escapeHtml(`Show ${otherType}able`)}
          </a>
        </div>
        <div id="public-github-input-wrapper" style={showEditable ? 'visibility: hidden;' : undefined}>
          <input
            id="public-github-input"
            placeholder="Enter public GitHub repo e.g. 'digicatapult/dtdl-visualisation-tool'"
            hx-get="/github/navigate"
            hx-indicator="#spin"
            hx-trigger="keyup[event.key=='Enter'], input changed delay:500ms"
            name="url"
            hx-target=".github-list"
            hx-validate={true}
            oninput="globalThis.validatePublicRepoInput(this)"
            hx-on-htmx-before-request="if (this.validity.valid === false) event.preventDefault()"
          />
          <img src="/public/images/arrow-enter.svg" />
        </div>
        <this.githubPathLabel path="" />

        <div id="github-list-wrapper">
          <div id="spin" class="spinner" />
          <ul
            class="github-list"
            hx-indicator="#spin"
            hx-get={populateListLink}
            hx-trigger="load"
            hx-on-htmx-after-settle="this.scrollTop = 0"
          ></ul>
        </div>
        <a
          class="authorise-link"
          href={`https://github.com/apps/${env.get('GH_APP_NAME')}`}
          target="_blank"
          aria-label="Authorise repos (opens in a new tab)"
        >
          Repo missing? Authorise on GitHub ↗
        </a>
        <this.selectFolder stage="repo" />
      </div>
    )
  }

  public githubPathLabel = ({ path, swapOutOfBand }: { path: string; swapOutOfBand?: boolean }) => {
    return (
      <b id="github-path-label" hx-swap-oob={swapOutOfBand ? 'true' : undefined} hx-swap="outerHTML">
        {escapeHtml(path)}
      </b>
    )
  }

  private tooltipForSelectFolder = (stage: 'repo' | 'branch' | 'folder') => {
    switch (stage) {
      case 'repo':
        return 'Please select a repository'
      case 'branch':
        return 'Please select a repository branch'
      case 'folder':
        return 'Please select a folder containing the ontology'
      default:
        return 'Open Ontology'
    }
  }

  public selectFolder = (props: SelectFolderProps) => (
    <button
      id="select-folder"
      hx-trigger="click"
      hx-get={props.stage === 'folder' ? props.link : undefined}
      hx-swap-oob={props.swapOutOfBand ? 'true' : undefined}
      hx-swap="outerHTML"
      hx-target="#content-main"
      hx-select="#content-main"
      hx-indicator="#spinner"
      disabled={props.stage !== 'folder'}
      onclick="document.getElementById('github-modal').close();"
      title={this.tooltipForSelectFolder(props.stage)}
    >
      Open Ontology
    </button>
  )

  public githubListItems = ({
    list,
    nextPageLink,
    backLink,
  }: {
    list: ListItem[]
    nextPageLink?: string
    backLink?: string
  }) => {
    const nextPageAttributes = {
      'hx-get': nextPageLink,
      'hx-trigger': 'intersect once',
      'hx-swap': 'afterend',
      'hx-on--after-request': 'this.remove()',
      style: 'height: 1px; overflow: hidden',
    }

    const includeBackLink = backLink !== undefined
    const includeNextPageLink = nextPageLink !== undefined && list.length > env.get('GH_PER_PAGE') - 1

    return (
      <>
        {includeBackLink && (
          <li hx-trigger="click" hx-target="closest ul" hx-get={backLink}>
            {`<`}
          </li>
        )}
        {list.map((item) => (
          <li hx-trigger="click" hx-target="closest ul" hx-get={item.link}>
            {escapeHtml(item.text)}
          </li>
        ))}
        {includeNextPageLink && <li {...nextPageAttributes}></li>}
      </>
    )
  }

  private uploadZip = () => {
    return (
      <form
        id="zip-form"
        hx-ext="ignore:json-enc"
        hx-target="#content-main"
        hx-select="#content-main"
        hx-post="/open/"
        hx-encoding="multipart/form-data"
        hx-trigger="change from:#zip"
        hx-on-htmx-before-request="if (!document.getElementById('zip').files?.length) event.preventDefault()"
      >
        <label for="zip" class="upload-option">
          <img src="/public/images/zip-folder.svg" alt="zip-folder" />
          <p>Local Zip File</p>
        </label>
        <input type="file" id="zip" name="file" accept=".zip" />
      </form>
    )
  }
  private uploadGithub = () => {
    return (
      <a class="upload-option button" href={`/github/picker`}>
        <img src="/public/images/github-mark.svg" alt="github" />
        <span>GitHub</span>
      </a>
    )
  }

  public recentFiles = ({ recentFiles }: { recentFiles: RecentFile[] }) => {
    return (
      <section id="recent-files" class="file-grid">
        {recentFiles.map((recentFile, index) => {
          const preview: JSX.Element = recentFile.preview
          return (
            <a href={`/ontology/${recentFile.dtdlModelId}/view`}>
              <div class="file-card" role="button" title={escapeHtml(recentFile.fileName)} tabindex={`${index + 1}`}>
                <div class="file-preview">{preview}</div>
                <div class="file-details">
                  <p class="file-name">{escapeHtml(recentFile.fileName)}</p>
                  <p class="file-viewed">Viewed {escapeHtml(recentFile.lastVisited)}</p>
                </div>
              </div>
            </a>
          )
        })}
      </section>
    )
  }
}
