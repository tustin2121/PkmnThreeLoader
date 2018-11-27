// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Motion/GFMotion.cs

const { Vector3 } = require('three');
const { GFSkeletonMot } = require('./GFSkeletonMot');
const { GFMaterialMot } = require('./GFMaterialMot');
const { GFVisibilityMot } = require('./GFVisibilityMot');
const { GFEffectMot } = require('./GFEffectMot');

const SECT_SUBHEADER = 0;
const SECT_SKELETAL = 1;
const SECT_MATERIAL = 3;
const SECT_VISABILITY = 6;
const SECT_EFFECTS = 7;

class GFMotion {
	constructor(data, index) {
		this.index = index || 0; /** @type {int} */
		this.name = null;
		this.frameCount = 0; /** @type {uint} */
		this.isLooping = false;
		this.isBlended = false;
		this.animRegionMin = new Vector3();
		this.animRegionMax = new Vector3();
		
		/** @type {GFSkeletonMot} */
		this.skeletonAnimation = null; 
		/** @type {GFMaterialMot} */
		this.materialAnimation = null; 
		/** @type {GFVisibilityMot} */
		this.visibilityAnimation = null; 
		/** @type {GFEffectMot} */
		this.effectTriggers = null; 
		
		this.animHash = null;
		
		if (!data) return this;
		let pos = data.offset;
		let magicNum = data.readUint32();
		if (magicNum !== GFMotion.MAGIC_NUMBER) throw new TypeError('Invalid magic number for motion!');
		let secCount = data.readUint32();
		
		let animSects = new Array(secCount);
		for (let anim = 0; anim < secCount; anim++) {
			animSects[anim] = {
				type : data.readUint32(), //name
				length : data.readUint32(),
				addr : data.readUint32(),
			};
		}
		
		// Subheader
		data.offset = pos + animSects[0].addr;
		this.frameCount = data.readUint32();
		this.isLooping = (data.readUint16() & 1) != 0;
		this.uknFlag = (data.readUint16() & 1) != 0; //probably
		this.animRegionMin = data.readVector3();
		this.animRegionMax = data.readVector3();
		this.hashid = data.readUint32();
		this.numAffectedBones = data.readUint32();
		// this.ukn8 = data.readFloat16();
		this.ukn8 = data.readUint32();
		
		if (console.PARSE_DEBUG) console.PARSE_DEBUG['animNum'] = index;
		
		// Content
		for (let anim = 0; anim < animSects.length; anim++) {
			data.offset = pos + animSects[anim].addr;
			let _addr = data.offset;
			switch (animSects[anim].type) {
				case SECT_SUBHEADER: break; // handled above
				case SECT_SKELETAL:
					this.skeletonAnimation = new GFSkeletonMot(data, this.frameCount);
					break;
				case SECT_MATERIAL:
					this.materialAnimation = new GFMaterialMot(data, this.frameCount);
					break;
				case SECT_VISABILITY:
					this.visibilityAnimation = new GFVisibilityMot(data, this.frameCount);
					break;
				case 5: { //?
					this.section5 = {
						_raw: data.readBytes(animSects[anim].length),
						_addr,
						ukn0 : data.readUint32(), //1 ?
						ukn1 : data.readUint32(), //4 ?
						ukn2 : data.readUint32(), //1 ?
						ukn3 : data.readByteLenString(), //Eye ?
						ukn4 : data.readUint32(), //2 ?
						ukn5 : data.readUint32(), //0x249 (585) ?
						ukn6 : data.readUint32(), //0 ?
					};
				} break;
				case SECT_EFFECTS: { // Ground Shake Effect?
					this.effectTriggers = new GFEffectMot(data, this.frameCount);
					this.effectTriggers._addr = _addr;
				} break;
				// case 8: { //? Only in Battle Backgrounds 141 & 142
				// 	// let pos = data.offset;
				// 	// let sec = this.section8 = {
				// 	// 	_raw: data.readBytes(animSects[anim].length),
				// 	// 	_addr,
				// 	// };
				// 	// let num = data.readUint32();
				// 	// let off = data.readUint32();
				// 	// sec.lightNames = [];
				// 	// for (let i = 0; i < num; i++) {
				// 	// 	sec.lightNames.push(data.readByteLenString());
				// 	// }
				// 	// num = data.readUint32();
				// 	// sec.ukn1List = [];
				// 	// for (let i = 0; i < num; i++) {
				// 	// 	//TODO Unknown data, only known instance is 0
				// 	// }
				// 	// num = data.readUint32();
				// 	// sec.ukn2List = [];
				// 	// for (let i = 0; i < num; i++) {
						
				// 	// }
					
				// } break;
				// case 10: { //? Only in Battle Backgrounds 141 & 142
					
				// } break;
				// case 11: { //? Only in Battle Backgrounds 141 & 142
					
				// } break;
				default:
					this[`section${animSects[anim].type}`] = data.readBytes(animSects[anim].length);
					this[`section${animSects[anim].type}`]._addr = _addr;
					break;
			}
		}
	}
	
	calcAnimHash() {
		if (this.animHash === null) {
			let hash = 0;
			if (this.skeletonAnimation) hash ^= this.skeletonAnimation.calcAnimHash();
			if (this.materialAnimation) hash ^= this.materialAnimation.calcAnimHash();
			if (this.visibilityAnimation) hash ^= this.visibilityAnimation.calcAnimHash();
			this.animHash = hash;
		}
		return this.animHash;
	}
	
	toThree() {
		const { AnimationClip } = require('three');
		let tracks = [];
		
		if (this.skeletonAnimation) tracks.push(...this.skeletonAnimation.toThreeTracks(this.frameCount));
		if (this.materialAnimation) tracks.push(...this.materialAnimation.toThreeTracks(this.frameCount));
		if (this.visibilityAnimation) tracks.push(...this.visibilityAnimation.toThreeTracks(this.frameCount));
		
		let clip = new AnimationClip(this.name, this.frameCount/30, tracks);
		return clip;
	}
}
Object.defineProperties(GFMotion, {
	'MAGIC_NUMBER': { value:0x00060000, },
});

module.exports = { GFMotion };