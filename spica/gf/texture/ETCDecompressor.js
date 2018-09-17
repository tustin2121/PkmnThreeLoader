// https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Converters/TextureCompression.cs

const BufferedReader = require('../../BufferedReader');

const XT = [0, 4, 0, 4];
const YT = [0, 0, 4, 4];
const ETC1LUT = [
	[  2,  8,  -2,  -8 ],
	[  5, 17,  -5, -17 ],
	[  9, 29,  -9, -29 ],
	[ 13, 42, -13, -42 ],
	[ 18, 60, -18, -60 ],
	[ 24, 80, -24, -80 ],
	[ 33,106, -33,-106 ],
	[ 47,183, -47,-183 ],
];

/**
 * Decompresses an ETC1 image
 * @param {ByteBuffer} input - Compressed image
 * @param {number} width - width of image
 * @param {number} height - height of image
 */
function decompressETC1(input, width, height) {
	return decompress(input, width, height, false);
}

/**
 * Decompresses an ETC1 image
 * @param {ByteBuffer} input - Compressed image
 * @param {number} width - width of image
 * @param {number} height - height of image
 */
function decompressETC1A4(input, width, height) {
	return decompress(input, width, height, true);
}

function decompress(input, width, height, alpha) {
	let out = new Uint8Array(width * height * 4);
	if (!(input instanceof BufferedReader)) {
		input = new BufferedReader(input);
	}
	for (let ty = 0; ty < height; ty += 8) {
		for (let tx = 0; tx < width; tx += 8) {
			for (let t = 0; t < 4; t++) {
				let alphaBlockL = 0xFFFFFFFF, alphaBlockH = 0xFFFFFFFF;
				if (alpha) {
					alphaBlockL = input.readUint32();
					alphaBlockH = input.readUint32();
				}
				let colorBlockL = input.readRGBA(), colorBlockH = input.readRGBA();
				let tile = parseETCTile(colorBlockL, colorBlockH);
				let tileOff = 0;
				for (let py = YT[t]; py < 4 + YT[t]; py++) {
					for (let px = XT[t]; px < 4 + XT[t]; px++) {
						let ooffs = ((height - 1 - (ty+py)) * width + tx + px) * 4;
						out[ooffs + 0] = tile[tileOff + 0];
						out[ooffs + 1] = tile[tileOff + 1];
						out[ooffs + 2] = tile[tileOff + 2];
						
						let alphaShift = ((px & 3) * 4 + (py & 3)) << 2;
						let a = (alphaShift < 32)
							? (alphaBlockL >> (alphaShift- 0))
							: (alphaBlockH >> (alphaShift-32));
						a = a & 0xF;
						out[ooffs + 3] = (a << 4) | a;
						
						tileOff += 4;
					}
				}
			}
		}
	}
	return out;
}

function parseETCTile(blockL, blockH) {
	let flip = !!(blockH & 0x01000000);
	let diff = !!(blockH & 0x02000000);
	
	let r1, g1, b1, r2, g2, b2;
	if (diff) {
		b1 = (blockH & 0x0000F8) >> 0;
		g1 = (blockH & 0x00F800) >> 8;
		r1 = (blockH & 0xF80000) >> 16;
		
		b2 = (b1 >> 3) + ((blockH * 0x000007) <<  5) >> 5;
		g2 = (g1 >> 3) + ((blockH * 0x000700) >>  3) >> 5;
		r2 = (r1 >> 3) + ((blockH * 0x070000) >> 11) >> 5;
		
		b1 |= b1 >> 5;
		g1 |= g1 >> 5;
		r1 |= r1 >> 5;
		
		b2 = (b2 << 3) | (b2 >> 2);
		g2 = (g2 << 3) | (g2 >> 2);
		r2 = (r2 << 3) | (r2 >> 2);
	} else {
		b1 = (blockH & 0x0000F0) >> 0;
		g1 = (blockH & 0x00F000) >> 8;
		r1 = (blockH & 0xF00000) >> 16;
		
		b2 = (blockH & 0x00000F) << 4;
		g2 = (blockH & 0x000F00) >> 4;
		r2 = (blockH & 0x0F0000) >> 12;
		
		b1 |= b1 >> 4;
		g1 |= g1 >> 4;
		r1 |= r1 >> 4;
		
		b2 |= b2 >> 4;
		g2 |= g2 >> 4;
		r2 |= r2 >> 4;
	}
	let table1 = (blockH >> 29) & 7;
	let table2 = (blockH >> 26) & 7;
	let out = new Uint8Array(4*4*4);
	
	if (!flip) {
		for (let y = 0; y < 4; y++) {
			for (let x = 0; x < 2; x++) {
				let color1 = pixel(r1, g1, b1, x+0, y, blockL, table1);
				let color2 = pixel(r1, g1, b1, x+2, y, blockL, table2);
				
				let off1 = (y * 4 + x) * 4;
				out[off1+0] = color1.b;
				out[off1+1] = color1.g;
				out[off1+2] = color1.r;
				
				let off2 = (y * 4 + x + 2) * 4;
				out[off2+0] = color2.b;
				out[off2+1] = color2.g;
				out[off2+2] = color2.r;
			}
		}
	} else {
		for (let y = 0; y < 2; y++) {
			for (let x = 0; x < 4; x++) {
				let color1 = pixel(r1, g1, b1, x, y+0, blockL, table1);
				let color2 = pixel(r1, g1, b1, x, y+2, blockL, table2);
				
				let off1 = (y * 4 + x) * 4;
				out[off1+0] = color1.b;
				out[off1+1] = color1.g;
				out[off1+2] = color1.r;
				
				let off2 = ((y+2) * 4 + x) * 4;
				out[off2+0] = color2.b;
				out[off2+1] = color2.g;
				out[off2+2] = color2.r;
			}
		}
	}
	return out;
}

function pixel(r, g, b, x, y, block, table) {
	let index = x * 4 + y;
	let msb = block << 1;
	let pixel = (index < 8)
		? ETC1LUT[table][((block >> (index + 24)) & 1) + ((msb >> (index + 8)) & 2)]
		: ETC1LUT[table][((block >> (index +  8)) & 1) + ((msb >> (index - 8)) & 2)];
	
	r = clamp(r + pixel);
	g = clamp(g + pixel);
	b = clamp(b + pixel);
	
	return { r, g, b };
}

function clamp(x) {
	return Math.min(255, Math.max(0, x));
}

module.exports = { decompressETC1, decompressETC1A4 }
