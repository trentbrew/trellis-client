export {}

declare module 'datatables.net' {
  export type Config = import('datatables.net').Options
  export type ConfigColumns = import('datatables.net').ColumnsConfig
}
