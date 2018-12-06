// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Texture/GFTexture.cs

const THREE = require('three');
const { GFSection } = require('../GFSection');
const ByteBuffer = require('bytebuffer');
const BufferedReader = require('../../BufferedReader');
const ETCDecompressor = require('./ETCDecompressor');

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
	getDecode : function(format) {
		switch (format) {
			case GFTextureFormat.RGBA8:
				return [(input, output)=>{
					output[0] = input[3];
					output[1] = input[2];
					output[2] = input[1];
					output[3] = input[0];
				}, 32];
				
			case GFTextureFormat.RGB8:
				return [(input, output)=>{
					output[0] = input[2];
					output[1] = input[1];
					output[2] = input[0];
					output[3] = 0xFF;
				}, 24];
				
			case GFTextureFormat.RGBA5551:
				return [(input, output)=>{
					let val = input.readUint16(0);
					let a =  (val &   1) * 0xFF;
					let r = ((val >>>  1) & 0x1F) << 3;
					let g = ((val >>>  6) & 0x1F) << 3;
					let b = ((val >>> 11) & 0x1F) << 3;
					
					output[0] = b | (b >>> 5);
					output[1] = g | (g >>> 5);
					output[2] = r | (r >>> 5);
					output[3] = a;
				}, 16];
			
			case GFTextureFormat.RGB565:
				return [(input, output)=>{
					let val = input.readUint16(0);
					let a = 0xFF;
					let r = ((val >>>  0) & 0x1F) << 3;
					let g = ((val >>>  5) & 0x3F) << 2;
					let b = ((val >>> 11) & 0x1F) << 3;
					
					output[0] = b | (b >>> 5);
					output[1] = g | (g >>> 6);
					output[2] = r | (r >>> 5);
					output[3] = a;
				}, 16];
			
			case GFTextureFormat.RGBA4:
				return [(input, output)=>{
					let val = input.readUint16(0);
					let a = ((val >>>  0) & 0xF);
					let r = ((val >>>  4) & 0xF);
					let g = ((val >>>  8) & 0xF);
					let b = ((val >>> 12) & 0xF);
					
					output[0] = b | (b <<  4);
					output[1] = g | (g <<  4);
					output[2] = r | (r <<  4);
					output[3] = a | (a >>> 4);
				}, 16];
			
			case GFTextureFormat.LA8:
				return [(input, output)=>{
					output[0] = input[1];
					output[1] = input[1];
					output[2] = input[1];
					output[3] = input[0];
				}, 8];
				
			case GFTextureFormat.HiLo8:
				return [(input, output)=>{
					output[0] = input[1];
					output[1] = input[0];
					output[2] = 0;
					output[3] = 0xFF;
				}, 8];
				
			case GFTextureFormat.L8:
				return [(input, output)=>{
					output[0] = input[0];
					output[1] = input[0];
					output[2] = input[0];
					output[3] = 0xFF;
				}, 8];
				
			case GFTextureFormat.A8:
				return [(input, output)=>{
					output[0] = 0xFF;
					output[1] = 0xFF;
					output[2] = 0xFF;
					output[3] = input[0];
				}, 8];
				
			case GFTextureFormat.LA4:
				return [(input, output)=>{
					output[0] = (input[0] >>> 4) | (input[0] & 0xF0);
					output[1] = (input[0] >>> 4) | (input[0] & 0xF0);
					output[2] = (input[0] >>> 4) | (input[0] & 0xF0);
					output[3] = (input[0] <<  4) | (input[0] & 0x0F);
				}, 8];
				
			case GFTextureFormat.L4:
				return [(input, output)=>{
					let val = input.readUint16(0);
					
					output[0] = (val << 4) | val;
					output[1] = (val << 4) | val;
					output[2] = (val << 4) | val;
					output[3] = 0xFF;
				}, 4];
			
			case GFTextureFormat.A4:
				return [(input, output)=>{
					let val = input.readUint16(0);
					
					output[0] = 0xFF;
					output[1] = 0xFF;
					output[2] = 0xFF;
					output[3] = (val << 4) | val;
				}, 4];
			
			case GFTextureFormat.ETC1: //[?, 4];
				return [ETCDecompressor.decompressETC1, 0];
				
			case GFTextureFormat.ETC1A4: //[?, 8];
				return [ETCDecompressor.decompressETC1A4, 0];
		}
	},
	
	decodeBuffer : (function() {
		const UNHANDLED_PET = {};
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
		const IDENTITY_MAPPING = (input, output)=>{
			output[0] = input[0];
			output[1] = input[1];
			output[2] = input[2];
			output[3] = input[3];
		};
		const PET_MAPPING = (input, output)=>{
			output[3] = 0xFF;
			switch (input[0]) {
				//				R			G			B
				// Invalid location:
				case 0x00: output[0] = output[1] = output[2] = 0x00; break;
				//
				case 0x02: output[0] = output[1] = output[2] = 0x62; break;
				case 0x03: output[0] = output[1] = output[2] = 0x63; break;
				case 0x04: output[0] = output[1] = output[2] = 0x64; break;
				case 0x06: output[0] = output[1] = output[2] = 0x66; break;
				// Face Marking?
				case 0x08: output[0] = output[1] = output[2] = 0xF0; break;
				// Body Marking?
				case 0x09: output[0] = output[1] = output[2] = 0xC0; break;
				case 0x0A: output[0] = output[1] = output[2] = 0xCF; break;
				// Ghostly Hand Reaction
				case 0x0D: output[0] = 0x66; output[1] = 0x00; output[2] = 0x66; break;
				// Water Hand Reaction
				case 0x13: output[0] = 0x00; output[1] = 0x00; output[2] = 0x99; break;
				// Bad Reactions:
				case 0x19: output[0] = 0xDD; output[1] = 0x00; output[2] = 0x00; break;
				case 0x1A: output[0] = 0x66; output[1] = 0x00; output[2] = 0x00; break;
				// Good Reactions:
				case 0x1B: output[0] = 0x00; output[1] = 0xDD; output[2] = 0x00; break;
				case 0x1C: output[0] = 0x00; output[1] = 0x66; output[2] = 0x00; break;
				
				default:
					if (!UNHANDLED_PET[input[0]]) {
						console.log('Unhandled pet value:', input[0]);
						UNHANDLED_PET[input[0]] = true;
					}
					output[0] = input[0];
					output[1] = input[1];
					output[2] = input[2];
					output[3] = 0xFF;
					break;
			}
		};
		
		/**
		 * @param {BufferedReader|Buffer} data
		 * @param {int} width
		 * @param {int} height
		 * @param {PICATextureFormat} format
		 */
		return function(tex) {
			let { buffer:data, width, height, format } = tex;
			return new Promise((resolve, reject)=>{
				while (data[0] === undefined) {
					data = data.buffer; //this will either get to the buffer or throw an error
				}
				// if (format === GFTextureFormat.ETC1 && format === GFTextureFormat.ETC1A4) {
				// 	return resolve(data); //TODO ?
				// }
				const extraMapping = (tex.isPetMap)? PET_MAPPING : IDENTITY_MAPPING;
				
				process.nextTick(()=>{
					let [convert, increment] = GFTextureFormat.getDecode(format);
					if (!increment) { //ETC decompression
						return resolve(convert(data, width, height));
					}
					let out = new Uint8Array(width * height * 4);
					let ioff = 0, ooff = 0, x, y;
					let input = [], output = [];
					input.readUint16 = function(){ return this[0]|(this[1] << 8); }
					for (let ty = 0; ty < height; ty += 8) {
						for (let tx = 0; tx < width; tx += 8) {
							for (let px = 0; px < 64; px++) {
								let x =  SWIZZLE_TABLE[px] & 7;
								let y = (SWIZZLE_TABLE[px] - x) >>> 3;
								let ooff = (tx + x + ((height - 1 - (ty + y)) * width)) * 4;
								for (let i = 0; i < increment >>> 3; i++) {
									input[i] = data[ioff]; ioff++;
									output[i] = 0;
								}
								convert(input, output);
								extraMapping(output, input);
								for (let i = 0; i < 4; i++) { //NOT related to increment
									out[ooff] = input[i]; ooff++;
								}
							}
						}
					}
					resolve(out);
				});
			});
		};
	})(),
};

