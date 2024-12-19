export abstract class HttpError extends Error {
  public abstract get code(): number
}

export class InternalError extends HttpError {
  constructor(message?: string) {
    super(message)
  }

  public get code(): number {
    return 501
  }
}

export class InvalidQueryError extends HttpError {
  constructor(message?: string) {
    super(message)
  }

  public get code(): number {
    return 422
  }
}

export class UploadError extends Error {
  constructor(message?: string) {
    super(message)
  }

  public get code(): number {
    return 400
  }
}
