// https://github.com/gdkchan/SPICA/blob/master/SPICA.Rendering/Shaders/ShaderGenerator.cs

const { 
	ShaderOpCode, ShaderOutputReg, ShaderOutputRegName, ShaderBinary, ShaderProgram,
} = require('../../pica/shader');

const GEN_INST = [];
// Instruction Table (which is apparently not the same as ShaderOpCode)
const INST_TABLE = [
	ShaderOpCode.Add,
	ShaderOpCode.DP3,
	ShaderOpCode.DP4,
	ShaderOpCode.DPH,
	ShaderOpCode.Dst,
	ShaderOpCode.Ex2,
	ShaderOpCode.Lg2,
	ShaderOpCode.LitP,
	ShaderOpCode.Mul,
	ShaderOpCode.SGE,
	ShaderOpCode.SLT,
	ShaderOpCode.Flr,
	ShaderOpCode.Max,
	ShaderOpCode.Min,
	ShaderOpCode.Rcp,
	ShaderOpCode.RSq,
	-1, //Invalid?,
	-1, //Invalid?,
	ShaderOpCode.MovA,
	ShaderOpCode.Mov,
	-1, //Invalid?,
	-1, //Invalid?,
	-1, //Invalid?,
	-1, //Invalid?,
	ShaderOpCode.DPHI,
	ShaderOpCode.DstI,
	ShaderOpCode.SGEI,
	ShaderOpCode.SLTI,
	-1, //Invalid?,
	-1, //Invalid?,
	-1, //Invalid?,
	-1, //Invalid?,
	-1, //Invalid?,
	ShaderOpCode.NOp,
	ShaderOpCode.End,
	ShaderOpCode.BreakC,
	ShaderOpCode.Call,
	ShaderOpCode.CallC,
	ShaderOpCode.CallU,
	ShaderOpCode.IfU,
	ShaderOpCode.IfC,
	ShaderOpCode.Loop,
	ShaderOpCode.Emit,
	ShaderOpCode.SetEmit,
	ShaderOpCode.JmpC,
	ShaderOpCode.JmpU,
	ShaderOpCode.Cmp,
	ShaderOpCode.Cmp,
	ShaderOpCode.MAdI,
	ShaderOpCode.MAdI,
	ShaderOpCode.MAdI,
	ShaderOpCode.MAdI,
	ShaderOpCode.MAdI,
	ShaderOpCode.MAdI,
	ShaderOpCode.MAdI,
	ShaderOpCode.MAdI,
	ShaderOpCode.MAd,
	ShaderOpCode.MAd,
	ShaderOpCode.MAd,
	ShaderOpCode.MAd,
	ShaderOpCode.MAd,
	ShaderOpCode.MAd,
	ShaderOpCode.MAd,
	ShaderOpCode.MAd,
];

/** 
 * @typedef {Object} ProcInfo
 * @property {string} name - Name of the procedure
 * @property {uint} offset - Starting offset of the procedure
 * @property {uint} length - Total length of the procedure
 */