class GFTexture {
	/** @param {BufferedReader} data */
	constructor(data) {
		this.name = '';
		this.width = 0;
		this.height = 0;
		this.format = null;
		this.mipmapSize = 0;
		this.buffer = null;
		this.isPetMap = false;
		
		if (!data) return;
		
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
		// this.rawBuffer = data.readBytes(texLen);
		this._decoded = false;
		this.buffer = data.readBytes(texLen);
	}
	
	decodeData() {
		if (this._decoded) return Promise.resolve(this.buffer);
		return GFTextureFormat.decodeBuffer(this)
			.then((d)=>{
				this.buffer = d;
				this._decoded = true;
				return d;
			});
	}
	
	getInfoString() {
		let str = 'UNKOWN_FORMAT';
		for (let type in GFTextureFormat) {
			if (GFTextureFormat[type] === this.format) {
				str = type;
				break;
			}
		}
		return `${str} ${this.width}x${this.height} [texCount=${this._texCount}]`;
	}
	
	toThree(opts={}) {
		const { DataTexture } = require('three');
		let data = this.buffer;
		const TEX = new DataTexture(
			data,
			this.width,
			this.height,
			THREE.RGBAFormat,
			THREE.UnsignedByteType,
			opts.mapping,
			opts.wrapS,
			opts.wrapT,
			THREE.LinearFilter, //opts.magFilter,
			THREE.LinearFilter, //opts.minFilter,
		);
		TEX.center = opts.center;
		TEX.offset = opts.offset;
		TEX.repeat = opts.repeat;
		TEX.rotation = opts.rotation;
		TEX.name = opts.name;
		TEX.unpackAlignment = 4;
		TEX.needsUpdate = true;
		
		if (this.isPetMap) {
			TEX.isPetMap = true;
			TEX.repeat.set(1, 1);
			TEX.offset.set(0, 0);
		}
		
		return TEX;
	}
}
Object.defineProperties(GFTexture, {
	'MAGIC_NUMBER': { value:0x15041213, },
});

module.exports = { GFTexture, GFTextureFormat };