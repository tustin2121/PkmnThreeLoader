// https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/PICACommandReader.cs

const { Vector4 } = require('./commands/PICAVectorFloat24');
const { PICARegister } = require('./PICARegister');

function toFloat(val) {
	let buf = Buffer.alloc(4);
	buf.writeUInt32LE(val, 0);
	return buf.readFloatLE(0);
}

class PICACommand {
	constructor({ register, parameters=[], mask=0 }) {
		this.register = register;
		this.parameters = parameters;
		this.mask = mask;
	}
	
	toString() {
		return `PICACommand[${PICARegister.reverse[this.register]}] { ${this.register.toString(16)} }`;
	}
}

class UniformManager {
	constructor() {
		this.uniforms = new Array(96); /** @type {Vector4[]} */
		for (let i = 0; i < this.uniforms.length; i++) this.uniforms[i] = new Vector4();
		this.usedUniforms = new Set(); /** @type {HashSet<uint>} */
		// this.vectorF24 = null; /** @type {PICAVectorFloat24} */
		this.uniformIndex = 0;
		this.uniform32Bits = false;
	}
	setIndexCommand(cmd) {
		this.uniformIndex = (cmd & 0xFF) << 2;
		this.uniform32Bits = (cmd >> 31) !== 0;
	}
	setValueParameters(params) {
		let words = [];
		for (let param of params) {
			let uidx = (this.uniformIndex >> 2) & 0x5F;
			this.usedUniforms.add(uidx);
			// this.uniforms[uidx] = this.uniforms[uidx] || new Vector4();
			
			if (this.uniform32Bits) {
				let val = toFloat(param);
				switch (this.uniformIndex & 3) {
					case 0: this.uniforms[uidx].w = val; break;
					case 1: this.uniforms[uidx].z = val; break;
					case 2: this.uniforms[uidx].y = val; break;
					case 3: this.uniforms[uidx].x = val; break;
				}
			} else {
				switch(this.uniformIndex & 3) {
					case 0: words[0] = param; break;
					case 1: words[1] = param; break;
					case 2: words[2] = param; break;
				}
				if ((this.uniformIndex & 3) == 2) {
					//The Float 24 Vector only uses 3 Words (24 * 4 = 96 bits = 3 Words)
                    //for all four elements (X/Y/Z/W), so we ignore the fourth Word here
					this.uniformIndex++;
					this.uniforms[uidx].setFrom24Bits(...words);
				}
			}
			this.uniformIndex++;
		}
	}
	getAllUsedUniforms() {
		let out = {};
		for (let uidx of this.usedUniforms) {
			out[uidx] = this.uniforms[uidx];
		}
		return out;
	}
}

class PICACommandReader {
	/**
	 * @param {uint[]} cmds
	 */
	constructor(cmds) {
		if (!cmds) throw new ReferenceError('Must pass parameter cmds!');
		this.cmdIndex = 0;
		this.commands = []; /** @type {List<PICACommand>} */
		this.vtxShader = new UniformManager();
		this.geoShader = new UniformManager();
		
		let index = 0;
		while (index < cmds.length) {
			let parameter	= cmds[index++];
			let command		= cmds[index++];
			
			let id 			= (command >>  0) & 0xFFFF;
			let mask		= (command >> 16) & 0xF;
			let extraParams	= (command >> 20) & 0x7FF;
			let consecutive = (command >> 31) !== 0;
			
			if (consecutive) {
				for (let i = 0; i < extraParams + 1; i++) {
					let cmd = new PICACommand({
						register: id++,
						parameters: [ parameter ],
						mask,
					});
					this._checkVtxUniformsCmd(cmd);
					this._checkGeoUniformsCmd(cmd);
					this.commands.push(cmd);
					if (i < extraParams) {
						parameter = cmds[index++];
					}
				}
			} else {
				let parameters = [ parameter ];
				for (let i = 0; i < extraParams; i++) {
					parameters.push(cmds[index++]);
				}
				let cmd = new PICACommand({
					register: id,
					parameters: parameters,
					mask,
				});
				this._checkVtxUniformsCmd(cmd);
				this._checkGeoUniformsCmd(cmd);
				this.commands.push(cmd);
			}
			
			//Commands must be padded in 8 bytes blocks, so Index can't be even!
			if ((index & 1) !== 0) index++;
		}
	}
	
	get vtxShaderUniforms() { return this.vtxShader.uniforms; }
	get geoShaderUniforms() { return this.geoShader.uniforms; }
	
	_checkVtxUniformsCmd(cmd) {
		if (cmd.register === PICARegister.GPUREG_VSH_FLOATUNIFORM_INDEX) {
			this.vtxShader.setIndexCommand(cmd.parameters[0]);
		}
		else if (cmd.register >= PICARegister.GPUREG_VSH_FLOATUNIFORM_DATA0 &&
				 cmd.register <= PICARegister.GPUREG_VSH_FLOATUNIFORM_DATA7)
		{
			this.vtxShader.setValueParameters(cmd.parameters);
		}
	}
	_checkGeoUniformsCmd(cmd) {
		if (cmd.register === PICARegister.GPUREG_GSH_FLOATUNIFORM_INDEX) {
			this.geoShader.setIndexCommand(cmd.parameters[0]);
		}
		else if (cmd.register >= PICARegister.GPUREG_GSH_FLOATUNIFORM_DATA0 &&
				 cmd.register <= PICARegister.GPUREG_GSH_FLOATUNIFORM_DATA7)
		{
			this.geoShader.setValueParameters(cmd.parameters);
		}
	}
	
	get hasCommand() { return this.cmdIndex < this.commands.length; }
	
	getCommand() { return this.commands[this.cmdIndex++]; }
	getCommands() { return this.commands.slice(); }
	
	getAllVertexShaderUniforms()   { return this.vtxShader.getAllUsedUniforms(); }
	getAllGeometryShaderUniforms() { return this.geoShader.getAllUsedUniforms(); }
}

module.exports = { PICACommand, PICACommandReader };
