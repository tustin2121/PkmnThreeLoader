// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Motion/GFSkeletonMot.cs

const { GFMotKeyFrame } = require('./GFMotKeyFrame');

class GFMotBoneTransform {
	constructor(data, name, frameCount) {
		this.name = name || '';
		this.isAxisAngle = false;
		/** @type {List<GtMotKeyFrame} */
		this.scaleX = [];
		this.scaleY = [];
		this.scaleZ = [];
		this.rotX = [];
		this.rotY = [];
		this.rotZ = [];
		this.transX = [];
		this.transY = [];
		this.transZ = [];
		
		if (!data) return this;
		let flags = data.readUint32();
		let len = data.readUint32();
		let end = data.offset + len;
		
		if (console.PARSE_DEBUG) console.PARSE_DEBUG['motType'] = 'Skeletal';
		if (console.PARSE_DEBUG) console.PARSE_DEBUG['name'] = name;
		
		this.isAxisAngle = (flags >> 31) === 0;
		for (let i = 0; i < 9; i++) {
			if (console.PARSE_DEBUG) console.PARSE_DEBUG['channel'] = ['scaleX','scaleY','scaleZ','rotX','rotY','rotZ','transX','transY','transZ'][i];
			switch(i) {
				case 0: GFMotKeyFrame.setList(this.scaleX, data, flags, frameCount, end-data.offset); break;
				case 1: GFMotKeyFrame.setList(this.scaleY, data, flags, frameCount, end-data.offset); break;
				case 2: GFMotKeyFrame.setList(this.scaleZ, data, flags, frameCount, end-data.offset); break;
				
				case 3: GFMotKeyFrame.setList(this.rotX, data, flags, frameCount, end-data.offset); break;
				case 4: GFMotKeyFrame.setList(this.rotY, data, flags, frameCount, end-data.offset); break;
				case 5: GFMotKeyFrame.setList(this.rotZ, data, flags, frameCount, end-data.offset); break;
				
				case 6: GFMotKeyFrame.setList(this.transX, data, flags, frameCount, end-data.offset); break;
				case 7: GFMotKeyFrame.setList(this.transY, data, flags, frameCount, end-data.offset); break;
				case 8: GFMotKeyFrame.setList(this.transZ, data, flags, frameCount, end-data.offset); break;
			}
			flags >>= 3;
		}
		if (console.PARSE_DEBUG && data.offset < end) {
			console.log(`[${console.PARSE_DEBUG.motType} ${console.PARSE_DEBUG.animNum}] Remaining data for '${console.PARSE_DEBUG.name}': `, data.readBytes(len));
		}
	}
	
	/**
	 * @type {List<>} keyframes
	 * @type {float} frame
	 * @type {float} value
	 */
	static setFrameValue(keyframes, frame, value) {
		if (keyframes.length === 1) value = keyframes[0].value;
		if (keyframes.length < 2) return value;
		
		//TODO https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Motion/GFMotBoneTransform.cs#L74
	}
}

class GFSkeletonMot {
	constructor(data, frameCount) {
		this.bones = []; /** @type {List<GFMotBoneTransform>} */
		if (!data) return this;
		
		let boneNameCount = data.readInt32();
		let boneNameLen = data.readUint32();
		let pos = data.offset;
		let boneNames = data.readStringArray(boneNameCount);
		data.offset = pos + boneNameLen;
		for (let name of boneNames) {
			this.bones.push(new GFMotBoneTransform(data, name, frameCount));
		}
	}
}

module.exports = { GFSkeletonMot, GFMotBoneTransform };