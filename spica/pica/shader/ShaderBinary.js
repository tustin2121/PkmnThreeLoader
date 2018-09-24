// ShaderBinary.js
// https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Shader/ShaderBinary.cs

const { Vector4, getFloat24 } = require('../commands/PICAVectorFloat24');
const { ShaderProgram } = require('./ShaderProgram');
const { ShaderUniform } = require('./ShaderUniform');
const { ShaderOutputReg } = require('./ShaderOutput');


/**
 * 
 * @param {ShaderProgram} prog 
 * @param {int} reg 
 * @param {int} type 
 * @returns {ShaderUniform}
 */
function getUniform(prog, reg, type) {
	if (type) {
		switch (type) {
			case 0: return prog.boolUniforms[reg];
			case 1: return prog.ivec4Uniforms[reg];
			case 2: return prog.vec4Uniforms[reg];
		}
		throw new ReferenceError('Argument out of range: '+type);
	}
	if (reg < 0x70) {
		return prog.vec4Uniforms[reg - 0x10];
	} else if (reg < 0x74) {
		return prog.ivec4Uniforms[reg - 0x70];
	} else if (reg >= 0x78 & reg < 0x88) {
		return prog.boolUniforms[reg - 0x78];
	} else {
		throw new ReferenceError('Argument out of range: '+reg);
	}
}

function readIVec4(data) {
	return new Vector4(data.readUint8(), data.readUint8(), data.readUint8(), data.readUint8());
}
function readVec4(data) {
	return new Vector4(
		getFloat24(data.readUint32()),
		getFloat24(data.readUint32()),
		getFloat24(data.readUint32()),
		getFloat24(data.readUint32()),
	);
}

class ShaderBinary {
	/**
	 * 
	 * @param {BufferedReader} data 
	 */
	constructor(data) {
		/** @type {uint[]} */
		this.executable = [];
		/** @type {ulong[]} */
		this.swizzles = [];
		/** @type {List<ShaderProgram>} */
		this.programs = [];
		
		if (!data) return;
		let _oldPos = data.offset;
		
		let dvlbMagicNumber = data.readUint32();
		let dvleCount = data.readUint32();
		data.offset = data.offset + dvleCount * 4; //these will be read later
		
		let dvlpPos = data.offset;
		
		let dvlpMagicNumber = data.readUint32();
		let dvlpVersion = data.readUint16();
		let shaderType = data.readUint8();
		let outRegsInfo = data.readUint8();
		let shaderBinAddress = data.readUint32() + dvlpPos;
		let shaderBinCount = data.readUint32();
		let swizzlesAddr = data.readUint32() + dvlpPos;
		let swizzlesCount = data.readUint32();
		let fileNamePtrsAddr = data.readUint32() + dvlpPos;
		
		for (let i = 0; i < dvleCount; i++) {
			let prog = new ShaderProgram();
			this.programs.push(prog);
			
			data.offset = data.readUint32(8 + (i * 4));
			let dvlePos = data.offset;
			
			let dvleMagic = data.readUint32();
			let dvleVersion = data.readUint16();
			let isGeoShader = data.readUint8();
			let debugFlags = data.readUint8();
			let exeStartOff = data.readUint32();
			let exeEndOff = data.readUint32();
			let inputMask = data.readUint16();
			let outputMask = data.readUint16();
			let geoShaderType = data.readUint8();
			let geoShaderIdx = data.readUint8();
			let geoSubDivSize = data.readUint8();
			let geoVertexCount = data.readUint8();
			let constTblOff = data.readUint32() + dvlePos;
			let constTblCount = data.readUint32();
			let labelTblOff = data.readUint32() + dvlePos;
			let labelTblCount = data.readUint32();
			let outRegTblOff = data.readUint32() + dvlePos;
			let outRegTblCount = data.readUint32();
			let uniformTblOff = data.readUint32() + dvlePos;
			let uniformTblCount = data.readUint32();
			let stringTblOff = data.readUint32() + dvlePos;
			let stringTblCount = data.readUint32();
			
			prog.isGeometryShader = !!isGeoShader;
			prog.mainOffset = exeStartOff;
			prog.endMainOffset = exeEndOff;
			
			for (let ci = 0; ci < constTblCount; ci++) {
				data.offset = constTblOff + (ci * 0x14);
				let type = data.readUint16();
				let reg = data.readUint16();
				
				/** @type {ShaderUniform} */
				let uniform = getUniform(prog, reg, type);
				uniform.isConstant = true;
				switch (type) {
					case 0: //boolean
						uniform.constant = data.readUint8();
						break;
					case 0: //int vector4
						uniform.constant = readIVec4(data);
						break;
					case 0: //float vector4
						uniform.constant = readVec4(data);
						break;
				}
			}
			for (let li = 0; li < labelTblCount; li++) {
				data.offset = labelTblOff + (li * 0x10);
				let id = data.readUint32();
				let off = data.readUint32();
				let len = data.readUint32();
				
				data.offset = stringTblOff + data.readUint32();
				let name = data.readNullTerminatedString();
				prog.labels.push({ id, off, len, name });
			}
			for (let oi = 0; oi < outRegTblCount; oi++) {
				data.offset = outRegTblOff + (oi * 0x08);
				let valL = data.readUint32();
				let valH = data.readUint32();
				
				let regid = (valL >> 16) & 0xF;
				prog.outputRegs[regid] = new ShaderOutputReg({
					name : (valL & 0xF),
					mask : valH & 0xF,
				});
			}
			for (let ui = 0; ui < uniformTblCount; ui++) {
				data.offset = uniformTblOff + (ui + 0x08);
				let nameoff = data.readInt32();
				let startReg = data.readUint16();
				let endReg = data.readUint16();
				
				data.offset = stringTblOff + nameoff;
				let name = data.readNullTerminatedString();
				for (let r = startReg; r <= endReg; r++) {
					if (r < 0x10) {
						prog.inputRegs[r] = name;
					} else {
						let uniform = getUniform(prog, r);
						if (uniform) {
							uniform.name = name;
							uniform.isArray = endReg !== startReg;
							uniform.arrayIndex = r - startReg;
							uniform.arrayLength = (endReg - startReg) + 1;
						}
					}
				}
			}
		}
		
		data.offset = shaderBinAddress;
		for (let i = 0; i < shaderBinCount; i++) {
			this.executable[i] = data.readUint32();
		}
		data.offset = swizzlesAddr;
		for (let i = 0; i < swizzlesCount; i++) {
			this.swizzles[i] = [data.readInt32(), data.readInt32()];
		}
	}
	
