// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Texture/GFTexture.cs

const THREE = require('three');
const { GFSection } = require('../GFSection');
const ByteBuffer = require('bytebuffer');
const BufferedReader = require('../../BufferedReader');

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
	toThree : function(pica) {
		//TODO: Convert to this? https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Converters/TextureConverter.cs
		switch (pica) {
			case GFTextureFormat.RGB565: return { type: THREE.UnsignedShort565Type, format:THREE.RGBFormat };
			case GFTextureFormat.RGB8: return { type: THREE.UnsignedByteType, format:THREE.RGBFormat };
			case GFTextureFormat.RGBA8: return { type: THREE.UnsignedByteType, format:THREE.RGBAFormat };
			case GFTextureFormat.RGBA4: return { type: THREE.UnsignedShort4444Type, format:THREE.RGBAFormat };
			case GFTextureFormat.RGBA5551: return { type: THREE.UnsignedShort5551Type, format:THREE.RGBAFormat };
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
	
	decodeBuffer : (function() {
		const FORMAT_BBP = (format)=>{
			switch (format) {
				case GFTextureFormat.RGBA8:		return 32;
				case GFTextureFormat.RGB8:		return 24;
				case GFTextureFormat.RGBA5551:	return 16;
				case GFTextureFormat.RGB565:	return 16;
				case GFTextureFormat.RGBA4:		return 16;
				case GFTextureFormat.LA8:		return 16;
				case GFTextureFormat.HiLo8:		return 16;
				case GFTextureFormat.L8:		return 8;
				case GFTextureFormat.A8:		return 8;
				case GFTextureFormat.LA4:		return 8;
				case GFTextureFormat.L4:		return 4;
				case GFTextureFormat.A4:		return 4;
				case GFTextureFormat.ETC1:		return 4;
				case GFTextureFormat.ETC1A4:	return 8;
			}
		};
		
		const SWIZZLE_TABLE = [
			0,  1,  8,  9,  2,  3, 10, 11,
		   16, 17, 24, 25, 18, 19, 26, 27,
			4,  5, 12, 13,  6,  7, 14, 15,
		   20, 21, 28, 29, 22, 23, 30, 31,
		   32, 33, 40, 41, 34, 35, 42, 43,
		   48, 49, 56, 57, 50, 51, 58, 59,
		   36, 37, 44, 45, 38, 39, 46, 47,
		   52, 53, 60, 61, 54, 55, 62, 63,
		];
		
		/**
		 * @param {BufferedReader|Buffer} data
		 * @param {int} width
		 * @param {int} height
		 * @param {PICATextureFormat} format
		 */
		return function(data, width, height, format) {
			while (data[0] === undefined) {
				data = data.buffer; //this will either get to the buffer or throw an error
			}
			
			if (format === GFTextureFormat.ETC1 && format === GFTextureFormat.ETC1A4) {
				return data; //TODO ?
			}
			
			let temp = [];
			let inc = Math.max(FORMAT_BBP(format) / 8, 1);
			let out = new Uint8Array(width * height * 4);
			let ioff = 0;
			for (let ty = 0; ty < height; ty += 8) {
				for (let tx = 0; tx < width; tx += 8) {
					for (let px = 0; px < 64; px++) {
						let x =  SWIZZLE_TABLE[px] & 7;
						let y = (SWIZZLE_TABLE[px] - x) >> 3;
						let ooff = (tx + x + ((height - 1 - (ty + y)) * width)) * 4;
						// let ooff = (tx + x + (((ty + y)) * width)) * 4;
						
						switch (format) {
							case GFTextureFormat.RGBA8:
								temp[0] = data[ioff + 3];
								temp[1] = data[ioff + 2];
								temp[2] = data[ioff + 1];
								temp[3] = data[ioff + 0];
								break;
								
							case GFTextureFormat.RGB8:
								temp[0] = data[ioff + 2];
								temp[1] = data[ioff + 1];
								temp[2] = data[ioff + 0];
								temp[3] = 0xFF;
								break;
								
							case GFTextureFormat.RGBA5551: {
								let val = data.readUint16(ioff);
								let a =  (val &   1) * 0xFF;
								let r = ((val >>  1) & 0x1F) << 3;
								let g = ((val >>  6) & 0x1F) << 3;
								let b = ((val >> 11) & 0x1F) << 3;
								
								temp[0] = b | (b >> 5);
								temp[1] = g | (g >> 5);
								temp[2] = r | (r >> 5);
								temp[3] = a;
							} break;
							
							case GFTextureFormat.RGB565: {
								let val = data.readUint16(ioff);
								let a = 0xFF;
								let r = ((val >>  0) & 0x1F) << 3;
								let g = ((val >>  5) & 0x3F) << 2;
								let b = ((val >> 11) & 0x1F) << 3;
								
								temp[0] = b | (b >> 5);
								temp[1] = g | (g >> 6);
								temp[2] = r | (r >> 5);
								temp[3] = a;
							} break;
							
							case GFTextureFormat.RGBA4: {
								let val = data.readUint16(ioff);
								let a = ((val >>  0) & 0xF);
								let r = ((val >>  4) & 0xF);
								let g = ((val >>  8) & 0xF);
								let b = ((val >> 12) & 0xF);
								
								temp[0] = b | (b << 4);
								temp[1] = g | (g << 4);
								temp[2] = r | (r << 4);
								temp[3] = a | (a >> 4);
							} break;
							
							case GFTextureFormat.LA8:
								temp[0] = data[ioff + 1];
								temp[1] = data[ioff + 1];
								temp[2] = data[ioff + 1];
								temp[3] = data[ioff + 0];
								break;
								
							case GFTextureFormat.HiLo8:
								temp[0] = data[ioff + 1];
								temp[1] = data[ioff + 0];
								temp[2] = 0;
								temp[3] = 0xFF;
								break;
								
							case GFTextureFormat.L8:
								temp[0] = data[ioff];
								temp[1] = data[ioff];
								temp[2] = data[ioff];
								temp[3] = 0xFF;
								break;
								
							case GFTextureFormat.A8:
								temp[0] = 0xFF;
								temp[1] = 0xFF;
								temp[2] = 0xFF;
								temp[3] = data[ioff];
								break;
								
							case GFTextureFormat.LA4:
								temp[0] = (data[ioff] >> 4) | (data[ioff] & 0xF0);
								temp[1] = (data[ioff] >> 4) | (data[ioff] & 0xF0);
								temp[2] = (data[ioff] >> 4) | (data[ioff] & 0xF0);
								temp[3] = (data[ioff] << 4) | (data[ioff] & 0x0F);
								break;
								
							case GFTextureFormat.L4: {
								let val = data.readUint16(ioff);
								
								temp[0] = (val << 4) | val;
								temp[1] = (val << 4) | val;
								temp[2] = (val << 4) | val;
								temp[3] = 0xFF;
							} break;
							
							case GFTextureFormat.A4: {
								let val = data.readUint16(ioff);
								
								temp[0] = 0xFF;
								temp[1] = 0xFF;
								temp[2] = 0xFF;
								temp[3] = (val << 4) | val;
							} break;
						}
						
						// out[ooff + 0] = temp[3];
						// out[ooff + 1] = temp[0];
						// out[ooff + 2] = temp[1];
						// out[ooff + 3] = temp[2];
						out[ooff + 0] = temp[0];
						out[ooff + 1] = temp[1];
						out[ooff + 2] = temp[2];
						out[ooff + 3] = temp[3];
						ioff += inc;
					}
				}
			}
			return out;
		};
	})(),
};

class GFTexture {
	/** @param {BufferedReader} data */
	constructor(data) {
		if (!data) {
			this.name = '';
			this.rawBuffer = null;
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
			this.rawBuffer = data.readBytes(texLen);
		}
	}
	
	toThree(opts={}) {
		const { DataTexture } = require('three');
		// let data = this.rawBuffer.buffer; //TODO https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Converters/TextureConverter.cs
		let data = GFTextureFormat.decodeBuffer(this.rawBuffer, this.width, this.height, this.format);
		let format = GFTextureFormat.toThree(this.format);
		const TEX = new DataTexture(
			data,
			this.width,
			this.height,
			// format.format,
			// format.type,
			THREE.RGBAFormat,
			THREE.UnsignedByteType,
			opts.mapping,
			opts.wrapS,
			opts.wrapT,
			THREE.NearestFilter, //opts.magFilter,
			THREE.NearestFilter, //opts.minFilter,
		);
		TEX.offset = opts.offset;
		TEX.repeat = opts.repeat;
		TEX.rotation = opts.rotation;
		TEX.name = opts.name;
		TEX.unpackAlignment = 4;
		TEX.needsUpdate = true;
		
		if (global.textureTests) {
			global.textureTests.submit(TEX);
		}
		return TEX;
	}
}
Object.defineProperties(GFTexture, {
	'MAGIC_NUMBER': { value:0x15041213, },
});

module.exports = { GFTexture, GFTextureFormat };