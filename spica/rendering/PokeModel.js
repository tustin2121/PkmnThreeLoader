//

const { Object3D, AnimationMixer } = require('three');

class PokeModel extends Object3D {
	constructor() {
		super();
		this.type = 'PokeModel';
		this._zpowerEnable = false;
		
		this.animMixer = null;
	}
	
	get zPowerRim() { return !!this._zpowerEnable; }
	set zPowerRim(val) { this._zpowerEnable = val?1:0; }
	
	finalize() {
		this.animMixer = new AnimationMixer(this.children[0]);
		this.traverse((obj)=>{
			if (!obj.isMesh) return;
			if (!obj.material) return;
			if (!obj.material.isPokemonBaseMaterial) return;
			obj.material.parentModel = this;
		});
	}
	
}

module.exports = { PokeModel };
