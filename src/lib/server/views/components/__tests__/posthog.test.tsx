import { expect } from 'chai'
import { afterEach, describe, it } from 'mocha'
import React from 'react'
import sinon from 'sinon'
import { container } from 'tsyringe'
import { Env } from '../../../env/index.js'
import { Page } from '../../common.js'
import { PostHogScript } from '../posthog.js'

describe('PostHogScript', () => {
  afterEach(() => {
    sinon.restore()
    container.clearInstances()
  })

  it('should render script when enabled and keys are present', () => {
    const envStub = sinon.createStubInstance(Env)
    envStub.get.withArgs('POSTHOG_ENABLED').returns(true)
    envStub.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
    envStub.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('test-host')
    container.registerInstance(Env, envStub as unknown as Env)

    const result = PostHogScript({})
    expect(result).to.contain("posthog.init('test-key',{api_host:'test-host'")
  })

  it('should not render script when disabled', () => {
    const envStub = sinon.createStubInstance(Env)
    envStub.get.withArgs('POSTHOG_ENABLED').returns(false)
    container.registerInstance(Env, envStub as unknown as Env)

    const result = PostHogScript({})
    expect(result).to.equal('')
  })

  it('should not render script when keys are missing', () => {
    const envStub = sinon.createStubInstance(Env)
    envStub.get.withArgs('POSTHOG_ENABLED').returns(true)
    envStub.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns(undefined)
    container.registerInstance(Env, envStub as unknown as Env)

    const result = PostHogScript({})
    expect(result).to.equal('')
  })

  it('should be included in Page when enabled', () => {
    const envStub = sinon.createStubInstance(Env)
    envStub.get.withArgs('POSTHOG_ENABLED').returns(true)
    envStub.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
    envStub.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('test-host')
    container.registerInstance(Env, envStub as unknown as Env)

    const result = Page({ title: 'Test', children: [] }).toString()
    expect(result).to.contain("posthog.init('test-key',{api_host:'test-host'")
  })

  it('should bootstrap distinctId when posthog_id cookie is present', () => {
    const envStub = sinon.createStubInstance(Env)
    envStub.get.withArgs('POSTHOG_ENABLED').returns(true)
    envStub.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
    envStub.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('test-host')
    container.registerInstance(Env, envStub as unknown as Env)

    const mockReq = {
      signedCookies: {
        POSTHOG_ID: 'test-distinct-id-123',
      },
    }

    const result = PostHogScript({ req: mockReq as unknown as React.ComponentProps<typeof PostHogScript>['req'] })
    expect(result).to.contain("bootstrap:{distinctID:'test-distinct-id-123'}")
  })

  it('should not include bootstrap when posthog_id cookie is missing', () => {
    const envStub = sinon.createStubInstance(Env)
    envStub.get.withArgs('POSTHOG_ENABLED').returns(true)
    envStub.get.withArgs('NEXT_PUBLIC_POSTHOG_KEY').returns('test-key')
    envStub.get.withArgs('NEXT_PUBLIC_POSTHOG_HOST').returns('test-host')
    container.registerInstance(Env, envStub as unknown as Env)

    const mockReq = {
      signedCookies: {},
    }

    const result = PostHogScript({ req: mockReq as unknown as React.ComponentProps<typeof PostHogScript>['req'] })
    expect(result).to.not.contain('bootstrap')
  })
})
