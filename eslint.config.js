import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';

export default [
    // Global ignores
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'release/**',
            '*.config.js',
            '*.config.ts',
        ],
    },

    // Base JS config
    js.configs.recommended,

    // Main configuration for all JS/TS files
    {
        files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                crypto: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                FormData: 'readonly',
                Blob: 'readonly',
                File: 'readonly',
                FileReader: 'readonly',
                Response: 'readonly',
                Request: 'readonly',
                Headers: 'readonly',
                AbortController: 'readonly',
                AbortSignal: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                HTMLElement: 'readonly',
                HTMLInputElement: 'readonly',
                HTMLTextAreaElement: 'readonly',
                HTMLSelectElement: 'readonly',
                HTMLButtonElement: 'readonly',
                HTMLDivElement: 'readonly',
                HTMLImageElement: 'readonly',
                HTMLVideoElement: 'readonly',
                KeyboardEvent: 'readonly',
                MouseEvent: 'readonly',
                Event: 'readonly',
                EventTarget: 'readonly',
                CustomEvent: 'readonly',
                MutationObserver: 'readonly',
                IntersectionObserver: 'readonly',
                ResizeObserver: 'readonly',
                DOMException: 'readonly',
                // Node globals (for electron main process)
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                Buffer: 'readonly',
                require: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                global: 'readonly',
            },
        },
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            // React Hooks rules
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // General code quality
            'no-console': 'off', // Allow console statements (logging is intentional in this app)
            'no-unused-vars': 'off', // TypeScript handles this
            'prefer-const': 'warn',
            'no-var': 'error',

            // Formatting - disabled (handled by Prettier)
            'semi': 'off',
            'quotes': 'off',

            // Error prevention
            'no-undef': 'off', // TypeScript handles this
            'no-empty': 'warn',
            'no-duplicate-case': 'error',
            'no-unreachable': 'warn',
            'no-constant-condition': 'warn',
            'no-constant-binary-expression': 'off', // Allow patterns like `x ?? fallback` where x could be undefined
            'no-case-declarations': 'off', // Allow variable declarations in case blocks

            // Best practices
            'eqeqeq': ['warn', 'smart'],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-return-await': 'warn',
            'require-await': 'off',
            'no-throw-literal': 'warn',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },

    // Test file overrides
    {
        files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
        rules: {
            'no-console': 'off',
        },
    },
];
