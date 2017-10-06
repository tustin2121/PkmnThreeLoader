// index.js
//

const THREE = require('three');

function convert(pack, opts={}) {
	if (!pack.modelpack) throw new ReferenceError('Can only convert output packages with modelpacks!');
	let lodDistances = opts.lodDistances || (()=>{
		let num = pack.modelpack.models.length;
		let max = opts.maxDist || 75;
		if (num === 1) return [0];
		if (num === 2) return [0, max];
		let n = [0];
		for (let i = 1; i < num; i++) n.push(max*(i/num));
		return n;
	})();
	
	
	let parent = new THREE.LOD();
	for (let model of pack.modelpack.models) {
		let MAT = new THREE.MeshBasicMaterial();
		let GEOM = new THREE.BufferGeometry();
		let MESH = new THREE.Mesh(GEOM, MAT);
		parent.add(MESH);
	}
	
}

module.exports = { convert };