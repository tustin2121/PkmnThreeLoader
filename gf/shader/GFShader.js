// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Shader/GFShader.cs

const { PICACommandReader } = require('../../pica/PICACommandReader');

class GFShader {
	/** @param data BufferedReader */
	constructor(data) {
		/** @type {string} */
		this.name = '';
		/** @type {PICATexEnvStage[]} */
		this.texEnvStages = new Array(6);
		/** @type {RGBA} */
		this.texEnvBufferColor = null;
		/** @type {ShaderProgram} */
		this.vtxShader = null;
		/** @type {ShaderProgram} */
		this.geoShader = null;
		/** @type {uint[]} */
		this.executable = [];
		/** @type {ulong[]} */
		this.swizzles = [];
		
		/** @type {Dictionary<uint, Vector4>} */
		this.vtxShaderUniforms = [];
		/** @type {Dictionary<uint, Vector4>} */
		this.geoShaderUniforms = [];
		
		for (let i = 0; i < 6; i++) {
			this.texEnvStages[i] = new PICATexEnvStage();
		}
		
		if (!data) return;
		
		let magicNum = data.readUint32();
		let shaderCount = data.readUint32();
		
		data.skipPadding();
		let shaderSection = new GFSection(data);
		
		this.name = data.readPaddedString(0x40);
		let hash = data.readUint32();
		let count = data.readUint32();
		
		data.skipPadding(0x40);
		
		let cmdsLen = data.readUint32();
		let cmdsCount = data.readUint32();
		let cmdsHash = data.readUint32();
		data.skip(4);
		
		let fileName = data.readPaddedString(0x40);
		let cmds = new Uint32Array(cmdsLen >> 2);
		for (let i = 0; i < cmds.length; i++) {
			cmds[i] = data.readUint32();
		}
		
		let outmap = new Uint32Array(7);
		let shaderExecutable = []; /** @type {List<uint>} */
		let shaderSwizzles = []; /** @type {List<ulong>} */
		
		let cmdReader = new PICACommandReader(cmds);
	}
	
	get hasVertexShader() {
		return this.vtxShader != null;
	}
}
Object.defineProperties(GFShader, {
	'MAGIC_NUMBER': { value:0x00000000, },
});

module.exports = { GFShader };