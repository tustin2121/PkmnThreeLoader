// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/GFModelPack.cs

const { GFModel, GFMaterial } = require('./model');
const { GFTexture } = require('./texture/GFTexture');
const { GFShader } = require('./shader/GFShader');
const { CommonMaterial } = require('../rendering/materials');

class GFModelPack {
	constructor(data) {
		this.models = [];
		this.textures = [];
		this.shaders1 = [];
		this.unk3 = [];
		this.shaders = [];
		this.extra = [];
		
		if (!data) return this;
		
		let pos = data.offset;
		let magic = data.readUint32();
		if (magic != GFModelPack.MAGIC_NUMBER) throw new Error('Invalid header for GFModelPack');
		
		let counts = [];
		for (let i = 0; i < 5; i++) counts[i] = data.readUint32();
		this.sectionCounts = counts;
		let pointersAddr = data.offset;
		for (let sect = 0; sect < counts.length; sect++) {
			for (let entry = 0; entry < counts[sect]; entry++) {
				data.offset = pos + data.readUint32(pointersAddr + (entry * 4));
				let name = data.readByteLenString();
				let addr = data.readUint32();
				
				data.offset = pos + addr;
				switch(sect) {
					case 0: this.models.push(new GFModel(data, name)); break;
					case 1: this.textures.push(new GFTexture(data)); break;
					case 2: this.shaders1.push(new GFShader(data)); break; //More Shaders?
					case 3: this.unk3.push(data.offset.toString(16)); break; //Unknown section
					case 4: this.shaders.push(new GFShader(data)); break;
				}
			}
			pointersAddr += counts[sect] * 4;
		}
	}
	
	merge(other) {
		if (!(other instanceof GFModelPack)) throw new TypeError('Can only merge other GFModelPacks!');
		this.models = this.models.concat(other.models);
		this.textures = this.textures.concat(other.textures);
		this.shaders1 = this.shaders1.concat(other.shaders1);
		this.unk3 = this.unk3.concat(other.unk3);
		this.shaders = this.shaders.concat(other.shaders);
		return this;
	}
	
	async toThreePokemon() {
		const { PokeModel } = require('../rendering/PokeModel');
		let obj = new PokeModel();
		await this._toThree(obj);
		obj.finalize();
		return obj;
	}
	
	async toThree() {
		const { Group } = require('three');
		let obj = new Group();
		return this._toThree(obj);
	}
	
	async _toThree(obj) {
		// Gather Shaders
		let shaders = {};
		for (let gfShader of this.shaders) {
			shaders[gfShader.name] = gfShader;
		}
		
		// Gather Textures
		let textures = {};
		for (let gfTex of this.textures) {
			textures[gfTex.name] = gfTex;
		}
		await Promise.all(Object.values(textures).map(x=>x.decodeData()));
		
		let skeleton;
		
		// Compile Models
		for (let gfModel of this.models) {
			let model = gfModel.toThree();
			if (!skeleton) { skeleton = model.skeleton; }
			model.traverse((mesh)=>{
				if (!mesh.isMesh) return; //continue;
				
				let materials = mesh.material;
				if (!Array.isArray(materials)) materials = [materials];
				materials = materials.map(mat=>{
					if (mat instanceof GFMaterial) {
						let shaderInfo = CommonMaterial.transpileShaders(mat, shaders);
						mat = mat.toThree(textures);
						mat.userData = Object.assign(mat.userData, shaderInfo);
						mat.register(mesh);
					}
					if (mesh.isSkinnedMesh) {
						mat.skinning = true;
					}
					return mat;
				});
				if (mesh.isSkinnedMesh) {
					mesh.bind(skeleton, skeleton.bones[0].matrixWorld);
				}
				mesh.material = (materials.length === 1)?materials[0] : materials;
			});
			obj.add(model);
		}
		if (skeleton) {
			obj.add(skeleton.bones[0]);
			obj.skeleton = skeleton;
		}
		return obj;
	}
}
Object.defineProperties(GFModelPack, {
	'MAGIC_NUMBER': { value:0x00010000, },
});

module.exports = { GFModelPack };