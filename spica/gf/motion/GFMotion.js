// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Motion/GFMotion.cs

const { Vector3 } = require('three');

const SECT_SUBHEADER = 0;
const SECT_SKELETAL = 1;
const SECT_MATERIAL = 3;
const SECT_VISABILITY = 6;

class GFMotion {
	constructor(data, index) {
		this.frameCount = 0; /** @type {uint} */
		this.isLooping = false;
		this.isBlended = false;
		this.animRegionMin = new Vector3();
		this.animRegionMax = new Vector3();
		this.skeletonAnimation = null; /** @type {GFSkeletonMot} */
		this.materialAnimation = null; /** @type {GFMaterialMot} */
		this.visibilityAnimation = null; /** @type {GFVisibilityMot} */
		this.index = index || 0; /** @type {int} */
		
		if (!data) return this;
		let pos = data.offset;
		let magicNum = data.readUint32();
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
		let animHash = data.readUint32();
		
		// Content
		for (let anim = 1; anim < animSects.length; anim++) {
			data.offset = pos + animSects[anim].addr;
			switch (animSects[anim].type) {
				case SECT_SKELETAL:
					this.skeletonAnimation = new GFSkeletonMot(data, this.frameCount);
					break;
				case SECT_MATERIAL:
					this.materialAnimation = new GFMaterialMot(data, this.frameCount);
					break;
				case SECT_VISABILITY:
					this.visibilityAnimation = new GFVisibilityMot(data, this.frameCount);
					break;
			}
		}
	}
}
Object.defineProperties(GFMotion, {
	'MAGIC_NUMBER': { value:0x00060000, },
});

module.exports = { GFMotion };