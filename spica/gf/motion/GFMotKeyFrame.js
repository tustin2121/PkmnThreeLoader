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

module.exports = { GFMotKeyFrame };