// Constants:
// BoolUniforms - Boolean Uniforms as a bitmap of flags
// reg_temp - Temporary register
// reg_a0 - A0 Register
// reg_al - AL Register
// reg_cmp - Comparison register


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
		
		this.procTable.add('main'); //not in original?
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
	
	append(str) {
		this.buffer.push(this.indent + str);
	}
	
	/////////////////////////////////////////////////////////////////////
	// Instruction Parameters
	
	/**
	 * @param {ShaderProgram} program - 
	 * @param {uint} instOp - Instruction Op
	 */
	getInst1Params(program, instOp) {
		let inst = { // ShaderInst1
			dest : (instOp >> 21) & 0x1F,
			idx1 : (instOp >> 19) & 0x03,
			src1 : (instOp >> 12) & 0x7F,
			src2 : (instOp >>  7) & 0x1F,
			desc : (instOp >>  0) & 0x7F,
		};
		let dest = this.getDstRegister(program, inst.dest);
		let src1 = this.getSrcRegister(program, inst.src1, inst.idx1);
		let src2 = this.getSrcRegister(program, inst.src2);
		let { sDst, sSrc, sSrcM } = this.shBin.getSwizzles(inst.desc);
		let signs = this.shBin.getSrcSigns(inst.desc);
		src1 = signs[0] + src1;
		src2 = signs[1] + src2;
		return { inst, dest, src1, src2, sDst, sSrc, sSrcM };
	}
	
	/**
	 * @param {ShaderProgram} program - 
	 * @param {uint} instOp - Instruction Op
	 */
	getInst1iParams(program, instOp) {
		let inst = { // ShaderInst1i
			dest : (instOp >> 21) & 0x1F,
			idx2 : (instOp >> 19) & 0x03,
			src1 : (instOp >> 14) & 0x1F,
			src2 : (instOp >>  7) & 0x7F,
			desc : (instOp >>  0) & 0x7F,
		};
		let dest = this.getDstRegister(program, inst.dest);
		let src1 = this.getSrcRegister(program, inst.src1);
		let src2 = this.getSrcRegister(program, inst.src2, inst.idx2);
		let { sDst, sSrc, sSrcM } = this.shBin.getSwizzles(inst.desc);
		let signs = this.shBin.getSrcSigns(inst.desc);
		src1 = signs[0] + src1;
		src2 = signs[1] + src2;
		return { inst, dest, src1, src2, sDst, sSrc, sSrcM };
	}
	
	/**
	 * @param {ShaderProgram} program - 
	 * @param {uint} instOp - Instruction Op
	 */
	getInst1cParams(program, instOp) {
		let inst = { // ShaderInst1c
			cmpX : (instOp >> 24) & 0x07,
			cmpY : (instOp >> 21) & 0x07,
			idx1 : (instOp >> 19) & 0x03,
			src1 : (instOp >> 12) & 0x7F,
			src2 : (instOp >>  7) & 0x1F,
			desc : (instOp >>  0) & 0x7F,
		};
		let { sDst, sSrc, sSrcM } = this.shBin.getSwizzles(inst.desc);
		let signs = this.shBin.getSrcSigns(inst.desc);
		let src1 = signs[0] + this.getSrcRegister(program, inst.src1, inst.idx1);
		let src2 = signs[1] +this.getSrcRegister(program, inst.src2);
		let cmpX = compare(`${src1}.${sSrc[0][0]}`, `${src2}.${sSrc[1][0]}`, inst.cmpX);
		let cmpY = compare(`${src1}.${sSrc[0][1]}`, `${src2}.${sSrc[1][1]}`, inst.cmpY);
		
		return { inst, cmpX, cmpY, src1, src2, sDst, sSrc, sSrcM };
	}
	
	// /**
	//  * @param {ShaderProgram} program - 
	//  * @param {uint} instOp - Instruction Op
	//  */
	// getInst1uParams(program, instOp) {
	// 	let inst = { // ShaderInst1 (there is no ShaderInst1u)
	// 		dest : (instOp >> 21) & 0x1F,
	// 		idx1 : (instOp >> 19) & 0x03,
	// 		src1 : (instOp >> 12) & 0x7F,
	// 		src2 : (instOp >>  7) & 0x1F,
	// 		desc : (instOp >>  0) & 0x7F,
	// 	};
	// 	let dest = this.getDstRegister(program, inst.dest);
	// 	let src1 = this.getSrcRegister(program, inst.src1, inst.idx1);
	// 	let { sDst, sSrc, sSrcM } = this.shBin.getSwizzles(inst.desc);
	// 	let signs = this.shBin.getSrcSigns(inst.desc);
	// 	src1 = signs[0] + src1;
	// 	return { inst, dest, src1, sDst, sSrc, sSrcM };
	// }
	
	/**
	 * @param {uint} instOp - Instruction Op
	 */
	getInst2Params(instOp) {
		let inst = { // ShaderInst2
			refX : !!((instOp >> 25) & 1),
			refY : !!((instOp >> 24) & 1),
			
			condOp : (instOp >> 22) & 0x03,
			dest   : (instOp >> 10) & 0xFFF,
			count  : (instOp >>  0) & 0xFF,
		};
		return inst;
	}
	
	/**
	 * @param {uint} instOp - Instruction Op
	 */
	getInst3Params(instOp) {
		let inst = { // ShaderInst2
			regId : (instOp >> 22) & 0xF,
			dest  : (instOp >> 10) & 0xFFF,
			count : (instOp >>  0) & 0xFF,
		};
		return inst;
	}
	
	/////////////////////////////////////////////////////////////////////
	// Code Block Generation
	
	/**
	 * Generates a line of shader code from a given instruction.
	 * @param {ShaderProgram} program 
	 * @param {uint} inst - Instruction to generate
	 */
	genInst(program, inst) {
		GEN_INST[inst >> 26].call(this, program, inst);
	}
	
	/**
	 * Generates the body of a procedure
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
			// Generate current instruction
			this.genInst(program, this.shBin.executable[this.ip]);
		}
	}
	
	/**
	 * Generates an if/else block
	 * @param {ShaderProgram} program 
	 * @param {string} cond - condition of if statement
	 * @param {uint} blockEnd - last command of if block
	 * @param {uint} elseCount - size of else block
	 */
	genIfBlock(program, cond, blockEnd, elseCount) {
		this.append(`if (${cond}) {`);
		let oldIndent = this.indent;
		this.indent += '\t';
		
		while (this.ip + 1 < blockEnd) {
			this.genInst(program, this.shBin.executable[++this.ip]);
		}
		
		if (elseCount > 0) {
			this.indent = oldIndent;
			this.append(`} else {`);
			this.indent += '\t';
			while(this.ip + 1 < blockEnd + elseCount) {
				this.genInst(program, this.shBin.executable[++this.ip]);
			}
		}
		
		this.indent = oldIndent;
		this.append(`}`);
	}
	
	/**
	 * Generates a loop block.
	 * @param {ShaderProgram} program 
	 * @param {ShaderInst3} inst 
	 */
	genLoopBlock(program, inst) {
		/** @type {ShaderUniform} */
		let uniform = program.ivec4Uniforms[inst.regId & 3];
		let iuName = this.ivec4UniformNames[inst.regId & 3];
		let alStart, alCond, alInc;
		if (uniform.isConstant) {
			alStart = `reg_al = ${uniform.constant.y}`;
			alCond  = `reg_al <= ${uniform.constant.x}`;
			alInc   = `reg_al += ${uniform.constant.z}`;
		} else {
			alStart = `reg_al = ${iuName}.y`;
			alCond  = `reg_al <= ${iuName}.x`;
			alInc   = `reg_al += ${iuName}.z`;
		}
		this.append(`for (${alStart}; ${alCond}; ${alInc}) {`);
		let oldIndent = this.indent;
		this.indent += '\t';
		
		while (this.ip + 1 <= inst.dest) {
			this.genInst(program, this.shBin.executable[++this.ip]);
		}
		
		this.indent = oldIndent;
		this.append('}');
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
	 * @param {uint} regid - register
	 * @param {bool} onTrue
	 */
	getBoolCondition(program, regid, onTrue = true) {
		if (program.boolUniforms[regid].isConstant) {
			return program.boolUniforms[regid].constant ? 'true' : 'false';
		} else if (onTrue) {
			return `(BoolUniforms & ${this.boolUniformNames[regid]}) != 0`;
		} else {
			return `(BoolUniforms & ${this.boolUniformNames[regid]}) == 0`;
		}
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
	 * 
	 * @param {ShaderOutputReg[]} regs 
	 * @param {string} prefix 
	 * @returns {string[]}
	 */
	genOutputs(regs, prefix='') {
		let out = [];
		for (let i = 0; i < regs.length; i++) {
			let reg = regs[i];
			if (reg && reg.mask) {
				if (reg.name === ShaderOutputRegName.TexCoord0W) {
					reg.name = ShaderOutputRegName.TexCoord0;
				}
				
				this.outputNames[i] = `${prefix}${reg.nameStr}`;
				
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
	 * Adds a procedure to the Procedure Table and queue it for generation.
	 * @param {string} name - Name of the procedure call
	 * @param {uint} off - Instruction of the start of the procedure call
	 * @param {uint} len - Number of instructions in the procedure call
	 */
	addProc(name, off, len) {
		if (!this.procTable.has(name)) {
			this.procTable.add(name);
			this.procQueue.push({ name, off, len, });
		}
	}
	
	//////////////////////////////////////////////////////////////////////////////////
	// Uniforms
	
	/**
	 * @param {string} name 
	 */
	getValidName(name) {
		return name.replace(/[^a-zA-Z0-9_]/ig, '');
	}
	
	getVec4Uniforms(uniforms) {
		return this._genVecUniforms(uniforms, this.vec4UniformNames, 'vec4');
	}
	getIVec4Uniforms(uniforms) {
		return this._genVecUniforms(uniforms, this.ivec4UniformNames, 'ivec4');
	}
	_genVecUniforms(uniforms, names, type) {
		let out = [];
		for (let i = 0; i < uniforms.length; i++) {
			const uniform = uniforms[i];
			if (!uniform || uniform.isConstant) continue; //these will be generated into the shader
			const name = `${type}_${i - uniform.arrayIndex}_${this.getValidName(name)}`;
			
			// For registers used as arrays, the name is stored with the indexer ([0], [1], [2]...),
			// but a version without the indexer is also stored in Vec4UniformNamesNoIdx for getSrcRegister(),
			// since it needs indexed array access with illegal memory access protection. --gdkchan
			const indexer = uniform.isArray ? `[${uniform.arrayIndex}]` : '';
			names[i] = name + indexer;
			
			if (names === this.vec4UniformNames) {
				this.vec4UniformNames[i] = name;
			}
			if (uniform.arrayIndex === 0) {
				if (uniform.isArray)
					out.push(`uniform ${type} ${name}[${uniform.arrayLength}];`);
				else
					out.push(`uniform ${type} ${name};`);
			}
		}
		return out;
	}
	getBoolUniforms(uniforms) {
		let out = [`uniform int BoolUniforms;\n`];
		for (let i = 0; i < uniforms.length; i++) {
			const name = `bool_${i}_${this.getValidName(uniforms[i].name)}`;
			this.boolUniformNames[i] = name;
			out.push(`#define ${name} (1 << ${i})`);
		}
		return out;
	}
}

module.exports = ShaderGenerator;

// static helper methods

function vecX(str, len) {
	switch (len) {
		case 2: return `vec2(${str})`;
		case 3: return `vec3(${str})`;
		case 4: return `vec4(${str})`;
	}
	return str;
}
function vecCast(str, len) {
	switch (len) {
		case 1: return `float(${str})`;
		case 2: return `vec2(${str})`;
		case 3: return `vec3(${str})`;
		case 4: return `vec4(${str})`;
	}
	return str;
}
function condition(inst) {
	let x = inst.refX ? '' : '!';
	let y = inst.refY ? '' : '!';
	switch (inst.condOp) {
		case 0: return `${x}reg_cmp.x || ${y}reg_cmp.y`;
		case 1: return `${x}reg_cmp.x && ${y}reg_cmp.y`;
		case 2: return `${x}reg_cmp.x`;
		case 3: return `${y}reg_cmp.y`;
	}
	return '';
}
function compare(left, right, op) {
	switch (op) {
		case 0: return `${left} == ${right}`;
		case 1: return `${left} != ${right}`;
		case 2: return `${left} < ${right}`;
		case 3: return `${left} <= ${right}`;
		case 4: return `${left} > ${right}`;
		case 5: return `${left} >= ${right}`;
	}
	return 'true';
}

// Instructions Code Generation methods

GEN_INST[-1] = function(program, inst, {}={}) {
	// Unsupported Operation
	this.append(`// Unsupported Operation [0x${inst.toString(16)}]`);
};
GEN_INST[ShaderOpCode.Add] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1Params(program, inst);
	this.append(`${dest}.${sDst} = ${src1}.${sSrcM[0]} + ${src2}.${sSrcM[1]};`);
};
GEN_INST[ShaderOpCode.DP3] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1Params(program, inst);
	let dot = vecX(`dot(${src1}.${sSrcM[0].slice(0,3)}, ${src2}.${sSrcM[1].slice(0,3)})`, sDst.length);
	this.append(`${dest}.${sDst} = ${dot};`);
};
GEN_INST[ShaderOpCode.DP4] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1Params(program, inst);
	let dot = vecX(`dot(${src1}.${sSrcM[0]}, ${src2}.${sSrcM[1]})`, sDst.length);
	this.append(`${dest}.${sDst} = ${dot};`);
};
GEN_INST[ShaderOpCode.DPH] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1Params(program, inst);
	let dot = vecX(`dot(${src1}.${sSrcM[0].slice(0,3)}, ${src2}.${sSrcM[1].slice(0,3)}) + ${src2}.w`, sDst.length);
	this.append(`${dest}.${sDst} = ${dot};`);
};
GEN_INST[ShaderOpCode.Dst] = function(program, inst, {}={}) {
	let { dest, src1, src2 } = this.getInst1Params(program, inst);
	this.append(`${dest} = vec4(1, ${src1}.y * ${src1}.y, ${src1}.z, ${src2}.w);`);
};
GEN_INST[ShaderOpCode.Ex2] = function(program, inst, {}={}) {
	let { dest, sDst, src1, sSrcM } = this.getInst1Params(program, inst);
	this.append(`${dest}.${sDst} = exp2(${src1}.${sSrcM[0]});`);
};
GEN_INST[ShaderOpCode.Lg2] = function(program, inst, {}={}) {
	let { dest, sDst, src1, sSrcM } = this.getInst1Params(program, inst);
	this.append(`${dest}.${sDst} = log2(${src1}.${sSrcM[0]});`);
};
GEN_INST[ShaderOpCode.LitP] = function(program, inst, {}={}) {
	let { dest, sDst, src1, sSrcM } = this.getInst1Params(program, inst);
	this.append(`${dest}.${sDst} = exp2(${src1}.${sSrcM[0]});`);
};
GEN_INST[ShaderOpCode.Mul] = function(program, inst, {}={}) {
	let { dest, src1:src } = this.getInst1Params(program, inst);
	this.append(`${dest} = vec4(max(${src}.x, 0), clamp(${src}.y, -1, 1), 0, max(${src}.w, 0));`);
	this.append(`reg_cmp.x = ${src}.x > 0 ? 1 : 0;`);
	this.append(`reg_cmp.y = ${src}.w > 0 ? 1 : 0;`);
};
GEN_INST[ShaderOpCode.SGE] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1Params(program, inst);
	for (let i = 0; i < sDst.length; i++) {
		this.append(`${dest}.${sDst[i]} = ${src1}.${sSrcM[0][i]} >= ${src2}.${sSrcM[1][i]} ? 1 : 0;`);
	}
};
GEN_INST[ShaderOpCode.SLT] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1Params(program, inst);
	for (let i = 0; i < sDst.length; i++) {
		this.append(`${dest}.${sDst[i]} = ${src1}.${sSrcM[0][i]} < ${src2}.${sSrcM[1][i]} ? 1 : 0;`);
	}
};
GEN_INST[ShaderOpCode.Flr] = function(program, inst, {}={}) {
	let { dest, sDst, src1, sSrcM } = this.getInst1Params(program, inst);
	this.append(`${dest}.${sDst} = floor(${src1}.${sSrcM[0]});`);
};
GEN_INST[ShaderOpCode.Max] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1Params(program, inst);
	this.append(`${dest}.${sDst} = max(${src1}.${sSrcM[0]}, ${src2}.${sSrcM[1]});`);
};
GEN_INST[ShaderOpCode.Min] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1Params(program, inst);
	this.append(`${dest}.${sDst} = min(${src1}.${sSrcM[0]}, ${src2}.${sSrcM[1]});`);
};
GEN_INST[ShaderOpCode.Rcp] = function(program, inst, {}={}) {
	let { dest, sDst, src1, sSrcM } = this.getInst1Params(program, inst);
	this.append(`${dest}.${sDst} = ${vecX('1', sDst.length)} / ${src1}.${sSrcM[0]};`);
};
GEN_INST[ShaderOpCode.RSq] = function(program, inst, {}={}) {
	let { dest, sDst, src1, sSrcM } = this.getInst1Params(program, inst);
	this.append(`${dest}.${sDst} = inversesqrt(${src1}.${sSrcM[0]});`);
};
GEN_INST[ShaderOpCode.MovA] = function(program, inst, {}={}) {
	let { sDst, src1, sSrcM } = this.getInst1Params(program, inst);
	let len = Math.min(sDst.length, 2);
	sDst = sDst.slice(0, len);
	src1 = src1.slice(0, len);
	if (len > 1)
		this.append(`reg_a0.${sDst} = ivec2(${src1}, ${sSrcM[0]});`);
	else
		this.append(`reg_a0.${sDst} = int(${src1}, ${sSrcM[0]});`);
};
GEN_INST[ShaderOpCode.Mov] = function(program, inst, {}={}) {
	let { dest, sDst, src1, sSrcM } = this.getInst1Params(program, inst);
	this.append(`${dest}.${sDst} = ${src1}.${sSrcM[0]};`);
};
GEN_INST[ShaderOpCode.DPHI] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1iParams(program, inst);
	let dot = vecX(`dot(${src1}.${sSrcM[0].slice(0,3)}, ${src2}.${sSrcM[1].slice(0,3)}) + ${src2}.w`, sDst.length);
	this.append(`${dest}.${sDst} = ${dot};`);
};
GEN_INST[ShaderOpCode.DstI] = function(program, inst, {}={}) {
	let { dest, src1, src2 } = this.getInst1iParams(program, inst);
	this.append(`${dest} = vec4(1, ${src1}.y * ${src1}.y, ${src1}.z, ${src2}.w);`);
};
GEN_INST[ShaderOpCode.SGEI] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1iParams(program, inst);
	for (let i = 0; i < sDst.length; i++) {
		this.append(`${dest}.${sDst[i]} = ${src1}.${sSrcM[0][i]} >= ${src2}.${sSrcM[1][i]} ? 1 : 0;`);
	}
};
GEN_INST[ShaderOpCode.SLTI] = function(program, inst, {}={}) {
	let { dest, sDst, src1, src2, sSrcM } = this.getInst1iParams(program, inst);
	for (let i = 0; i < sDst.length; i++) {
		this.append(`${dest}.${sDst[i]} = ${src1}.${sSrcM[0][i]} < ${src2}.${sSrcM[1][i]} ? 1 : 0;`);
	}
};
GEN_INST[ShaderOpCode.Break] = function(program, inst, {}={}) {
	// Not Yet Implemented
	this.append(`// Unimplemented: Break [0x${inst.toString(16)}]`);
};
GEN_INST[ShaderOpCode.NOp] = function(program, inst, {}={}) {
	// Noop - No Implementation
	this.append(`// Noop [0x${inst.toString(16)}]`);
};
GEN_INST[ShaderOpCode.End] = function(program, inst, {}={}) {
	this.append(`// End [0x${inst.toString(16)}]`);
};
GEN_INST[ShaderOpCode.BreakC] = function(program, inst, {}={}) {
	inst = this.getInst2Params(inst);
	this.append(`if (${condition(inst)}) break;`);
};
GEN_INST[ShaderOpCode.Call] = function(program, inst, {}={}) {
	inst = this.getInst2Params(inst);
	let name = this.labels.get(inst.dest);
	this.addProc(name, inst.dest, inst.count);
	this.append(`${name}();`);
};
GEN_INST[ShaderOpCode.CallC] = function(program, inst, {}={}) {
	inst = this.getInst2Params(inst);
	let name = this.labels.get(inst.dest);
	this.addProc(name, inst.dest, inst.count);
	this.append(`if (${condition(inst)}) { ${name}(); }`);
};
GEN_INST[ShaderOpCode.CallU] = function(program, inst, {}={}) {
	inst = this.getInst3Params(inst);
	let name = this.labels.get(inst.dest);
	this.addProc(name, inst.dest, inst.count);
	this.append(`if (${this.getBoolCondition(program, inst.regId)}) { ${name}(); }`);
};
GEN_INST[ShaderOpCode.IfU] = function(program, inst, {}={}) {
	inst = this.getInst3Params(inst);
	this.genIfBlock(program, this.getBoolCondition(inst, inst.regId), inst.dest, inst.count);
};
GEN_INST[ShaderOpCode.IfC] = function(program, inst, {}={}) {
	inst = this.getInst2Params(inst);
	this.genIfBlock(program, condition(inst), inst.dest, inst.count);
};
GEN_INST[ShaderOpCode.Loop] = function(program, inst, {}={}) {
	inst = this.getInst3Params(inst);
	this.genLoopBlock(program, inst);
};
GEN_INST[ShaderOpCode.Emit] = function(program, inst, {}={}) {
	// Not Yet Implemented
	this.append(`// Unimplemented: Emit [0x${inst.toString(16)}]`);
};
GEN_INST[ShaderOpCode.SetEmit] = function(program, inst, {}={}) {
	// Not Yet Implemented
	this.append(`// Unimplemented: SetEmit [0x${inst.toString(16)}]`);
};
GEN_INST[ShaderOpCode.JmpC] = function(program, inst, {}={}) {
	inst = this.getInst2Params(inst);
	this.append(`if (${condition(inst)}) { //jump`);
	this.append(`\t${this.labels[inst.dest]}();`);
	this.append(`\treturn;`);
	this.append(`}`);
};
GEN_INST[ShaderOpCode.JmpU] = function(program, inst, {}={}) {
	inst = this.getInst3Params(inst);
	this.append(`if (${this.getBoolCondition(inst, inst.regId)}) { //jump`);
	this.append(`\t${this.labels[inst.dest]}();`);
	this.append(`\treturn;`);
	this.append(`}`);
};
GEN_INST[ShaderOpCode.Cmp] = function(program, inst, {}={}) {
	let { cmpX, cmpY } = this.getInst1cParams(inst);
	this.append(`reg_cmp.x = ${cmpX};`);
	this.append(`reg_cmp.y = ${cmpY};`);
};
GEN_INST[ShaderOpCode.MAdI] = function(program, inst, {}={}) {
	inst = { // ShaderInstMAdI
		dest : (inst >> 24) & 0x1F,
		idx3 : (inst >> 22) & 0x03,
		src1 : (inst >> 17) & 0x1F,
		src2 : (inst >> 12) & 0x1F,
		src3 : (inst >>  5) & 0x7F,
		desc : (inst >>  0) & 0x1F,
	};
	let dest = this.getDstRegister(program, inst.dest);
	let src1 = this.getSrcRegister(program, inst.src1);
	let src2 = this.getSrcRegister(program, inst.src2);
	let src3 = this.getSrcRegister(program, inst.src3, inst.idx3);
	
	let { sDst, sSrcM } = this.shBin.getSwizzles(inst.desc);
	let signs = this.shBin.getSrcSigns(inst.desc);
	
	this.append(`${dest}.${sDst} = ${signs[0]}${src1}.${sSrcM[0]} * ${signs[1]}${src2}.${sSrcM[1]} + ${signs[2]}${src3}.${sSrcM[2]};`);
};
GEN_INST[ShaderOpCode.MAd] = function(program, inst, {}={}) {
	inst = { // ShaderInstMAd
		dest : (inst >> 24) & 0x1F,
		idx2 : (inst >> 22) & 0x03,
		src1 : (inst >> 17) & 0x1F,
		src2 : (inst >> 10) & 0x7F,
		src3 : (inst >>  5) & 0x1F,
		desc : (inst >>  0) & 0x1F,
	};
	let dest = this.getDstRegister(program, inst.dest);
	let src1 = this.getSrcRegister(program, inst.src1);
	let src2 = this.getSrcRegister(program, inst.src2, inst.idx2);
	let src3 = this.getSrcRegister(program, inst.src3);
	
	let { sDst, sSrcM } = this.shBin.getSwizzles(inst.desc);
	let signs = this.shBin.getSrcSigns(inst.desc);
	
	this.append(`${dest}.${sDst} = ${signs[0]}${src1}.${sSrcM[0]} * ${signs[1]}${src2}.${sSrcM[1]} + ${signs[2]}${src3}.${sSrcM[2]};`);
};
