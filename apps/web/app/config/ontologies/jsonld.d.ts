declare module '*.jsonld' {
  const value: {
    '@context': Record<string, unknown>
    '@id': string
    '@type': string
    '@graph': Array<Record<string, unknown>>
    [key: string]: unknown
  }
  export default value
}
