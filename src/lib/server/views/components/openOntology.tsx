/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { container, singleton } from 'tsyringe'
import version from '../../../../version.js'
import { Env } from '../../env/index.js'
import { ListItem } from '../../models/github.js'
import { RecentFile } from '../../models/openTypes.js'
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
    populateViewListLink,
    populateEditListLink,
    recentFiles,
  }: {
    populateViewListLink?: string
    populateEditListLink?: string
    recentFiles: RecentFile[]
  }) => {
    const showGithubModal = populateViewListLink !== undefined && populateEditListLink !== undefined
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
            <this.githubModal populateViewListLink={populateViewListLink} populateEditListLink={populateEditListLink} />
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

  public githubModal = ({
    populateViewListLink,
    populateEditListLink,
  }: {
    populateViewListLink: string
    populateEditListLink: string
  }) => {
    return (
      <dialog id="github-modal">
        <div id="modal-wrapper">
          <div id="public-github-input-wrapper">
            <input
              id="public-github-input"
              placeholder="Enter public GitHub repo {org}/{repo} e.g. 'digicatapult/dtdl-visualisation-tool'"
              hx-get="/github/navigate"
              hx-indicator="#spin-view"
              hx-trigger="keyup[event.key=='Enter'], input changed delay:500ms"
              name="url"
              hx-target="#github-list-view"
              hx-validate={true}
              oninput="globalThis.validatePublicRepoInput(this)"
              hx-on-htmx-before-request="if (this.validity.valid === false) event.preventDefault()"
            />
            <img src="/public/images/arrow-enter.svg" />
          </div>
          <a
            class="authorise-link"
            href={`https://github.com/apps/${env.get('GH_APP_NAME')}`}
            target="_blank"
            aria-label="Authorise private repos (opens in a new tab)"
          >
            Authorise private repos ↗
          </a>
          <this.githubPathLabel path="Repos:" />
          <div class="repo-lists-container" style="display: flex; gap: 20px; width: 100%;">
            <div class="repo-list-column" style="flex: 1;">
              <h3>Viewable Repos</h3>
              <div id="github-list-wrapper-view" class="github-list-wrapper">
                <div id="spin-view" class="spinner" />
                <ul
                  id="github-list-view"
                  class="github-list"
                  hx-indicator="#spin-view"
                  hx-get={populateViewListLink}
                  hx-trigger="load"
                ></ul>
              </div>
            </div>
            <div class="repo-list-column" style="flex: 1;">
              <h3>Editable Repos</h3>
              <div id="github-list-wrapper-edit" class="github-list-wrapper">
                <div id="spin-edit" class="spinner" />
                <ul
                  id="github-list-edit"
                  class="github-list"
                  hx-indicator="#spin-edit"
                  hx-get={populateEditListLink}
                  hx-trigger="load"
                ></ul>
              </div>
            </div>
          </div>
          <this.selectFolder stage="repo" />
        </div>
        <form method="dialog">
          <button class="modal-button" />
        </form>
      </dialog>
    )
  }

  public githubPathLabel = ({ path }: { path: string }) => {
    return (
      <h4 id="github-path-label" hx-swap-oob="true" hx-swap="outerHTML">
        {escapeHtml(path)}
      </h4>
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
    const includeNextPageLink = nextPageLink !== undefined && list.length > 0

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
