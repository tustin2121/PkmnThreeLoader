// PICAVectorFloat24.js
// Not actually a class, rather adding methods to Three's Vector4

const { Vector4 } = require('three');

function getFloat24(val) {
	let float = 0;
	if ((val & 0x7FFFFF) != 0) {
		let mantissa = val & 0xFFFF;
		let exponent = ((val >> 16) & 0x7F) + 64;
		let signBit = (val >> 23) & 1;
		float  = mantissa << 7;
		float |= exponent << 23;
		float |= signBit << 31;
	} else {
		float = (val & 0x800000) << 8;
	}
	
	let buf = Buffer.alloc(4);
	buf.writeInt32LE(float, 0);
	return buf.readFloatLE(0);
}

function getWord24(val) {
	let buf = Buffer.alloc(4);
	buf.writeFloatLE(val, 0);
	let word = buf.readInt32LE(0);
	if ((word & 0x7FFFFFFF) != 0) {
		let mantissa = word & 0x7FFFFF;
		let exponent = ((word >> 23) & 0xFF) - 64;
		let signBit = word >> 31;
		
		word  = mantissa >> 7;
		word |= (exponent & 0x7F) << 16;
		word |= signBit << 23;
	} else {
		word >>= 8;
	}
	return word;
}

if (!Vector4.prototype.setFrom24Bits) {
	Vector4.prototype.setFrom24Bits = function(w0, w1, w2) {
		this.x = getFloat24( w2 & 0xFFFFFF );
		this.y = getFloat24( (w2 >> 24) | ((w1 & 0xFFFF) << 8) );
		this.z = getFloat24( (w1 >> 16) | ((w0 & 0xFF) << 16) );
		this.w = getFloat24( w0 >> 8 );
	};
}
if (!Vector4.prototype.getFrom24Bits) {
	Vector4.prototype.getFrom24Bits = function() {
		let wx = getWord24(this.x);
		let wy = getWord24(this.y);
		let wz = getWord24(this.z);
		let ww = getWord24(this.w);
		
		return [
			((ww <<  8) | (wz >> 16)),
			((wz << 16) | (wy >>  8)),
			((wy << 24) | (wx >>  0)),
		];
	};
}

module.exports = { Vector4 };