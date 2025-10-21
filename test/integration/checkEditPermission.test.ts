import { expect } from 'chai'
import { describe, it } from 'mocha'

describe('Edit Permissions Integration Tests', function () {
  const testSessionId = 'test-session-12345'

  // We'll use the default model for testing since it exists in the test environment
  let defaultModelId: string

  before(async function () {
    // Get the default model ID by making a request to the root endpoint
    // and extracting the model ID from the redirect
    const response = await fetch('http://localhost:3000/', {
      redirect: 'manual',
    })

    expect(response.status).to.equal(302)
    const location = response.headers.get('location')
    expect(location).to.not.equal(null)

    // Extract model ID from URL like "/ontology/{modelId}/view"
    const match = location?.match(/\/ontology\/([^/]+)\/view/)
    expect(match).to.not.equal(null)
    defaultModelId = match![1]
  })

  describe('GET /ontology/{dtdlModelId}/edit-model', function () {
    it('should return 401 when no authentication token is provided', async function () {
      // First we need to create a valid session
      const sessionResponse = await fetch(`http://localhost:3000/ontology/${defaultModelId}/view?diagramType=flowchart`)
      expect(sessionResponse.status).to.equal(200)

      // Try to access edit endpoint without GitHub token
      const response = await fetch(
        `http://localhost:3000/ontology/${defaultModelId}/edit-model?sessionId=${testSessionId}&editMode=true`
      )

      // Should return 401 because no GitHub token provided for GitHub source model
      expect(response.status).to.equal(401)
    })

    it('should return 401 when invalid authentication token is provided', async function () {
      const invalidToken = 'invalid-github-token'

      const response = await fetch(
        `http://localhost:3000/ontology/${defaultModelId}/edit-model?sessionId=${testSessionId}&editMode=true`,
        {
          headers: {
            Cookie: `OCTOKIT_TOKEN=s:${invalidToken}`,
          },
        }
      )

      // Should return 401 because token is invalid
      expect(response.status).to.equal(401)
    })

    it('should handle non-existent model IDs', async function () {
      const nonExistentModelId = 'non-existent-model-id-12345'

      const response = await fetch(
        `http://localhost:3000/ontology/${nonExistentModelId}/edit-model?sessionId=${testSessionId}&editMode=true`
      )

      // Should return 500 because model doesn't exist
      expect(response.status).to.equal(500)
    })

    it('should handle missing session ID parameter', async function () {
      const response = await fetch(`http://localhost:3000/ontology/${defaultModelId}/edit-model?editMode=true`)

      // Should return 400 because sessionId is required
      expect(response.status).to.equal(400)
    })

    it('should handle invalid session IDs', async function () {
      const invalidSessionId = 'invalid-session-id-12345'

      const response = await fetch(
        `http://localhost:3000/ontology/${defaultModelId}/edit-model?sessionId=${invalidSessionId}&editMode=true`
      )

      // Should return error because session doesn't exist
      expect([400, 408, 500]).to.include(response.status)
    })
  })

  describe('checkEditPermission function behavior', function () {
    it('should require authentication for GitHub models', async function () {
      // Upload a test model via GitHub simulation (this would be a GitHub-sourced model)
      const zipContent = Buffer.from('test content')
      const formData = new FormData()
      const blob = new Blob([zipContent], { type: 'application/zip' })
      formData.append('file', blob, 'test.zip')

      // Upload will fail, but that's expected in this test environment
      await fetch('http://localhost:3000/open/', {
        method: 'POST',
        body: formData,
      })

      // Even if upload fails, we can test that edit endpoints require authentication
      const response = await fetch(
        `http://localhost:3000/ontology/${defaultModelId}/edit-model?sessionId=${testSessionId}&editMode=true`
      )

      expect(response.status).to.equal(401)
    })

    it('should handle malformed cookies gracefully', async function () {
      const response = await fetch(
        `http://localhost:3000/ontology/${defaultModelId}/edit-model?sessionId=${testSessionId}&editMode=true`,
        {
          headers: {
            Cookie: 'OCTOKIT_TOKEN=malformed-token-without-signature',
          },
        }
      )

      expect(response.status).to.equal(401)
    })
  })

  describe('Edge cases and error handling', function () {
    it('should return appropriate HTTP status for permission denied', async function () {
      const response = await fetch(
        `http://localhost:3000/ontology/${defaultModelId}/edit-model?sessionId=${testSessionId}&editMode=true`
      )

      expect(response.status).to.equal(401)
    })

    it('should handle missing editMode parameter', async function () {
      const response = await fetch(
        `http://localhost:3000/ontology/${defaultModelId}/edit-model?sessionId=${testSessionId}`
      )

      // Missing required parameter should return 400
      expect(response.status).to.equal(400)
    })

    it('should validate model exists before checking permissions', async function () {
      const fakeModelId = 'fake-model-id-12345'

      const response = await fetch(
        `http://localhost:3000/ontology/${fakeModelId}/edit-model?sessionId=${testSessionId}&editMode=true`,
        {
          headers: {
            Cookie: 'OCTOKIT_TOKEN=s:some-token',
          },
        }
      )

      // Should fail with 500 because model doesn't exist
      expect(response.status).to.equal(500)
    })
  })
})
