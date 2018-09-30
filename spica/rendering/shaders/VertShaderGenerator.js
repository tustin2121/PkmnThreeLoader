// https://github.com/gdkchan/SPICA/blob/6ffdfdc1ddf3b3614b9fda457ef9717194d6cf34/SPICA.Rendering/Shaders/VertexShaderGenerator.cs

const ShaderGenerator = require('./ShaderGenerator');

class VertShaderGenerator extends ShaderGenerator {
	/**
	 * @param {ShaderBinary} shBin -
	 */
	constructor(shBin) {
		super(shBin);
	}
	
	getVtxShader(programIndex=0) {
		/** @type {ShaderProgram} */
		let program = this.shBin.programs[programIndex];
		
		this.init(program);
		
		let out = [];
		out.push(`// SPICA auto-generated code`);
		out.push(`// This code was translated from a MAESTRO Vertex Shader`);
		out.push(`#version 330 core`);
		out.push('precision highp float;');
		out.push('precision highp int;');
		out.push('');
		
		out.push(...this.getVec4Uniforms(program.vec4Uniforms));
		out.push(...this.getIVec4Uniforms(program.ivec4Uniforms));
		out.push(...this.getBoolUniforms(program.boolUniforms));
		
		out.push('');
		out.push(`vec4 reg_temp[16];`);
		out.push(`bvec2 reg_cmp;`);
		out.push(`ivec2 reg_a0;`);
		out.push(`int reg_al;`);
		out.push('');
		
		for (let i = 0; i < program.inputRegs.length; i++) {
			let name = program.inputRegs[i];
			if (name) {
				name = `i_${i}_${this.getValidName(name)}`;
				this.inputNames[i] = name;
				out.push(`layout(location = ${i}) in vec4 ${name};`);
			}
		}
		out.push('');
		
		this.genOutputs(program.outputRegs, ''); //TODO HasGeoShader => '_' prefix
		
		// Now, we must generate functions. Each function could have functions it calls,
		// which must get defined before the function it is used in, so we effectively
		// append the procs backwards.
		/** @type {Array<string[]>} */
		let procs = [];
		while (this.procQueue.length > 0) {
			this.buffer = [''];
			this.genProc(program, this.procQueue.shift());
			procs.unshift(this.buffer);
			this.buffer = null;
		}
		for (let p of procs) {
			out.push(...p);
		}
		return out.join('\n');
	}
	
	/**
	 * 
	 * @param {ShaderProgram} program 
	 * @param {ProcInfo} proc - The procedure to generate.
	 */
	genProc(program, proc) {
		this.buffer.push(`void ${proc.name}() {`);
		this.indent = `\t`;
		
		this.genProcBody(program, proc);
		
		if (proc.name === 'main') {
			this.buffer.push(`${this.indent}gl_Position = ${this.outputNames[0]};`);
		}
		
		this.buffer.push(`}`);
		this.indent = '';
	}
}

module.exports = { VertShaderGenerator };
