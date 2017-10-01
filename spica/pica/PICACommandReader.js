
class PICACommand {
	constructor({ register, parameters=[], mask=0 }) {
		this.register = register;
		this.parameters = parameters;
		this.mask = mask;
	}
}

class UniformManager {
	constructor() {
		this.uniforms = new Array(96); // Vector4[96]
		this.usedUniforms = new Set();
		this.vectorF24 = null;
		this.uniformIndex = 0;
		this.uniform32Bits = false;
	}
	
	setIndexCommand(cmd) {
		this.uniformIndex = (cmd & 0xFF) << 2;
		this.uniform32Bits = (cmd >> 31) != 0;
	}
	
	setValueParameters(params) {
		if (Array.isArray(params)) throw new TypeError('setValueParameters requires array!');
		params.forEach((param)=>{
			let uidx = (this.uniformIndex >> 2) & 0x5F;
			
			if (!this.usedUniforms.has(uidx)) {
				this.usedUniforms.add(uidx);
			}
			
			if (this.uniform32Bits) {
				//TODO https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/PICACommandReader.cs#L52
			}
		});
	}
}

class PICACommandReader {
	get vtxShaderUniforms() { return this.vtxShader.uniforms; }
	get geoShaderUniforms() { return this.geoShader.uniforms; }
	
	constructor(cmds) {
		this.cmdIndex = 0;
		this.cmds = cmds;
		this.vtxShader = new UniformManager();
		this.geoShader = new UniformManager();
		
		let index = 0;
		while (index < cmds.length) {
			let parameter = cmds[index++];
			let command   = cmds[index++];
			
			let id          = (command >>  0) & 0xFFFF;
			let mask        = (command >> 16) & 0xF;
			let extraParams = (command >> 20) & 0x7FF;
			let consecutive = (command >> 31) != 0;
			
			if (consecutive) {
				for (let i = 0; i < extraParams + 1; i++) {
					let cmd = new PICACommand({
						register : id++,
						parameters : [ parameters ],
						mask : mask,
					});
					
					this.checkVtxUniformsCmd(cmd);
					this.checkGeoUniformsCmd(cmd);
					
					this.commands.add(cmd);
					if (i < extraParams) {
						parameters = cmds[index++];
					}
				}
			} else {
				//TODO https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/PICACommandReader.cs#L147
			}
		}
	}
	
	checkVtxUniformsCmd(cmd) {
		//TODO https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/PICACommandReader.cs#L172
		if (cmd.register == ) {
			this.vtxShader.setIndexCommand(cmd.parameters[0]);
		} else if (
			cmd.register >= &&
			cmd.register <=
		) {
			this.vtxShader.setValueParameters(cmd.parameters);
		}
	}
	
	//TODO https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/PICACommandReader.cs#L186
}
module.exports = { PICACommand, PICACommandReader };