	getSwizzles(descIdx) {
		let sDst = null;
		let sSrc  = new Array(3);
		let sSrcM = new Array(3);
		let swizzle = this.swizzles[descIdx][0];
		
		sSrc[0] = this.getSwizzle(swizzle >>  5); //bits 6-14 
		sSrc[1] = this.getSwizzle(swizzle >> 14); //bits 15-23
		sSrc[2] = this.getSwizzle(swizzle >> 23); //bits 24-32
		
		let mask = swizzle & 0xF;
		
		sDst = this.maskSwizzle("xyzw", mask);
		
		sSrcM[0] = this.maskSwizzle(sSrc[0], mask);
		sSrcM[1] = this.maskSwizzle(sSrc[1], mask);
		sSrcM[2] = this.maskSwizzle(sSrc[2], mask);
		
		return { sDst, sSrc, sSrcM };
	}
	
	/**
	 * 
	 * @param {uint} descIdx 
	 * @param {boolean} hidePlus 
	 * @returns {string[]}
	 */
	getSrcSigns(descIdx, hidePlus=true) {
		let out = new Array(3);
		let swizzle = this.swizzles[descIdx][0];
		let plus = hidePlus?'':'+';
		out[0] = ((swizzle >>  4) & 1) != 0 ? '-':plus;
		out[1] = ((swizzle >> 13) & 1) != 0 ? '-':plus;
		out[2] = ((swizzle >> 22) & 1) != 0 ? '-':plus;
		return out;
	}
	
	/**
	 * 
	 * @param {string} swizzle 
	 * @param {uint} mask 
	 */
	maskSwizzle(swizzle, mask) {
		let out = '';
		if ((mask & 8) != 0) out += swizzle[0];
		if ((mask & 4) != 0) out += swizzle[1];
		if ((mask & 2) != 0) out += swizzle[2];
		if ((mask & 1) != 0) out += swizzle[3];
		return out;
	}
	
	getSwizzle(comps) {
		const COMPS = 'xyzw';
		let out = '';
		for (let i = 0; i < 8; i+=2) {
			out = COMPS[(comps>>i)&3] + out;
		}
		return out;
	}
}
module.exports = { ShaderBinary };