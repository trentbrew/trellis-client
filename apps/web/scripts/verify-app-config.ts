import { getRouteNodes, getProjectionNodes, getThemePresetsFromConfig } from '../app/lib/appConfig'

const routes = getRouteNodes().length
const projections = getProjectionNodes().length
const themes = Object.keys(getThemePresetsFromConfig()).length

console.log('routes', routes)
console.log('projections', projections)
console.log('themes', themes)
