export function createTableQueryParamKeys(prefix: string) {
  return {
    search: `${prefix}Q`,
    sort: `${prefix}Sort`,
    desc: `${prefix}Desc`,
    page: `${prefix}Page`,
    size: `${prefix}Size`,
  }
}