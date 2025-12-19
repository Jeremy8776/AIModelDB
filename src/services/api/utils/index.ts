/**
 * Utils module barrel exports
 * Provides centralized access to all utility functions
 */

// Date utilities
export { normalizeDate } from './date-utils';

// License utilities
export {
    normalizeLicenseName,
    determineType,
    determineCommercialUse,
    inferLicenseFromTags
} from './license-utils';

// Domain utilities
export {
    determineDomain,
    determineDomainFromTopics
} from './domain-utils';

// Parameter utilities
export { inferParametersFromNameTags } from './parameter-utils';

// GitHub utilities
export {
    parseGitHubRepo,
    mapSpdxToType
} from './github-utils';

// HTTP utilities
export { safeFetch } from './http-utils';
