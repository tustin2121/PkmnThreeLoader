// https://github.com/gdkchan/SPICA/blob/master/SPICA.Rendering/Shaders/ShaderGenerator.cs

const { 
	ShaderOpCode, ShaderOutputReg, ShaderOutputRegName,
} = require('../../pica/shader');

const GEN_INST = [];

/** 
 * @typedef {Object} ProcInfo
 * @property {string} name - Name of the procedure
 * @property {uint} offset - Starting offset of the procedure
 * @property {uint} length - Total length of the procedure
 */


class ShaderGenerator {
	/**
	 * @param {ShaderBinary} shBin -
	 */
	constructor(shBin) {
		/** @type {Queue<ProcInfo>} - A queue of procedures to be built. */
		this.procQueue = null;
		/** @type {Set<string>} */
		this.procTable = null;
		/** @type {Map<uint, string>} */
		this.labels = null;
		/** @type {ShaderBinary} */
		this.shBin = shBin;
		
		/** @type {string[]} - The proc currently being built. */
		this.buffer = null;
		/** @type {string} - The current indent level for the proc being built. */
		this.indent = '';
		/** @type {uint} - Instruction Pointer, to currently being generated instruction. */
		this.ip = 0;
		
		this.vec4UniformNames = new Array(96);
		this.vec4UniformNamesNoIdx = new Array(96);
		this.ivec4UniformNames = new Array(4);
		this.boolUniformNames = new Array(16);
		this.inputNames = new Array(16);
		this.outputNames = new Array(16);
		
		
	}
	
	/**
	 * @param {ShaderProgram} program -
	 */
	init(program) {
		this.procQueue = [];
		this.procTable = new Set();
		this.labels = new Map();
		
		this.procQueue.push({
			name: 'main',
			off: program.mainOffset,
			len: program.endMainOffset - program.mainOffset,
		});
		
		for (let lbl of program.labels) {
			if (lbl.name === 'endmain') continue;
			this.labels.set(lbl.offset, lbl.name);
		}
	}
	
	
	
	/////////////////////////////////////////////////////////////////////
	
	/**
	 * @param {ShaderProgram} program -
	 * @param {uint} reg - register
	 */
	getDstRegister(program, reg) {
		if (reg < 0x10) return this.outputNames[reg];
		if (reg < 0x20) return `reg_temp[${reg-0x10}]`;
		throw new ReferenceError(`Invalid register index ${reg}!`);
	}
	
	/**
	 * @param {ShaderProgram} program -
	 * @param {uint} reg - register
	 * @param {uint} idx
	 */
	getSrcRegister(program, reg, idx=0) {
		if (reg < 0x10) return this.inputNames[reg];
			if (reg < 0x20) return `reg_temp[${reg-0x10}]`;
		if (reg >= 0x80) throw new ReferenceError(`Invalid register index ${reg}!`);

		/** @type {ShaderUniformVec4} */
		let uniform = program.vec4Uniforms[reg-0x20];
		let name = this.vec4UniformNames[reg-0x20];
		if (uniform.isConstant) {
			const { x, y, z, w } = uniform.constant;
			return `vec4(${x}, ${y}, ${z}, ${w})`;
		}
		else if (uniform.isArray && idx > 0) {
			// Min protects against illegal accesses (can cause glitches on some GPUs). --gdkchan
			name = this.vec4UniformNamesNoIdx[reg-0x20];
			let max = uniform.arrayLength - 1;
			switch (idx) {
				case 1: return `${name}[min(${uniform.arrayIndex} + reg_a0.x, ${max})]`;
				case 2: return `${name}[min(${uniform.arrayIndex} + reg_a0.y, ${max})]`;
				case 3: return `${name}[min(${uniform.arrayIndex} + reg_al, ${max})]`;
			}
		}
		return name;
	}
	
