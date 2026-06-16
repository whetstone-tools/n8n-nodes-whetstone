/**
 * ESLint config for n8n community-node verification.
 * Uses eslint-plugin-n8n-nodes-base (n8n's official linter). The `community`
 * ruleset on package.json + the `nodes`/`credentials` rulesets are what n8n's
 * verified-community-nodes program checks.
 */
module.exports = {
	root: true,
	env: { browser: true, es6: true, node: true },
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
	ignorePatterns: ['.eslintrc.js', 'copy-assets.js', '**/*.js', 'node_modules/**', 'dist/**'],
	overrides: [
		{
			files: ['package.json'],
			parser: 'jsonc-eslint-parser',
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/community'],
		},
		{
			files: ['./credentials/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/credentials'],
			rules: {
				// Plugin 1.16.3 bug: this rule's autofix camelCases a valid https
				// documentationUrl into a non-URL, which then trips
				// `documentation-url-not-http-url`. We keep a real https URL (what
				// verification actually wants) and disable only the broken rule.
				'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
			},
		},
		{
			files: ['./nodes/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/nodes'],
		},
	],
};
