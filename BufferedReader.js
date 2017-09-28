const ByteBuffer = require("bytebuffer");
const { Vector2, Vector3, Vector4, Quaternion, Matrix4, Matrix3 } = require('three');

class BufferedReader {
	constructor(data) {
		this.data = data;
	}
	
	get buffer() { return this.data.buffer; }
	get length() { return this.data.limit; }
	
	get offset() { return this.data.offset; }
	set offset(val) { this.data.offset = val; }
	
	readFloat(offset) { return this.data.readFloat32(offset); }
	readFloat32(offset) { return this.data.readFloat32(offset); }
	
	readInt8(offset) { return this.data.readInt8(offset); }
	readInt16(offset) { return this.data.readInt16(offset); }
	readInt32(offset) { return this.data.readInt32(offset); }
	
	readUint8(offset) { return this.data.readUint8(offset); }
	readUint16(offset) { return this.data.readUint16(offset); }
	readUint32(offset) { return this.data.readUint32(offset); }
	
	readVector2(offset) {
		let advance = (offset === undefined);
		offset = offset || this.data.offset;
		let vec = new Vector2(
			this.data.readFloat32(offset),
			this.data.readFloat32(offset+4)
		);
		if (advance) this.data.skip(4*2);
		return vec;
	}
	readVector3(offset) {
		let advance = (offset === undefined);
		offset = offset || this.data.offset;
		let vec = new Vector3(
			this.data.readFloat32(offset),
			this.data.readFloat32(offset+4),
			this.data.readFloat32(offset+8)
		);
		if (advance) this.data.skip(4*3);
		return vec;
	}
	readVector4(offset) {
		let advance = (offset === undefined);
		offset = offset || this.data.offset;
		let vec = new Vector4(
			this.data.readFloat32(offset),
			this.data.readFloat32(offset+4),
			this.data.readFloat32(offset+8),
			this.data.readFloat32(offset+12)
		);
		if (advance) this.data.skip(4*4);
		return vec;
	}
	readQuaternion(offset) {
		let advance = (offset === undefined);
		offset = offset || this.data.offset;
		let vec = new Quaternion(
			this.data.readFloat32(offset),
			this.data.readFloat32(offset+4),
			this.data.readFloat32(offset+8),
			this.data.readFloat32(offset+12)
		);
		if (advance) this.data.skip(4*4);
		return vec;
	}
	
	readMatrix4(offset) {
		let advance = (offset === undefined);
		offset = offset || this.data.offset;
		let mat = new Matrix4();
		for (let i = 0; i < 16; i++) {
			mat.elements[i] = this.data.readFloat32(offset+(4*i));
		}
		if (advance) this.data.skip(4*16);
		return mat;
	}
	readMatrix3(offset) {
		let advance = (offset === undefined);
		offset = offset || this.data.offset;
		let mat = new Matrix3();
		for (let i = 0; i < 9; i++) {
			mat.elements[i] = this.data.readFloat32(offset+(4*i));
		}
		if (advance) this.data.skip(4*3);
		return mat;
	}
	readMatrix3x4(offset) {
		let advance = (offset === undefined);
		offset = offset || this.data.offset;
		let mat = new Matrix4();
		for (let i = 0; i < 12; i++) {
			mat.elements[i] = this.data.readFloat32(offset+(4*i));
		}
		if (advance) this.data.skip(4*12);
		return mat;
	}
	
	readMagicNumber(len=4) {
		let num = '';
		for (let i = 0; i < len; i++) {
			num += String.fromCharCode(this.data.readUint8());
		}
		return num;
	}
	readIntLenString(len) {
		if (len === undefined) len = this.readUint32();
		return this.data.readUTF8String(len, ByteBuffer.METRICS_BYTES);
	}
	readByteLenString(len) {
		if (len === undefined) len = this.readUint8();
		return this.data.readUTF8String(len, ByteBuffer.METRICS_BYTES);
	}
	readPaddedString(len, offset) {
		if (!len || typeof len === 'number') return null;
		let advance = (offset === undefined);
		offset = offset || this.data.offset;
		
		let str = '';
		for (let i = 0; i < len; i++) {
			let char = this.data.readUint8(offset);
			if (char === 0) break;
			str += String.fromCharCode(char);
		}
		if (advance) this.data.skip(len);
		return str;
	}
	readStringArray(count) {
		let out = [];
		for (let i = 0; i < count; i++) {
			out[i] = data.readByteLenString();
		}
		return out;
	}
	
	skip(len=1) { this.data.skip(len); }
	
	skipPadding() {
		while((this.data.offset & 0xF) != 0) this.data.offset++;
		if (!this.data.noAssert) {
            if (this.data.offset > this.data.buffer.length)
                throw RangeError(`Skipped past end of data!`);
        }
	}
	
	readBytes(len) {
		return this.data.copy(this.data.offset, this.data.offset+len);
	}
}

module.exports = { BufferedReader };