	/**
	 * @param {ShaderProgram} program -
	 * @param {uint} inst - instruction
	 */
	parseInstructionType1(program, inst) {
		let info = {
			inst: (inst >> 26),
			dest: (inst >> 21) & 0x1F,
			idx1: (inst >> 19) & 0x03,
			src1: (inst >> 12) & 0x7F,
			src2: (inst >>  7) & 0x1F,
			desc: (inst >>  0) & 0x7F,
		};
		info.destStr = this.getDstRegister(program, info.dest);
		info.src1Str = this.getSrcRegister(program, info.src1, info.idx1);
		info.src2Str = this.getSrcRegister(program, info.src2);
		
		return info;
	}
	
	/**
	 * @param {string} name 
	 */
	getValidName(name) {
		return name.replace(/[^a-zA-Z0-9_]/ig, '');
	}
	
	/**
	 * 
	 * @param {ShaderOutputReg[]} regs 
	 * @param {string} prefix 
	 * @returns {string[]}
	 */
	genOutputs(regs, prefix='') {
		let out = [];
		for (let i = 0; i < regs.length; i++) {
			let reg = regs[i];
			if (reg.mask) {
				if (reg.name === ShaderOutputRegName.TexCoord0W) {
					reg.name = ShaderOutputRegName.TexCoord0;
				}
				
				this.outputNames[i] = `${prefix}${red.nameStr}`;
				
				// Shaders can have more than one generic output.
				// In this case, we need to add a suffix to avoid name collision.
				if (reg.name === ShaderOutputRegName.Generic) {
					this.outputNames[i] += '_' + i;
				}
				out.push(`out vec4 ${this.outputNames[i]};`);
			}
		}
		return out;
	}
	
	/**
	 * 
	 * @param {ShaderProgram} program 
	 * @param {ProcInfo} proc 
	 */
	genProcBody(program, proc) {
		for (this.ip = proc.offset; this.ip < proc.offset + proc.length; this.ip++) {
			// Split procedure if a label is found at the current address.
			// This is done to support Jump instructions.
			if (this.ip > proc.offset && !!this.labels[this.ip]) {
				let name = this.labels[this.ip];
				this.addProc(name, this.ip, (proc.offset + proc.length) - this.ip);
				this.buffer.push(`\t${name}();`);
				break;
			}
			this.genInst(program, this.shBin.executable[this.ip]);
		}
	}
	
	addProc() {
		//TODO!
	}
	
	/**
	 * 
	 * @param {ShaderProgram} program 
	 * @param {uint} inst - Instruction to generate
	 */
	genInst(program, inst) {
		GEN_INST[inst >> 26].call(this, program, inst);
	}
}

module.exports = ShaderGenerator;

// Instructions Code Generation methods

GEN_INST[ShaderOpCode.Add] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.DP3] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.DP4] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.DPH] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Dst] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Ex2] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Lg2] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.LitP] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Mul] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.SGE] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.SLT] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Flr] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Max] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Min] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Rcp] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.RSq] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.MovA] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Mov] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.DPHI] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.DstI] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.SGEI] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.SLTI] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Break] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.NOp] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.End] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.BreakC] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Call] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.CallC] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.CallU] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.IfU] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.IfC] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Loop] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Emit] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.SetEmit] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.JmpC] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.JmpU] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.Cmp] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.MAdI] = function(program, inst, {}={}) {
	
};
GEN_INST[ShaderOpCode.MAd] = function(program, inst, {}={}) {
	
};









GEN_INST[ShaderOpCode.Add] =
GEN_INST[ShaderOpCode.DP3] =
GEN_INST[ShaderOpCode.DP4] =
GEN_INST[ShaderOpCode.DPH] =
GEN_INST[ShaderOpCode.Dst] =
GEN_INST[ShaderOpCode.Ex2] =
GEN_INST[ShaderOpCode.Lg2] =
GEN_INST[ShaderOpCode.Mul] =
GEN_INST[ShaderOpCode.SGE] =
GEN_INST[ShaderOpCode.SLT] =
GEN_INST[ShaderOpCode.Max] =
GEN_INST[ShaderOpCode.Min] =
/**
 * @param {ShaderProgram} program
 * @param {uint} instOp
 */
function(program, instOp) {
	let opCode = instOp >> 26;
	//TODO
}
