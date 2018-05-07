// ShaderBinary.js
// https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Shader/ShaderBinary.cs

class ShaderBinary {
	constructor(data) {
		/** @type {uint[]} */
		this.executable = [];
		/** @type {ulong[]} */
		this.swizzles = [];
		/** @type {List<ShaderProgram>} */
		this.programs = [];
		
		if (!data) return;
		throw new Error('Not yet implemented!');
		//TODO https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Shader/ShaderBinary.cs#L25
	}
	
	
}
module.exports = { ShaderBinary };