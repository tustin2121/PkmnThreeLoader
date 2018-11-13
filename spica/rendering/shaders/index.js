
const fs = require('fs');
require.extensions['.glsl'] = function(module, filename) {
	const content = fs.readFileSync(filename, 'utf8');
	module.exports = content;
};

module.exports = Object.assign({}, ...[
	require('./BattlefieldCommonMaterial'),
	require('./PokemonCommonMaterial'),
]);