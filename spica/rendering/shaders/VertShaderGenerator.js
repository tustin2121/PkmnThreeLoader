// https://github.com/gdkchan/SPICA/blob/6ffdfdc1ddf3b3614b9fda457ef9717194d6cf34/SPICA.Rendering/Shaders/VertexShaderGenerator.cs

const ShaderGenerator = require('./ShaderGenerator');

class VertShaderGenerator extends ShaderGenerator {
	/**
	 * @param {ShaderBinary} shBin -
	 */
	constructor(shBin) {
		super(shBin);
	}
	
	getVtxShader(programIndex, hasGeoShader) {
		let program = this.shBin.programs[programIndex];
	}
}



