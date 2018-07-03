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
				//*
				case 3: GFMotKeyFrame.setList(this.rotX, data, flags, frameCount, end-data.offset); break;
				case 4: GFMotKeyFrame.setList(this.rotY, data, flags, frameCount, end-data.offset); break;
				case 5: GFMotKeyFrame.setList(this.rotZ, data, flags, frameCount, end-data.offset); break;
				/*/
				case 3: GFMotKeyFrame.setList(this.rotZ, data, flags, frameCount, end-data.offset); break;
				case 4: GFMotKeyFrame.setList(this.rotY, data, flags, frameCount, end-data.offset); break;
				case 5: GFMotKeyFrame.setList(this.rotX, data, flags, frameCount, end-data.offset); break;
				//*/
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
	
	calcAnimHash() {
		let hash = this.name.split('').reduce((prev,curr)=> (((prev << 5) - prev) + curr.charCodeAt(0))|0, 0);
		if (this.isAxisAngle) hash = (hash << 5)|0;
		hash = this.scaleX.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.scaleY.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.scaleZ.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.rotX.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.rotY.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.rotZ.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.transX.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.transY.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.transZ.reduce(GFMotKeyFrame.hashCode, hash);
		return hash;
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
	
	calcAnimHash() {
		let hash = (this.bones.length * 17) % 0xFFFFFFFF;
		for (let bone of this.bones) {
			hash ^= bone.calcAnimHash();
		}
		return hash;
	}
	
	toThreeTracks(frameCount) {
		const { VectorKeyframeTrack, NumberKeyframeTrack } = require('three');
		
		let tracks = [];
		for (let bone of this.bones) {
			tracks.push(...makeTrack(`.bones[${bone.name}].scale`, bone.scaleX, bone.scaleY, bone.scaleZ));
			tracks.push(...makeTrack(`.bones[${bone.name}].rotation`, bone.rotX, bone.rotY, bone.rotZ));
			tracks.push(...makeTrack(`.bones[${bone.name}].position`, bone.transX, bone.transY, bone.transZ));
		}
		return tracks;
		
		function makeTrack(path, vx, vy, vz) {
			let num = 0;
			if (vx.length) num++;
			if (vy.length) num++;
			if (vz.length) num++;
        
			if (num === 0) return [];
			// if (num !== 3) {
				let tracks = [];
				if (vx.length) tracks.push(makeNumTrack(`${path}[x]`, vx));
				if (vy.length) tracks.push(makeNumTrack(`${path}[y]`, vy));
				if (vz.length) tracks.push(makeNumTrack(`${path}[z]`, vz));
				return tracks;
			// }
            //
			// let frameVals = new Array(frameCount);
			// for (let i = 0, ix = 0, iy = 0, iz = 0; i < frameCount; i++) {
			// 	let frame = { num:i, x:undefined, y:undefined: z:undefined };
			// 	if (vx[ix].frame === i) {
			// 		frame
			// 	}
			// }
            //
            //
            //
			// let times=[], values=[];
            //
			// let track = new VectorKeyframeTrack(path, )
		}
		
		function makeNumTrack(path, vt) {
			let times=[], values=[];
			for (let frame of vt) {
				times.push(frame.frame);
				values.push(frame.value);
				//TODO frame.slope; ???
			}
			let track = new NumberKeyframeTrack(path, times, values);
			return track;
		}
	}
}

module.exports = { GFSkeletonMot, GFMotBoneTransform };