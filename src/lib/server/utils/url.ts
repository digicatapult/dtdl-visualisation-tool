export const safeUrl = (path: string, params: Record<string, string>) => {
  const searchParams = new URLSearchParams(params)
  return `${path}?${searchParams.toString()}`
}
