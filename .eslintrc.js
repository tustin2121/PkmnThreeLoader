// ESLint default configuration from c9
module.exports = {
	env: {
		"browser": false,
		"amd": true,
		"builtin": true,
		"node": true,
		"jasmine": false,
		"mocha": true,
		"es6": true,
		"jquery": false,
		"meteor": false,
	},
	parserOptions: {
		ecmaFeatures: {
	        globalReturn: true, // allow return statements in the global scope
	        jsx: true, // enable JSX
	        experimentalObjectRestSpread: true,
	    },
	    ecmaVersion: 2017,
	    // sourceType: "module"
	},
	globals: {
		getLogger: false,
		Bot: false,
	},
	rules: {
		"handle-callback-err": 1,
	    "no-debugger": 1,
	    "no-undef": 1,
	    // "no-use-before-define": [3, "nofunc"], // too buggy
	    // "no-shadow": 1,//3, // to annoying
	    "no-inner-declarations": [1, "functions"],
	    "no-native-reassign": 1,
	    "no-new-func": 1,
	    "no-new-wrappers": 1,
	    "no-cond-assign": [1, "except-parens"],
	    "no-dupe-keys": 1,//3,
	    "no-eval": 1,
	    "no-func-assign": 1,
	    "no-extra-semi": 1,//3,
	    "no-invalid-regexp": 1,
	    "no-irregular-whitespace": 1,//3,
	    "no-negated-in-lhs": 1,
	    "no-regex-spaces": 1,//3,
	    "quote-props": 0,
	    "no-unreachable": 1,
	    "use-isnan": 2,
	    "valid-typeof": 1,
	    "no-redeclare": 1,//3,
	    "no-with": 1,
	    "radix": 1,//3,
	    "no-delete-var": 2,
	    "no-label-var": 1,//3,
	    "no-console": 1,
	    "no-shadow-restricted-names": 2,
	    "no-new-require": 2,
	},
};