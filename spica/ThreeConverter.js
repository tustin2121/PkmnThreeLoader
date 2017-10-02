// ThreeConverter.js
// Converts the output of the SuMoBin parsing to a Three.js model and animation set

const { LOD } = require('three');

/**
 * @param {object} pack - The output object from a smbin parser
 * @param {object} opts - Options for parsing
 */
function convert(pack, opts={}) {
	if (!pack.modelpack) throw new ReferenceError('Can only convert output packages with modelpacks!');
	let parent = new LOD();
	let lodDistances = opts.lodDistances || (()=>{
		let num = pack.modelpack.models.length;
		let max = opts.maxDist || 75;
		if (num === 1) return [0];
		if (num === 2) return [0, max];
		let n = [0];
		for (let i = 1; i < num; i++) n.push(max*(i/num));
		return n;
	})();

	for (let model of pack.modelpack.models) {
		// Pull out materials
		// Pull out geometries
		// Pull out meshes (with Level of Detail)
		
	}
}

/**
 * @param {string} type - The type of model this is
 * @param {object} pack - The output object from a smbin parser
 */
function categorizeAnimations(type, pack) {
	switch (type) {
		case 'overworld':
		case 'battleTrainer':
		case 'battlePokemon':
	}
}

module.exports = { convert };