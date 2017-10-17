// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Shader/GFShader.cs

const { PICACommand, PICACommandReader, PICARegister } = require('../../pica');
const { GFSection } = require('../GFSection');
const {
	PICATexEnvStage, PICATexEnvSource, PICATexEnvOperand, PICATexEnvCombiner, PICATexEnvScale,
} = require('../../pica/commands');
const {
	ShaderProgram, ShaderOutputReg, ShaderOutputRegName, ShaderLabel, ShaderOpCode,
} = require('../../pica/shader');

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
		
		while(cmdReader.hasCommand) {
			let cmd = cmdReader.getCommand();
			let param = cmd.parameters[0];
			let stage = (cmd.register >> 3) & 7;
			if (stage >= 6) stage -= 2;
			switch (cmd.register) {
				/* Shader */
				case PICARegister.GPUREG_SH_OUTMAP_O0: outmap[0] = param; break;
				case PICARegister.GPUREG_SH_OUTMAP_O1: outmap[1] = param; break;
				case PICARegister.GPUREG_SH_OUTMAP_O2: outmap[2] = param; break;
				case PICARegister.GPUREG_SH_OUTMAP_O3: outmap[3] = param; break;
				case PICARegister.GPUREG_SH_OUTMAP_O4: outmap[4] = param; break;
				case PICARegister.GPUREG_SH_OUTMAP_O5: outmap[5] = param; break;
				case PICARegister.GPUREG_SH_OUTMAP_O6: outmap[6] = param; break;
				
				/* Fragment Shader */
				case PICARegister.GPUREG_TEXENV0_SOURCE:
				case PICARegister.GPUREG_TEXENV1_SOURCE:
				case PICARegister.GPUREG_TEXENV2_SOURCE:
				case PICARegister.GPUREG_TEXENV3_SOURCE:
				case PICARegister.GPUREG_TEXENV4_SOURCE:
				case PICARegister.GPUREG_TEXENV5_SOURCE:
					this.texEnvStages[stage].source = new PICATexEnvSource(param);
					break;
				case PICARegister.GPUREG_TEXENV0_OPERAND:
				case PICARegister.GPUREG_TEXENV1_OPERAND:
				case PICARegister.GPUREG_TEXENV2_OPERAND:
				case PICARegister.GPUREG_TEXENV3_OPERAND:
				case PICARegister.GPUREG_TEXENV4_OPERAND:
				case PICARegister.GPUREG_TEXENV5_OPERAND:
					this.texEnvStages[stage].operand = new PICATexEnvOperand(param);
					break;
				case PICARegister.GPUREG_TEXENV0_COMBINER:
				case PICARegister.GPUREG_TEXENV1_COMBINER:
				case PICARegister.GPUREG_TEXENV2_COMBINER:
				case PICARegister.GPUREG_TEXENV3_COMBINER:
				case PICARegister.GPUREG_TEXENV4_COMBINER:
				case PICARegister.GPUREG_TEXENV5_COMBINER:
					this.texEnvStages[stage].combiner = new PICATexEnvCombiner(param);
					break;
				case PICARegister.GPUREG_TEXENV0_COLOR:
				case PICARegister.GPUREG_TEXENV1_COLOR:
				case PICARegister.GPUREG_TEXENV2_COLOR:
				case PICARegister.GPUREG_TEXENV3_COLOR:
				case PICARegister.GPUREG_TEXENV4_COLOR:
				case PICARegister.GPUREG_TEXENV5_COLOR:
					this.texEnvStages[stage].color = param;
					break;
				case PICARegister.GPUREG_TEXENV0_SCALE:
				case PICARegister.GPUREG_TEXENV1_SCALE:
				case PICARegister.GPUREG_TEXENV2_SCALE:
				case PICARegister.GPUREG_TEXENV3_SCALE:
				case PICARegister.GPUREG_TEXENV4_SCALE:
				case PICARegister.GPUREG_TEXENV5_SCALE:
					this.texEnvStages[stage].scale = new PICATexEnvScale(param);
					break;
				case PICARegister.GPUREG_TEXENV_UPDATE_BUFFER:
				 	PICATexEnvStage.setUpdateBuffer(this.texEnvStages, param);
					break;
				case PICARegister.GPUREG_TEXENV_BUFFER_COLOR:
					this.texEnvBufferColor = param;
					break;
				
				/* Geometry Shader */
				case PICARegister.GPUREG_GSH_ENTRYPOINT:
					if (!this.geoShader) this.geoShader = new ShaderProgram();
					this.geoShader.mainOffset = param & 0xFFFF;
					break;
				
				/* Vertex Shader */
				case PICARegister.GPUREG_VSH_CODETRANSFER_DATA0:
                case PICARegister.GPUREG_VSH_CODETRANSFER_DATA1:
                case PICARegister.GPUREG_VSH_CODETRANSFER_DATA2:
                case PICARegister.GPUREG_VSH_CODETRANSFER_DATA3:
                case PICARegister.GPUREG_VSH_CODETRANSFER_DATA4:
                case PICARegister.GPUREG_VSH_CODETRANSFER_DATA5:
                case PICARegister.GPUREG_VSH_CODETRANSFER_DATA6:
                case PICARegister.GPUREG_VSH_CODETRANSFER_DATA7:
					shaderExecutable.push(...cmd.parameters);
					break;
				case PICARegister.GPUREG_VSH_OPDESCS_DATA0:
                case PICARegister.GPUREG_VSH_OPDESCS_DATA1:
                case PICARegister.GPUREG_VSH_OPDESCS_DATA2:
                case PICARegister.GPUREG_VSH_OPDESCS_DATA3:
                case PICARegister.GPUREG_VSH_OPDESCS_DATA4:
                case PICARegister.GPUREG_VSH_OPDESCS_DATA5:
                case PICARegister.GPUREG_VSH_OPDESCS_DATA6:
                case PICARegister.GPUREG_VSH_OPDESCS_DATA7:
					shaderSwizzles.push(...cmd.parameters);
					break;
				case PICARegister.GPUREG_VSH_ENTRYPOINT:
					if (!this.vtxShader) this.vtxShader = new ShaderProgram();
					this.vtxShader.mainOffset = param & 0xFFFF;
					break;
			}
		}
		
		this.executable = shaderExecutable;
		this.swizzles = shaderSwizzles;
		
		for (let i = 0; i < outmap.length; i++) {
			if (outmap[i]===0) continue;
			let reg = new ShaderOutputReg();
			for (let j = 0; j < 4; j++) {
				let value = (outmap[i] >> (j * 8)) && 0x1F;
				if (value !== 0x1F) {
					reg.mask |= 0x1 << j;
					
					if (value < 0x04) reg.name = ShaderOutputRegName.Position;
					else if (value < 0x08) reg.name = ShaderOutputRegName.QuatNormal;
					else if (value < 0x0C) reg.name = ShaderOutputRegName.Color;
					else if (value < 0x0E) reg.name = ShaderOutputRegName.TexCoord0;
					else if (value < 0x10) reg.name = ShaderOutputRegName.TexCoord1;
					else if (value < 0x11) reg.name = ShaderOutputRegName.TexCoord0W;
					else if (value < 0x12) reg.name = ShaderOutputRegName.Generic;
					else if (value < 0x16) reg.name = ShaderOutputRegName.View;
					else if (value < 0x18) reg.name = ShaderOutputRegName.TexCoord2;
					else reg.name = ShaderOutputRegName.Generic;
				}
			}
			
			if (this.vtxShader) this.vtxShader.outputRegs[i] = reg;
			if (this.geoShader) this.geoShader.outputRegs[i] = reg;
		}
		let dsts = new Set();
		let lblId = 0;
		
		for (let i = 0; i < this.executable.length; i++) {
			let opCode = this.executable[i] >> 26; /** @type {ShaderOpCode} */
			
			switch (opCode) {
				case ShaderOpCode.Call:
				case ShaderOpCode.CallC:
				case ShaderOpCode.CallU:
				case ShaderOpCode.JmpC:
				case ShaderOpCode.JmpU: {
					let dst = (this.executable[i] >> 10) & 0xFFF;
					if (!dsts.has(dst)) {
						dsts.add(dst);
						let name = 'label_'+`0000${dst.toString(16)}`.slice(-4);
						let label = new ShaderLabel({
							id: lblId++,
							offset: dst,
							length: 0,
							name,
						});
						if (!this.vtxShader) this.vtxShader.labels.push(label);
						if (!this.geoShader) this.geoShader.labels.push(label);
					}
				} break;
			}
		}
		
		if (this.vtxShader) {
			makeArray(this.vtxShader.vec4Uniforms, 'v_c');
			findProgramEnd(this.vtxShader, this.executable);
			this.vtxShaderUniforms = cmdReader.getAllVertexShaderUniforms();
		}
		if (this.geoShader) {
			makeArray(this.geoShader.vec4Uniforms, 'g_c');
			findProgramEnd(this.geoShader, this.executable);
			this.geoShaderUniforms = cmdReader.getAllGeometryShaderUniforms();
		}
	}
	
	get hasVertexShader() {
		return this.vtxShader != null;
	}
	
	toShaderBinary() {
		let out = new ShaderBinary();
		out.executable = this.executable;
		out.swizzles = this.swizzles;
		if (this.vtxShader) out.programs.push(this.vtxShader);
		if (this.geoShader) out.programs.push(this.geoShader);
		return out;
	}
}
Object.defineProperties(GFShader, {
	'MAGIC_NUMBER': { value:0x00000000, },
});

function makeArray(uniforms, name) {
	//This is necessary because it's almost impossible to know what
    //is supposed to be an array without the SHBin information.
    //So we just make the entire thing an array to allow indexing.
	if (!uniforms) return;
	for (let i = 0; i < uniforms.length; i++) {
		uniforms[i].name = name;
		uniforms[i].isArray = true;
		uniforms[i].arrayIndex = i;
		uniforms[i].arrayLength = uniforms.length;
	}
}

function findProgramEnd(program, executable) {
	if (!program) return;
	for (let i = program.mainOffset; i < executable.length; i++) {
		if ((executable[i] >> 26) === ShaderOpCode.End)
		{
			program.endMainOffset = i;
			break;
		}
	}
}

module.exports = { GFShader };