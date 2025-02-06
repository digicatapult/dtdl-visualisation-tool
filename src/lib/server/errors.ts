export type ErrorCategory = 'Internal' | 'Temporary' | 'User'

export abstract class HttpError extends Error {
  constructor(
    private _category: ErrorCategory,
    private _code: number,
    private _userTitle: string,
    private _userMessage: string,
    detail: string
  ) {
    super(detail)
  }

  public get code(): number {
    return this._code
  }

  public get category(): ErrorCategory {
    return this._category
  }

  public get userTitle(): string {
    return this._userTitle
  }

  public get userMessage(): string {
    return this._userMessage
  }
}

export class InternalError extends HttpError {
  constructor(error?: Error | string | unknown) {
    if (error instanceof Error) {
      super('Internal', 500, 'Internal Error', 'Please contact the technical team or try again later', error.message)
      return
    }

    if (typeof error === 'string') {
      super('Internal', 500, 'Internal Error', 'Please contact the technical team or try again later', error)
      return
    }

    super('Internal', 500, 'Internal Error', 'Please contact the technical team or try again later', `${error}`)
  }
}

export class InvalidQueryError extends HttpError {
  constructor(userTitle: string, userMessage: string, detail: string, isUserError?: boolean) {
    super(isUserError ? 'User' : 'Temporary', 422, userTitle, userMessage, detail)
  }
}

export class UploadError extends HttpError {
  constructor(userMessage: string) {
    super('User', 400, 'File Upload Error', userMessage, userMessage)
  }
}

export class DataError extends HttpError {
  constructor(userMessage: string) {
    super('User', 400, 'Invalid Data Error', userMessage, userMessage)
  }
}

export class SessionError extends HttpError {
  constructor(userMessage: string) {
    super('User', 408, 'Session Error', userMessage, userMessage)
  }
}

export class GithubAuthError extends HttpError {
  constructor(userMessage: string) {
    super('User', 400, 'GitHub Auth Error', userMessage, userMessage)
  }
}
