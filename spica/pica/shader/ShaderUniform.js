// ShaderUniform.js

class ShaderUniform {
	constructor({ isConstant=false, isArray=false, name='' }={}) {
		this.name = name;
		this.isConstant = isConstant;
		this.isArray = isArray;
		this.arrayIndex = 0;
		this.arrayLength = 1;
	}
}

class ShaderUniformBool extends ShaderUniform {
	constructor(opts={}) {
		super(Object.assign({ isConstant: !!opts.val }, opts));
		this.constant = opts.val;
	}
}

class ShaderUniformVec4 extends ShaderUniform {
	constructor(opts={}) {
		super(Object.assign({ isConstant: !!opts.val }, opts));
		this.constant = opts.val;
	}
}

module.exports = { ShaderUniform, ShaderUniformBool, ShaderUniformVec4 };