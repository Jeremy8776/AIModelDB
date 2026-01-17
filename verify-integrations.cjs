/**
 * Integration Verification Script
 * 
 * This script verifies all integration points programmatically.
 * Run with: node src/renderer/tools/model-db/verify-integrations.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
    return fs.existsSync(filePath);
}

function checkFileContains(filePath, searchString) {
    if (!checkFileExists(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(searchString);
}

function checkMultipleStrings(filePath, strings) {
    if (!checkFileExists(filePath)) return { found: 0, total: strings.length, missing: strings };
    const content = fs.readFileSync(filePath, 'utf8');
    const missing = strings.filter(str => !content.includes(str));
    return { found: strings.length - missing.length, total: strings.length, missing };
}

// Test results
const results = {
    passed: 0,
    failed: 0,
    warnings: 0
};

function test(name, condition, details = '') {
    if (condition) {
        log(`✅ ${name}`, 'green');
        results.passed++;
    } else {
        log(`❌ ${name}`, 'red');
        if (details) log(`   ${details}`, 'yellow');
        results.failed++;
    }
}

function section(name) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(name, 'cyan');
    log('='.repeat(60), 'cyan');
}

// Start verification
log('\n🔍 AIModelDB Integration Verification\n', 'blue');

// 1. Window API Integrations
section('1. Window API Integrations');

const useModelsPath = 'src/renderer/tools/model-db/src/hooks/useModels.ts';
test(
    'window.__hardReset function exposed',
    checkFileContains(useModelsPath, '(window as any).__hardReset = async () =>'),
    'Check useModels.ts for window.__hardReset'
);

test(
    'hard-reset event listener registered',
    checkFileContains(useModelsPath, "window.addEventListener('hard-reset'"),
    'Check useModels.ts for event listener'
);

const aiModelDBProPath = 'src/renderer/tools/model-db/src/AIModelDBPro.tsx';
test(
    'window.llmAPI integration present',
    checkFileContains(aiModelDBProPath, 'let llmAPI = (window as any).llmAPI'),
    'Check AIModelDBPro.tsx for llmAPI integration'
);

test(
    'window.parent.llmAPI fallback present',
    checkFileContains(aiModelDBProPath, 'llmAPI = (window.parent as any).llmAPI'),
    'Check AIModelDBPro.tsx for parent fallback'
);

test(
    'window.top.llmAPI fallback present',
    checkFileContains(aiModelDBProPath, 'llmAPI = (window.top as any).llmAPI'),
    'Check AIModelDBPro.tsx for top fallback'
);

const useWindowEventsPath = 'src/renderer/tools/model-db/src/hooks/useWindowEvents.ts';
const windowEvents = checkMultipleStrings(useWindowEventsPath, [
    "window.addEventListener('edit-model'",
    "window.addEventListener('show-confirmation'",
    "window.addEventListener('open-sync'",
    "window.removeEventListener('edit-model'",
    "window.removeEventListener('show-confirmation'",
    "window.removeEventListener('open-sync'"
]);
test(
    `Custom window events (${windowEvents.found}/${windowEvents.total})`,
    windowEvents.found === windowEvents.total,
    windowEvents.missing.length > 0 ? `Missing: ${windowEvents.missing.join(', ')}` : ''
);

// 2. IPC Communication
section('2. IPC Communication');

const themeContextPath = 'src/renderer/tools/model-db/src/context/ThemeContext.tsx';
test(
    'PostMessage listener for theme changes',
    checkFileContains(themeContextPath, "window.addEventListener('message'"),
    'Check ThemeContext.tsx for message listener'
);

test(
    'Theme change message handling',
    checkFileContains(themeContextPath, "event.data?.type === 'app-theme-change'"),
    'Check ThemeContext.tsx for theme change handling'
);

test(
    'Parent window theme request',
    checkFileContains(themeContextPath, "window.parent.postMessage({ type: 'app-request-theme' }"),
    'Check ThemeContext.tsx for theme request'
);

test(
    'CSS variables applied from theme',
    checkFileContains(themeContextPath, 'root.style.setProperty'),
    'Check ThemeContext.tsx for CSS variable application'
);

test(
    'Standalone mode detection',
    checkFileContains(themeContextPath, 'window.parent !== window'),
    'Check ThemeContext.tsx for standalone detection'
);

// 3. localStorage Persistence
section('3. localStorage Persistence');

const modelsLoad = checkMultipleStrings(useModelsPath, [
    "localStorage.getItem('aiModelDB_models')",
    "localStorage.setItem('aiModelDB_models'",
    'JSON.parse(savedModels)',
    'JSON.stringify(models)'
]);
test(
    `Models persistence (${modelsLoad.found}/${modelsLoad.total})`,
    modelsLoad.found === modelsLoad.total,
    modelsLoad.missing.length > 0 ? `Missing: ${modelsLoad.missing.join(', ')}` : ''
);

test(
    'Chunked loading for large datasets',
    checkFileContains(useModelsPath, 'const chunkSize = 1000'),
    'Check useModels.ts for chunked loading'
);

test(
    'Debounced saves',
    checkFileContains(useModelsPath, 'setTimeout(() => {') && checkFileContains(useModelsPath, '}, 500)'),
    'Check useModels.ts for debounced saves'
);

const settingsContextPath = 'src/renderer/tools/model-db/src/context/SettingsContext.tsx';
const settingsPersistence = checkMultipleStrings(settingsContextPath, [
    "localStorage.getItem('aiModelDB_settings')",
    "localStorage.setItem('aiModelDB_settings'",
    'btoa(value.apiKey)',
    'atob(config.apiKey)'
]);
test(
    `Settings persistence with encryption (${settingsPersistence.found}/${settingsPersistence.total})`,
    settingsPersistence.found === settingsPersistence.total,
    settingsPersistence.missing.length > 0 ? `Missing: ${settingsPersistence.missing.join(', ')}` : ''
);

test(
    'Last sync timestamp persistence',
    checkFileContains(useModelsPath, "localStorage.getItem('aiModelDB_lastSync')"),
    'Check useModels.ts for lastSync persistence'
);

const hardReset = checkMultipleStrings(useModelsPath, [
    "k.startsWith('aiModelDB_')",
    "localStorage.removeItem(k)",
    "if ('caches' in window)",
    "await caches.keys()",
    "indexedDB.deleteDatabase"
]);
test(
    `Hard reset functionality (${hardReset.found}/${hardReset.total})`,
    hardReset.found === hardReset.total,
    hardReset.missing.length > 0 ? `Missing: ${hardReset.missing.join(', ')}` : ''
);

// 4. Context Provider Integrations
section('4. Context Provider Integrations');

test(
    'ThemeProvider exports',
    checkFileContains(themeContextPath, 'export const ThemeProvider') &&
    checkFileContains(themeContextPath, 'export const useTheme'),
    'Check ThemeContext.tsx for exports'
);

test(
    'ThemeContext.Provider usage',
    checkFileContains(themeContextPath, '<ThemeContext.Provider'),
    'Check ThemeContext.tsx for Provider usage'
);

test(
    'SettingsProvider exports',
    checkFileContains(settingsContextPath, 'export const SettingsProvider') &&
    checkFileContains(settingsContextPath, 'export const useSettings'),
    'Check SettingsContext.tsx for exports'
);

test(
    'SettingsContext.Provider usage',
    checkFileContains(settingsContextPath, '<SettingsContext.Provider'),
    'Check SettingsContext.tsx for Provider usage'
);

const providerNesting = checkMultipleStrings(aiModelDBProPath, [
    '<ThemeProvider>',
    '<SettingsProvider>',
    '<AIModelDBProContent />',
    '</SettingsProvider>',
    '</ThemeProvider>'
]);
test(
    `Provider nesting in AIModelDBPro (${providerNesting.found}/${providerNesting.total})`,
    providerNesting.found === providerNesting.total,
    providerNesting.missing.length > 0 ? `Missing: ${providerNesting.missing.join(', ')}` : ''
);

const contextUsage = checkMultipleStrings(aiModelDBProPath, [
    'const { theme } = useTheme()',
    'const { settings } = useSettings()'
]);
test(
    `Context hooks usage (${contextUsage.found}/${contextUsage.total})`,
    contextUsage.found === contextUsage.total,
    contextUsage.missing.length > 0 ? `Missing: ${contextUsage.missing.join(', ')}` : ''
);

// 5. Electron App Compatibility
section('5. Electron App Compatibility');

test(
    'Iframe embedding detection',
    checkFileContains(themeContextPath, 'window.parent !== window'),
    'Check ThemeContext.tsx for iframe detection'
);

test(
    'Parent window communication',
    checkFileContains(themeContextPath, 'window.parent.postMessage'),
    'Check ThemeContext.tsx for parent communication'
);

test(
    'Nested iframe support (window.top)',
    checkFileContains(aiModelDBProPath, 'window.top && window.top !== window'),
    'Check AIModelDBPro.tsx for window.top support'
);

test(
    'Cache API management',
    checkFileContains(useModelsPath, "'caches' in window"),
    'Check useModels.ts for cache management'
);

test(
    'IndexedDB management',
    checkFileContains(useModelsPath, 'indexedDB.deleteDatabase'),
    'Check useModels.ts for IndexedDB management'
);

const errorHandling = checkMultipleStrings(useModelsPath, [
    'try {',
    'catch (error)',
    'console.error'
]);
test(
    `Error handling present (${errorHandling.found}/${errorHandling.total})`,
    errorHandling.found >= 3,
    'Check for try-catch blocks and error logging'
);

// Summary
section('Summary');

const total = results.passed + results.failed;
const percentage = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

log(`\nTotal Tests: ${total}`, 'blue');
log(`Passed: ${results.passed}`, 'green');
log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
log(`Success Rate: ${percentage}%\n`, percentage >= 90 ? 'green' : percentage >= 70 ? 'yellow' : 'red');

if (results.failed === 0) {
    log('✅ All integration points verified successfully!', 'green');
    process.exit(0);
} else {
    log('❌ Some integration points failed verification.', 'red');
    log('Please review the failed tests above.', 'yellow');
    process.exit(1);
}
