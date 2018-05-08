// ShaderProgram.js
// https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Shader/ShaderProgram.cs

const { ShaderUniformBool, ShaderUniformVec4 } = require('./ShaderUniform');

function initArray(clazz, len, baseName) {
	let arr = new Array(len);
	for (let i = 0; i < len; i++) {
		arr[i] = new clazz({ name:`${baseName}_${i}` });
	}
	return arr;
}

class ShaderProgram {
	constructor() {
		this.boolUniforms = initArray(ShaderUniformBool, 16, 'uniform_bool');
		this.vec4Uniforms = initArray(ShaderUniformVec4, 96, 'uniform_float');
		this.ivec4Uniforms = initArray(ShaderUniformVec4, 4, 'uniform_int');
		
		this.inputRegs = new Array(16); /** @type {string} */
		this.outputRegs = new Array(16); /** @type {ShaderOutputReg} */
		this.labels = []; /** @type {List<ShaderLabel>} */
		
		for (let i = 0; i < this.inputRegs.length; i++) {
			this.inputRegs[i] = `input_attrb_${i}`;
		}
		
		this.isGeometryShader = false; /** @type {bool} */
		this.mainOffset = 0; /** @type {uint} */
		this.endMainOffset = 0; /** @type {uint} */
	}
	
	/**
	 * Gets the given uniform with the type.
	 * @param {int} reg - Register
	 * @param {int} type - Type
	 */
	getUniform(reg, type) {
		switch(type) {
			case 0: return this.boolUniforms[reg];
			case 1: return this.ivec4Uniforms[reg];
			case 2: return this.vec4Uniforms[reg];
			default: throw new RangeError('Argument out of range: type='+type);
		}
	}
	
	/**
	 * Gets the given uniform.
	 * @param {int} reg - Register
	 */
	getUniform(reg) {
		if (reg < 0x70) return this.vec4Uniforms[reg-0x10];
		if (reg < 0x74) return this.ivec4Uniforms[reg-0x70];
		if (reg >= 0x78 && reg < 0x88) return this.boolUniforms[reg-0x78];
		throw new RangeError('Argument out of range: '+reg);
	}
}
module.exports = { ShaderProgram };