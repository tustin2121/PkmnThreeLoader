
const fs = require('fs');
require.extensions['.glsl'] = function(module, filename) {
	const content = fs.readFileSync(filename, 'utf8');
	module.exports = content;
};

const MATS = Object.assign({}, ...[
	require('./mats/CommonMaterial'),
	require('./mats/BattlefieldMaterial'),
	require('./mats/PokemonBaseMaterial'),
	require('./mats/ShadowPressMaterial'),
]);

/**
 * Tries to find a material class for the given shader name.
 * @param {string} fragName - Fragment shader name to match against
 * @param {string} vertName - Vertex shader name to match against
 */
function getMaterialForName(fragName, vertName) {
	for (let mat of Object.values(MATS)) {
		if (!mat.matchNames) continue;
		// We're assuming matchNames is an array of strings and regexes.
		for (let name of mat.matchNames) {
			if (typeof name === 'string') {
				if (name === fragName) return mat;
				if (name === vertName) return mat;
			} else {
				if (name.test(fragName)) return mat;
				if (name.test(vertName)) return mat;
			}
		}
	}
	return MATS.PokemonBaseMaterial;
}

module.exports = Object.assign({ getMaterialForName }, MATS);
