import { ModelingException, ParsingException, ResolutionException } from '../../../interop/DtdlErr.js'

const isParsingException = (exception: ModelingException): exception is ParsingException => {
  return exception.ExceptionKind === 'Parsing'
}

const isResolutionException = (exception: ModelingException): exception is ResolutionException => {
  return exception.ExceptionKind === 'Resolution'
}

export const handleParsingException = (err: unknown) => {
  if (!(err instanceof Error)) return console.error(`Unexpected error: ${err}`)

  const exception = JSON.parse(err.message) as ModelingException

  // determine type in case we want to log differently
  if (isParsingException(exception)) {
    console.error(exception)
  } else if (isResolutionException(exception)) {
    console.error(exception)
  } else {
    console.error('Unknown exception type')
    console.error(exception)
  }
}
