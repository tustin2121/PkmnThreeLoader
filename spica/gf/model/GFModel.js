// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/GFModel.cs

const { GFSection } = require('../GFSection');
const { GFBone } = require('./GFBone');
const { GF_LUT } = require('./GF_LUT');
const { GFMaterial } = require('./GFMaterial');
const { GFMesh } = require('./GFMesh');
const { GFHashName } = require('./GFHashName');

function readHashTable(data) {
	let count = data.readUint32();
	let values = new Array(count);
	for (let i = 0; i < count; i++) {
		values[i] = new GFHashName({
			hash : data.readUint32(),
			name : data.readPaddedString(0x40),
		});
		// let hash = data.readUint32();
		// let str = data.readPaddedString(0x40);
		// str = new String(str); //jshint ignore:line
		// str.hash = hash;
		// values[i] = str;
	}
	return values;
}

class GFModel {
	constructor(data, name) {
		this.skeleton = [];
		this.luts = [];
		this.materials = [];
		this.meshes = [];
		
		this.name = name;
		let magicNum = data.readUint32(); //0x15122117 ?
		if (magicNum !== GFModel.MAGIC_NUMBER) throw new ReferenceError('Magic Number does not match!');
		let shaderCount = data.readUint32();
		data.skipPadding();
		
		let modelSection = new GFSection(data);
		let shaderNames = readHashTable(data);
		let lutNames = readHashTable(data);
		let matNames = readHashTable(data);
		let meshNames = readHashTable(data);
		
		this.boundingBoxMin = data.readVector4();
		this.boundingBoxMax = data.readVector4();
		this.transform = data.readMatrix4();
		
		{ // Unknown data
			let len = data.readUint32();
			let off = data.readUint32();
			data.skip(8); //skip padding
			data.skip(off + len);
		}
		{ // Bones
			let num = data.readUint32();
			data.skip(0xC); //Skip padding
			for (let i = 0; i < num; i++) {
				this.skeleton.push(new GFBone(data));
			}
		}
		data.skipPadding();
		{ // LUTs
			let num = data.readUint32();
			let len = data.readUint32();
			data.skipPadding();
			for (let i = 0; i < num; i++) {
				let m = new GF_LUT(data, `Sampler_${this.name}_${i}`, len);
				m.name = lutNames[i].valueOf();
				this.luts.push(m);
			}
		}
		// Materials
		for (let i = 0; i < matNames.length; i++) {
			let m = new GFMaterial(data);
			m.name = matNames[i].valueOf();
			this.materials.push(m);
		}
		// Meshes
		for (let i = 0; i < meshNames.length; i++) {
			let m = new GFMesh(data);
			m.name = meshNames[i].valueOf();
			this.meshes.push(m);
		}
	}
	
	toThree() {
		const { Skeleton } = require('three');
		
		// Skeleton
		let skeleton = (()=>{
			let bones = [];
			let boneNames = {};
			for (let bone of this.skeleton) {
				let b = bone.toThree();
				bones.push(b);
				boneNames[bone.name] = b;
				boneNames[bone.parent].add(b);
			}
			return new Skeleton(bones);
		})();
		skeleton.calculateInverses();
		
		// Materials
		let mats = [];
		for (let gfMat of this.materials) {
			mats.push(gfMat.toThree());
		}
		
		let meshes = [];
		for (let gfMesh of this.meshes) {
			for (let gfSub of gfMesh.submeshes) {
				
			}
		}
	}
}
Object.defineProperties(GFModel, {
	'MAGIC_NUMBER': { value:0x15122117, },
});

module.exports = { GFModel };