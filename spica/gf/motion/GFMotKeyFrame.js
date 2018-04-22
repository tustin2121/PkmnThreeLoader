// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Motion/GFMotKeyFrame.cs

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
	static setList(keyframes, data, flags, frameCount, len) {
		switch (flags & 7) {
			case 0: break; //No keyframes for this track
			
			case 3: // One keyframe, a constant
				keyframes.push(new GFMotKeyFrame({ frame:0, value:data.readFloat32(), slope:0 })); 
				break; 
			
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
			
			case 1: //Unknown, used in Mega Steelix's floating Feelers, rotX and rotY
			case 2: //Unknown, used in Mega Steelix's eye UV translation motions
			default: //Not yet seen
				if (console.PARSE_DEBUG) 
					console.log(`[${console.PARSE_DEBUG.motType} ${console.PARSE_DEBUG.animNum}] case ${flags&7} for '${console.PARSE_DEBUG.name}':${console.PARSE_DEBUG.channel} : `, data.readBytes(len));
				break; 
		}
	}
}

module.exports = { GFMotKeyFrame };