//

const { Object3D, AnimationMixer, Vector3, Plane } = require('three');

class PokeModel extends Object3D {
	constructor() {
		super();
		this.type = 'PokeModel';
		this._zpowerEnable = false;
		this._shadowLight = null;
		this._shadowDirection = new Vector3(1, 1, 0);
		this._shadowPlane = new Plane().setComponents(0, 1, 0, 0);
		
		this.animMixer = null;
	}
	
	get zPowerRim() { return !!this._zpowerEnable; }
	set zPowerRim(val) { this._zpowerEnable = val?1:0; }
	
	get shadowLight() { return this._shadowLight; }
	set shadowLight(val) { this._shadowLight = val; }
	
	finalize() {
		this.animMixer = new AnimationMixer(this.children[0]);
		this.traverse((obj)=>{
			if (!obj.isMesh) return;
			if (!obj.material) return;
			let mats = obj.material;
			if (!Array.isArray(mats)) mats = [mats];
			for (let mat of mats) {
				if (!mat.isPokemonCommonMaterial) continue;
				mat.parentModel = this;
			}
		});
	}
	
}

module.exports = { PokeModel };
