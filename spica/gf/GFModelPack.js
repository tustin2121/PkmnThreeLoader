// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/GFModelPack.cs

const { RawShaderMaterial } = require('three');
const { GFModel, GFMaterial } = require('./model');
const { GFTexture } = require('./texture/GFTexture');
const { GFShader } = require('./shader/GFShader');
const { VertShaderGenerator, FragShaderGenerator } = require('../rendering/shadergen');

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
		// Transpile Shaders
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
		
		// Compile Models
		// for (let gfModel of this.models){
		{ let gfModel = this.models[0]; //TODO HACK to dodge shadow
			let model = gfModel.toThree(false);
			model.traverse((obj)=>{
				if (!obj.isMesh) return; //continue;
				
				let mat = obj.material;
				if (mat instanceof GFMaterial) {
					let opts = {
						vertexShader: null,
						geometryShader: null,
						fragmentShader: null,
						// extensions: {},
						// defines: {},
						// uniforms: {},
					};
					// Transpile and apply Shaders
					if (mat.vtxShaderName && shaders[mat.vtxShaderName]) {
						let shader = shaders[mat.vtxShaderName];
						let gen = new VertShaderGenerator(shader.toShaderBinary());
						opts.vertexShader = { name:mat.vtxShaderName, code: gen.getVtxShader() };
					}
					if (mat.geomShaderName) {
						opts.geometryShader = { name:mat.geomShaderName, code:'exists' };
					}
					if (mat.fragShaderName && shaders[mat.fragShaderName]) {
						let shader = shaders[mat.fragShaderName];
						let gen = new FragShaderGenerator(shader.toShaderBinary(), { shader, mat });
						opts.fragmentShader = { name:mat.fragShaderName, code: gen.getFragShader() };
					}
					
					obj.userData.shaderinfo = opts;
					obj.material = obj.material.toThree(textures); //new RawShaderMaterial(opts);
				}
				// let matinfo = obj.material.userData;
				if (obj.isSkinnedMesh) obj.material.skinning = true;
				// // Apply Textures
				// if (matinfo.map && textures[matinfo.map.name]) {
				// 	let tex = textures[matinfo.map.name].toThree(matinfo.map);
				// 	obj.material.map = tex;
				// }
				// if (matinfo.normalMap && textures[matinfo.normalMap.name]) {
				// 	let tex = textures[matinfo.normalMap.name].toThree(matinfo.normalMap);
				// 	obj.material.normalMap = tex;
				// 	obj.material.normalMapType = ObjectSpaceNormalMap;
				// }
				// if (matinfo.alphaMap && textures[matinfo.alphaMap.name]) {
				// 	let tex = textures[matinfo.alphaMap.name].toThree(matinfo.alphaMap);
				// 	// obj.material.alphaTest = 1 - obj.material.alphaTest; //HACK?!
				// 	obj.material.alphaMap = tex;
				// }
				
				if (typeof obj.material.register === 'function') {
					obj.material.register(obj);
				}
			});
			obj.add(model);
		}
		return obj;
	}
}
Object.defineProperties(GFModelPack, {
	'MAGIC_NUMBER': { value:0x00010000, },
});

module.exports = { GFModelPack };