//

const { Object3D, AnimationMixer, Vector3, Plane } = require('three');

class PokeModel extends Object3D {
	constructor() {
		super();
		this.type = 'PokeModel';
		
		// Rendering Attributes
		this._zpowerEnable = false;
		this._shadowLight = null;
		this._shadowDirection = new Vector3(1, 1, 0);
		this._shadowPlane = new Plane().setComponents(0, 1, 0, 0);
		
		// Animation caches
		/** @type {Map<string, PAAnimation>} A list of all animations this Pokemon can perform. */
		this.anims = new Map();
		this._anims_emotes = [];
		this._anims_constant = [];
		this._anim_bones = {}; //bones for binding
		this._anim_mats = {} //materials for binding
		this._anim_vis = {}; //visability objects for binding
		
		this.sizeCategory = 0;
		
		this.metaPoints = [];
		this.animMixer = null;
	}
	
	
	get zPowerRim() { return !!this._zpowerEnable; }
	set zPowerRim(val) { this._zpowerEnable = val?1:0; }
	
	get shadowLight() { return this._shadowLight; }
	set shadowLight(val) { this._shadowLight = val; }
	
	
	///////////////////////////////////////////////////////////////////////////
	// Construction
	
	addAnimations(anims) {
		if (!anims) return; //do nothing
		if (!Array.isArray(anims)) throw new TypeError('Invalid animations!');
		for (let anim of anims) {
			this.anims.set(anim.name, anim);
		}
	}
	
	setEmotionAnimations(anims) {
		if (!anims) {
			this._anims_emotes = [];
			return;
		}
		if (!Array.isArray(anims)) throw new TypeError('Invalid animations!');
		anims = anims.filter(x=>x);
		this._anims_emotes = anims;
	}
	setConstantAnimations(anims) {
		if (!anims) {
			this._anims_emotes = [];
			return;
		}
		if (!Array.isArray(anims)) throw new TypeError('Invalid animations!');
		anims = anims.filter(x=>x);
		this._anims_constant = anims;
	}
	setMetaPoints(pointlist) {
		if (!Array.isArray(pointlist)) throw new TypeError('Invalid animations!');
		this.metaPoints = [];
		for (let pt of pointlist) {
			this.metaPoints[pt.a] = (this.metaPoints[pt.a]||[]);
			this.metaPoints[pt.a][pt.b-1] = { bone:pt.name, loc:new Vector3(pt.x, pt.y, pt.z) };
		}
	}
	
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
