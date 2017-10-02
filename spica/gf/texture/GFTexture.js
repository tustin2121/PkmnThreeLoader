// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Texture/GFTexture.cs

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
			let texCount = data.readUint32();
			let texSection = new GFSection(data);
			let texLen = data.readUint32();
			
			data.skip(0xC);
			this.name = data.readPaddedString(0x40);
			
			this.width = data.readUint16();
			this.height = data.readUint16();
			this.format = data.readUint16();
			this.mipmapSize = data.readUint16();
			
			data.skip(0x10);
			this.rawbuffer = data.readBytes(texLen);
		}
	}
	
	toThreeTexture() {
		//TODO
	}
}
Object.defineProperties(GFTexture, {
	'MAGIC_NUMBER': { value:0x15041213, },
});

module.exports = { GFTexture, GFTextureFormat };