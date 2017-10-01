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
}
module.exports = { ShaderProgram };