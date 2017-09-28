// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Motion/GFSkeletonMot.cs

class GFMotKeyFrame {
	/**
	 * @param {int} frame
	 * @param {float} value
	 * @param {float} slope
	 */
	constructor({ frame, value, slope }) {
		this.frame = frame;
		this.value = value;
		this.slope = slope;
	}
	
	/**
	 * @param {list<>} keyframes
	 * @param {BufferedReader} data
	 * @param {uint} flags
	 * @param {uint} frameCount
	 */
	static setList(keyframes, data, flags, frameCount) {
		switch (flags & 7) {
			case 3: keyframes.push(new GFMotKeyFrame(0, data.readFloat32(), 0)); break;
			
			// Key Frame List
			case 4:
			case 5: {
				let kfCount = data.readUint32();
				let frames = new Array(kfCount);
				for (let i = 0; i < kfCount; i++) {
					if (frameCount > 0xFF) {
						frames[i] = data.readUint16();
					} else {
						frames[i] = data.readUint8();
					}
				}
				while ((data.offset & 3) !== 0) data.skip();
				
				if ((flags & 1) !== 0) {
					// Stored as float, 64 bits per entry
					for (let i = 0; i < kfCount; i++) {
						keyframes.push({
							frame : frames[i],
							value : data.readFloat32(),
							slope : data.readFloat32(),
						});
					}
				} else {
					// Stored as Quantized UInt 16, 32 bits per entry + 128 bits of offsets/scale
					let valueScale = data.readFloat32();
					let valueOffset = data.readFloat32();
					let slopeScale = data.readFloat32();
					let slopeOffset = data.readFloat32();
					for (let i = 0; i < kfCount; i++) {
						keyframes.push({
							frame : frames[i],
							value : (data.readUint16() / 0xFFFF) * valueScale + valueOffset,
							slope : (data.readUint16() / 0xFFFF) * slopeScale + slopeOffset,
						});
					}
				}
			} break;
		}
	}
}

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
		
		this.isAxisAngle = (flags >> 31) === 0;
		for (let i = 0; i < 9; i++) {
			switch(i) {
				case 0: GFMotKeyFrame.setList(this.scaleX, data, flags, frameCount); break;
				case 1: GFMotKeyFrame.setList(this.scaleY, data, flags, frameCount); break;
				case 2: GFMotKeyFrame.setList(this.scaleZ, data, flags, frameCount); break;
				
				case 3: GFMotKeyFrame.setList(this.rotX, data, flags, frameCount); break;
				case 4: GFMotKeyFrame.setList(this.rotY, data, flags, frameCount); break;
				case 5: GFMotKeyFrame.setList(this.rotZ, data, flags, frameCount); break;
				
				case 6: GFMotKeyFrame.setList(this.transX, data, flags, frameCount); break;
				case 7: GFMotKeyFrame.setList(this.transY, data, flags, frameCount); break;
				case 8: GFMotKeyFrame.setList(this.transZ, data, flags, frameCount); break;
			}
			flags >>= 3;
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