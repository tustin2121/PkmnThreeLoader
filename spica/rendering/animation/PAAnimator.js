//

const { EventDispatcher, Vector3 } = require('three');
const { PokeModel } = require('../PokeModel');

const LAYERS = 7;

/**
 * The class which binds to the Pokemon or object it is animating
 * and handles all animation weighting and playing on said object.
 */
class PAAnimator extends EventDispatcher {
	constructor() {
		this.boundObjects = new Map();
		
	}
	
	addBoundObject(obj) {
		if (obj.isBone) {
			let bbone = new PABoundBone(obj);
			this.boundObjects.set(`.bone[${obj.name}]`, bbone);
		} 
		else if (obj.isMaterial) {
			let bmat = new PABoundMaterial(obj);
			this.boundObjects.set(`.mat[${obj.name}]`, bmat);
		}
		else if (obj.isMesh) {
			let bvis = new PABoundVisability(obj);
			this.boundObjects.set(`.vis[${obj.name}]`, bvis);
		}
	}
	
	addPropertyTrack({ trackName, setter, getter, bufferType=Float64Array, valueSize=1 }) {
		let trackData = {
			// name: trackName,
			setter, getter,
			valueSize,
			layers: new bufferType( valueSize*5 ),
		};
		if (trackData.valueSize > 1) {
			trackData.layers.set(getter(), 0);
		} else {
			trackData.layers[0] = getter();
		}
		this.propertyTracks.set(trackName, trackData);
	}
}

class PABound {
	constructor(obj, numProps) {
		this.bound = obj;
		this.matrix = new Float32Array( LAYERS * numProps );
	}
	
	set(index, layer, value) {
		this.matrix[(LAYERS*index)+layer] = value;
	}
	get(index, layer=0) {
		return this.matrix[(LAYERS*index)+layer];
	}
	
	update() {
		throw new TypeError('Must be overridden!');
	}
}

class PABoundBone extends PABound {
	// 0 = posX
	// 1 = posY
	// 2 = posZ
	// 3 = scaleX
	// 4 = scaleY
	// 5 = scaleZ
	// 6 = rotX
	// 7 = rotY
	// 8 = rotZ
	// 9 = rotW
	constructor(bone) {
		super(bone, 3*4*3);
	}
	
	update() {
		this.bound.position.set(
			this.matrix[LAYERS*0],
			this.matrix[LAYERS*1],
			this.matrix[LAYERS*2],
		);
		this.bound.scale.set(
			this.matrix[LAYERS*3],
			this.matrix[LAYERS*4],
			this.matrix[LAYERS*5],
		);
		this.bound.quaternion.set(
			this.matrix[LAYERS*6],
			this.matrix[LAYERS*7],
			this.matrix[LAYERS*8],
			this.matrix[LAYERS*9],
		);
		this.bound.matrixWorldNeedsUpdate = true;
	}
}

class PABoundMaterial extends PABound {
	// For maps 0, 1, 2:
	// 0 = posU
	// 1 = posV
	// 2 = rot
	// 3 = scaleU
	// 4 = scaleV
	constructor(mat) {
		super(mat, 5*3);
	}
	
	setOnMap(map, index, layer, value) {
		this.matrix[(LAYERS*((5*map)+index))+layer] = value;
	}
	
	update() {
		for (let i = 0; i < 3; i++) {
			this.bound[`map${i}`].offset.set(
				this.matrix[LAYERS*((5*i)+0)],
				this.matrix[LAYERS*((5*i)+1)],
			);
			this.bound[`map${i}`].rotation = this.matrix[LAYERS*((5*i)+2)];
			this.bound[`map${i}`].repeat.set(
				this.matrix[LAYERS*((5*i)+3)],
				this.matrix[LAYERS*((5*i)+4)],
			);
		}
	}
}

class PABoundVisability {
	constructor(vis) {
		this.bound = vis;
		this.matrix = new Array( LAYERS );
	}
	
	update() {
		this.bound.visable = this.matrix[0];
	}
}

module.exports = { PAAnimator };