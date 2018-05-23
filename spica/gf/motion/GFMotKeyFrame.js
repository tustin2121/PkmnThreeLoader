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
	
	static hashCode(prevHash, { frame, value, slope }) {
		prevHash = (((prevHash * 43) - prevHash) + frame)|0;
		prevHash = (((prevHash * 17) - prevHash) + ((value * 103)|0))|0;
		prevHash = (((prevHash * 29) - prevHash) + ((slope * 47)|0))|0;
		return prevHash;
	}
	
	/**
	 * @param {list<>} keyframes
	 * @param {BufferedReader} data
	 * @param {uint} flags
	 * @param {uint} frameCount
	 */
	static setList(keyframes, data, flags, frameCount, len) {
		if (console.PARSE_DEBUG) {
			console.log(`[${console.PARSE_DEBUG.motType} ${console.PARSE_DEBUG.animNum}] case ${flags&7} for '${console.PARSE_DEBUG.name}':${console.PARSE_DEBUG.channel} : `+
				`keyframes=${keyframes} flags=${flags.toString(2)} frameCount=${frameCount}`);
			// console.log(data.readBytes(len).buffer.toString('base64'));
		}
		
		switch (flags & 7) {
			case 0: break; //No keyframes for this track
			case 1: break; //No keyframes for this track, even though there are keyframes for other x/y/z components on the same vector 3
			case 2: break; //No keyframes for this track, even though there are keyframes for other u/v components on the same vector 2
			
			case 3: // One keyframe, a constant
				keyframes.push({ frame:0, value:data.readFloat32(), slope:0 });
				break;
			
			// Key Frame List
			// case 1:
			// case 2:
			case 4: {
				let frames = readFrameTrack();
				// Stored as Quantized UInt 16, 32 bits per entry + 128 bits of offsets/scale
				let valueScale = data.readFloat32();
				let valueOffset = data.readFloat32();
				let slopeScale = data.readFloat32();
				let slopeOffset = data.readFloat32();
				for (let i = 0; i < frames.length; i++) {
					keyframes.push({
						frame : frames[i],
						value : (data.readUint16() / 0xFFFF) * valueScale + valueOffset,
						slope : (data.readUint16() / 0xFFFF) * slopeScale + slopeOffset,
					});
				}
			} break;
			case 5: {
				let frames = readFrameTrack();
				// Stored as float, 64 bits per entry
				for (let i = 0; i < frames.length; i++) {
					keyframes.push({
						frame : frames[i],
						value : data.readFloat32(),
						slope : data.readFloat32(),
					});
				}
			} break;
			
			default: //Not yet seen
				console.warn(`UNKNOWN KEYFRAME TYPE!`);
				break;
		}
		return;
		
		function readFrameTrack() {
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
			return frames;
		}
	}
}

module.exports = { GFMotKeyFrame };