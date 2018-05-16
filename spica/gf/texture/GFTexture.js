// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Texture/GFTexture.cs

const THREE = require('three');
const { GFSection } = require('../GFSection');

const GFTextureFormat = {
	RGB565 : 0x02,
	RGB8 : 0x03,
	RGBA8 : 0x04,
	RGBA4 : 0x16,
	RGBA5551: 0x17,
	LA8 : 0x23,
	HiLo8 : 0x24,
	L8 : 0x25,
	A8 : 0x26,
	LA4 : 0x27,
	L4 : 0x28,
	A4 : 0x29,
	ETC1 : 0x2A,
	ETC1A4 : 0x2B,
	convert3 : function(pica) {
		switch (pica) {
			case GFTextureFormat.RGB565: return { type: THREE.UnsignedShort565Type, format:THREE.RGBFormat };
			case GFTextureFormat.RGB8: return { type: THREE.UnsignedByteType, format:THREE.RGBFormat };
			case GFTextureFormat.RGBA8: return { type: THREE.UnsignedByteType, format:THREE.RGBAFormat };
			case GFTextureFormat.RGBA4: return { type: THREE.UnsignedShort4444Type, format:THREE.RGBAFormat };
			case GFTextureFormat.RGBA555: return { type: THREE.UnsignedShort5551Type, format:THREE.RGBAFormat };
			case GFTextureFormat.LA8: return { type: THREE.UnsignedByteType, format:THREE.LuminanceAlphaFormat };
			case GFTextureFormat.HiLo8: throw new TypeError('Unsupported GFTextureFormat.HiLo8');
			case GFTextureFormat.L8: return { type: THREE.UnsignedByteType, format:THREE.LuminanceFormat };
			case GFTextureFormat.A8: return { type: THREE.UnsignedByteType, format:THREE.AlphaFormat };
			case GFTextureFormat.LA4: return { type: THREE.UnsignedShort4444Type, format:THREE.LuminanceAlphaFormat };
			case GFTextureFormat.L4: return { type: THREE.UnsignedShort4444Type, format:THREE.LuminanceFormat };
			case GFTextureFormat.A4: return { type: THREE.UnsignedShort4444Type, format:THREE.AlphaFormat };
			case GFTextureFormat.ETC1: throw new TypeError('Unsupported GFTextureFormat.ETC1');
			case GFTextureFormat.ETC1A4: throw new TypeError('Unsupported GFTextureFormat.ETC1A4');
		}
	},
};

class GFTexture {
	/** @param {BufferedReader} data */
	constructor(data) {
		if (!data) {
			this.name = '';
			this.rawbuffer = null;
			this.width = 0;
			this.height = 0;
			this.format = null;
			this.mipmapSize = 0;
		} else {
			let magic = data.readUint32();
			if (magic !== GFTexture.MAGIC_NUMBER) throw new TypeError('Texture magic number does not match!');
			let texCount = this._texCount = data.readUint32(); // Unused? always 1?
			let texSection = new GFSection(data);
			let texLen = data.readUint32();
			
			data.skip(0xC); //Padding? Always zero it seems
			this.name = data.readPaddedString(0x40);
			
			this.width = data.readUint16();
			this.height = data.readUint16();
			this.format = data.readUint16();
			this.mipmapSize = data.readUint16();
			
			data.skip(0x10);
			this.rawbuffer = data.readBytes(texLen);
		}
	}
	
	toThree() {
		//TODO
	}
}
Object.defineProperties(GFTexture, {
	'MAGIC_NUMBER': { value:0x15041213, },
});

module.exports = { GFTexture, GFTextureFormat };