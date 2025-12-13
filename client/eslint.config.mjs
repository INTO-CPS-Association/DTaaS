import jsxA11Y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import jest from "eslint-plugin-jest";
import reactHooks from "eslint-plugin-react-hooks";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const compat = new FlatCompat({
    baseDirectory: dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        "**/api/",
        "**/build/",
        "client/config/",
        "**/node_modules/",
        "**/script/",
        "**/coverage/",
        "**/dist/",
        "**/test-results/",
        "**/playwright-report/",
        "**/public/"
    ],
}, ...compat.extends(
    "eslint:recommended",
    "plugin:react/recommended",
    "airbnb-base",
    "plugin:@typescript-eslint/recommended",
    "prettier",
), {
    plugins: {
        "jsx-a11y": jsxA11Y,
        react,
        "react-hooks": reactHooks,
        jest,
        "@typescript-eslint": typescriptEslint
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.jest,
            ...jest.environments.globals.globals,
            Atomics: "readonly",
            SharedArrayBuffer: "readonly",
        },

        parser: tsParser,
        ecmaVersion: 11,
        sourceType: "module",

        parserOptions: {
            requireConfigFile: false,

            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    settings: {
        react: {
            version: "detect",
        },

        "import/resolver": {
            node: {
                extensions: [".js", ".jsx"],
            },
        },
    },

    rules: {
        "import/no-extraneous-dependencies": ["error", {
            devDependencies: true,
        }],

        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                "caughtErrorsIgnorePattern": "^_",
            }
        ],
        "class-methods-use-this": "off",
        "no-underscore-dangle": "off",
        "no-param-reassign": "off",
        "global-require": "off",
        "vars-on-top": "off",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "error",
        "no-console": "error",
        "react/prop-types": "off",
        "linebreak-style": 0,
        "import/no-unresolved": "off",
        "import/extensions": "off",
        "no-use-before-define": "off",
        "no-unreachable": "error",

        // Conflict with SonarCube fixes
        "consistent-return": "off",
        "no-restricted-syntax": "off",

        // Not needed with React 17+ new JSX transform
        "react/react-in-jsx-scope": "off",

        // SonarCube based rules
        "no-restricted-globals": ["error",
            {
                "name": "global",
                "message": "Use 'globalThis' instead of 'global' for cross-platform compatibility."
            }
        ],
        "no-restricted-imports": ["error",
            {
                "paths": [
                    {
                        "name": "util",
                        "message": "Use 'node:util' instead of 'util' to explicitly import Node.js built-in modules."
                    },
                    {
                        "name": "path",
                        "message": "Use 'node:path' instead of 'path' to explicitly import Node.js built-in modules."
                    },
                    {
                        "name": "fs",
                        "message": "Use 'node:fs' instead of 'fs' to explicitly import Node.js built-in modules."
                    }
                ]
            }
        ],

    },
}, {
    files: ["**/*.ts", "**/*.tsx"],

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            requireConfigFile: false,
            project: ["./tsconfig.json"],
        },
    },

    settings: {
        react: {
            pragma: "React",
            version: "detect",
        },
    },

    rules: {
        // TypeScript-specific rules that require type information
        "@typescript-eslint/no-unnecessary-type-assertion": "error",
    },
}, {
    files: ["src/**/*.slice.ts"],

    rules: {
        "no-param-reassign": ["error", {
            props: false,
        }],
    },
}, {
    files: ["test/**/*.ts", "test/**/*.tsx"],

    rules: {
        "no-restricted-globals": ["error",
            {
                "name": "global",
                "message": "Use 'globalThis' instead of 'global' for cross-platform compatibility."
            },
            {
                "name": "window",
                "message": "Use 'globalThis' instead of 'window' for cross-platform compatibility in tests."
            }
        ],
    },
}];