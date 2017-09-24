// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Shader/GFShader.cs

class GFShader {
	/** @param data BufferedReader */
	constructor(data) {
		this.name = '';
		this.texEnvStages = new Array(6);
		this.texEnvBufferColor = null;
		this.vtxShader = null;
		this.geoShader = null;
		this.executable = [];
		this.swizzles = [];
		
		this.vtxShaderUniforms = [];
		this.geoShaderUniforms = [];
		
		if (!data) return;
	}
	
	get hasVertexShader() {
		return this.vtxShader != null;
	}
}
Object.defineProperties(GFShader, {
	'MAGIC_NUMBER': { value:0x00000000, },
});

module.exports = { GFShader };