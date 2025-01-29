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
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "error",
        "no-console": "error",
        "import/first": "error",
        "react/prop-types": "off",
        "linebreak-style": 0,
        "import/no-unresolved": "off",
        "import/extensions": "off",
        "no-use-before-define": "off",
        "no-unreachable": "error",
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
}, {
    files: ["src/**/*.slice.ts"],

    rules: {
        "no-param-reassign": ["error", {
            props: false,
        }],
    },
}];