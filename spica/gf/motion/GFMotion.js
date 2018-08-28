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
		this.skeletonAnimation = null; /** @type {GFSkeletonMot} */
		this.materialAnimation = null; /** @type {GFMaterialMot} */
		this.visibilityAnimation = null; /** @type {GFVisibilityMot} */
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
		this.isBlended = (data.readUint16() & 1) != 0; //probably
		this.animRegionMin = data.readVector3();
		this.animRegionMax = data.readVector3();
		this.hashid = data.readUint32();
		
		if (console.PARSE_DEBUG) console.PARSE_DEBUG['animNum'] = index;
		
		// Content
		for (let anim = 0; anim < animSects.length; anim++) {
			data.offset = pos + animSects[anim].addr;
			let _addr = data.offset;
			switch (animSects[anim].type) {
				case SECT_SUBHEADER:
					this.subheader = data.readBytes(animSects[anim].length);
					this.subheader._addr = _addr;
					break;
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
					/*
					this.effectTriggers = {
						_raw: data.readBytes(animSects[anim].length),
						_addr,
					};
					let count = data.readUint32();
					let tracks = [];
					for (let i = 0; i < count; i++) {
						let effect = data.readByteLenString(); //AK_EffectStart01.\xFF\xFF
						let values = [];
						let frameCount = data.readUint32(); //1
						for (let f = 0; f < frameCount; f++) {
							values.push({
								frame: data.readUint32(), //0x19 ?
								value: data.readFloat32(), //1.0
							});
						}
						tracks.push({ effect, values });
					}
					this.effectTriggers.tracks = tracks; */
				} break;
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