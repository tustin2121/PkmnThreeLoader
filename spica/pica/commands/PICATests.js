//

const PICATestFunc = {
	Never : 0,
	Always : 1,
	Equal : 2,
	Notequal : 3,
	Less : 4,
	Lequal : 5,
	Greater : 6,
	Gequal : 7,
};

const PICAStencilOp = {
	Keep : 0,
	Zero : 1,
	Replace : 2,
	Increment : 3,
	Decrement : 4,
	Invert : 5,
	IncrementWrap : 6,
	DecrementWrap : 7,
};

const PICABlendEquation = {
	FuncAdd : 0,
	FuncSubtract : 1,
	FuncReverseSubtract : 2,
	Min : 3,
	Max : 4,
	
	toThree : function(pica) {
		const THREE = require('three');
		return pica + THREE.AddEquation; //+100
	},
};

const PICABlendFunc = {
	Zero : 0,
	One : 1,
	SourceColor : 2,
	OneMinusSourceColor : 3,
	DestinationColor : 4,
	OneMinusDestinationColor : 5,
	SourceAlpha : 6,
	OneMinusSourceAlpha : 7,
	DestinationAlpha : 8,
	OneMinusDestinationAlpha : 9,
	ConstantColor : 10,
	OneMinusConstantColor : 11,
	ConstantAlpha : 12,
	OneMinusConstantAlpha : 13,
	SourceAlphaSaturate : 14,
	
	toThree : function(pica) {
		const THREE = require('three');
		switch (pica) {
			case PICABlendFunc.Zero: return THREE.ZeroFactor;
			case PICABlendFunc.One: return THREE.OneFactor;
			case PICABlendFunc.SourceColor: return THREE.SrcColorFactor;
			case PICABlendFunc.OneMinusSourceColor: return THREE.OneMinusSrcColorFactor;
			case PICABlendFunc.DestinationColor: return THREE.DstColorFactor;
			case PICABlendFunc.OneMinusDestinationColor: return THREE.OneMinusDstColorFactor;
			case PICABlendFunc.SourceAlpha: return THREE.SrcAlphaFactor;
			case PICABlendFunc.OneMinusSourceAlpha: return THREE.OneMinusSrcAlphaFactor;
			case PICABlendFunc.DestinationAlpha: return THREE.DstAlphaFactor;
			case PICABlendFunc.OneMinusDestinationAlpha: return THREE.OneMinusDstAlphaFactor;
			case PICABlendFunc.ConstantColor: throw new TypeError('Unsupported blend funciton: ConstantColor');
			case PICABlendFunc.OneMinusConstantColor: throw new TypeError('Unsupported blend funciton: OneMinusConstantColor');
			case PICABlendFunc.ConstantAlpha: throw new TypeError('Unsupported blend funciton: ConstantAlpha');
			case PICABlendFunc.OneMinusConstantAlpha: throw new TypeError('Unsupported blend funciton: OneMinusConstantAlpha');
			case PICABlendFunc.SourceAlphaSaturate: return THREE.SrcAlphaSaturateFactor;
		}
	},
};

const PICABlendMode = {
	LogicalOp : 0,
	Blend : 1,
};

const PICALogicalOp = {
	Clear : 0,
	And : 1,
	AndReverse : 2,
	Copy : 3,
	"Set" : 4,
	CopyInverted : 5,
	Noop : 6,
	Invert : 7,
	Nand : 8,
	Or : 9,
	Nor : 10,
	Xor : 11,
	Equiv : 12,
	AndInverted : 13,
	OrReverse : 14,
	OrInverted : 15,
};

const PICAPrimitiveMode = {
	Triangles : 0,
	TriangleStrip : 1,
	TriangleFan : 2,
	GeometryPrimitive : 3,
};

const PICADrawMode = {
    TriangleStrip : 0,
    TriangleFan : 1,
    Triangles : 2,
    GeoPrimitive : 3,
};

const PICAFaceCulling = {
    Never : 0,
    FrontFace : 1,
    BackFace : 2,
};

class PICAAlphaTest {
	constructor(param) {
		/** @type {bool} */
		this.enabled = (param & 1) !== 0;
		/** @type {PICATestFunc} */
		this.function = ((param >> 4) & 7);
		/** @type {byte} */
		this.reference = (param >> 8);
	}
	// TODO ? https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Commands/PICAAlphaTest.cs#L20
	toUint32() { throw new Error('Not implemented'); }
	/** Convert to a Three.js alpha test number */
	toThree() {
		if (!this.enabled) return {};
		if (this.function === PICAAlphaTest.Always) 
			return { transparent: true };
		if (this.function === PICAAlphaTest.Never) 
			return { transparent: true, visable: false };
		return {
			transparent: this.enabled,
			alphaTest: this.reference/255,
			alphaTestOp: (()=>{
				switch(this.function) {
					case PICATestFunc.Equal: return '==';
					case PICATestFunc.Notequal: return '!=';
					case PICATestFunc.Less: return '>';
					case PICATestFunc.Lequal: return '>=';
					case PICATestFunc.Greater: return '<';
					case PICATestFunc.Gequal: return '<=';
				}
			})(),
		};
	}
}

class PICAStencilOperation {
	constructor(param) {
		/** @type {PICAStencilOp} */
		this.failOp  = ((param >> 0) & 7);
		this.zfailOp = ((param >> 4) & 7);
		this.zpassOp = ((param >> 8) & 7);
	}
	// TODO? https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Commands/PICAStencilOperation.cs#L16
	toUint32() { throw new Error('Not implemented'); }
	toThree() {
		return {}; //TODO
	}
}

class PICAStencilTest {
	constructor(param) {
		this.enabled	= (param & 1) !== 0;
		this.func 		= ((param >> 4) & 7);
		this.buffermask	= (param >>  8) & 0xFF;
		this.reference	= (param >> 16) & 0xFF;
		this.mask		= (param >> 24) & 0xFF;
	}
	// TODO? https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Commands/PICAStencilTest.cs#L20
	toUint32() { throw new Error('Not implemented'); }
	toThree() {
		return {}; //TODO
	}
}

class PICABlendFunction {
	constructor(param) {
		/** @type {PICABlendEquation} */
		this.colorEquation = ((param >> 0) & 7);
		this.alphaEquation = ((param >> 8) & 7);
		/** @type {PICABlendFunc} */
		this.colorSrcFunc = ((param >> 16) & 0xF);
		this.colorDstFunc = ((param >> 20) & 0xF);
		
		this.alphaSrcFunc = ((param >> 24) & 0xF);
		this.alphaDstFunc = ((param >> 28) & 0xF);
	}
	// TODO? https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Commands/PICABlendFunction.cs#L26
	toUint32() { throw new Error('Not implemented'); }
	
	isCustom() {
		return !(
			this.colorEquation == 0 && this.colorSrcFunc == 1 && this.colorDstFunc == 0 &&
			this.alphaEquation == 0 && this.alphaSrcFunc == 1 && this.alphaDstFunc == 0
		);
	}
	toThree() {
		const THREE = require('three');
		if (!this.isCustom()) return {};
		return {
			blending: THREE.CustomBlending,
			blendEquation: PICABlendEquation.toThree(this.colorEquation),
			blendSrc: PICABlendFunc.toThree(this.colorSrcFunc),
			blendDst: PICABlendFunc.toThree(this.colorDstFunc),
			blendEquationAlpha: PICABlendEquation.toThree(this.alphaEquation),
			blendSrcAlpha: PICABlendFunc.toThree(this.alphaSrcFunc),
			blendDstAlpha: PICABlendFunc.toThree(this.alphaDstFunc),
		};
	}
}

class PICAColorOperation {
	constructor(param) {
		/** @type {PICAFragOpMode} */
		this.fragOpMode = ((param >> 0) & 3);
		/** @type {PICABlendMode} */
		this.blendMode = ((param >> 8) & 1);
	}
	// TODO? https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Commands/PICAColorOperation.cs#L14
	toUint32() { throw new Error('Not implemented'); }
	toThree() {
		return {}; //TODO
	}
}

class PICADepthColorMask {
	constructor(param) {
		this.enabled	= (param & 1) !== 0;
		this.depthFunc	= ((param >> 4) & 7); /** @type {PICATestFunc} */
		
		this.redWrite	= (param & 0x0100) !== 0;
		this.greenWrite	= (param & 0x0200) !== 0;
		this.blueWrite	= (param & 0x0400) !== 0;
		this.alphaWrite	= (param & 0x0800) !== 0;
		this.depthWrite	= (param & 0x1000) !== 0;
	}
	// TODO? https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Commands/PICADepthColorMask.cs#L28
	toUint32() { throw new Error('Not implemented'); }
	toThree() {
		return {}; //TODO
	}
}

module.exports = {
	PICATestFunc,
	PICAAlphaTest,
	PICAStencilOp,
	PICAStencilOperation,
	PICAStencilTest,
	PICABlendEquation,
	PICABlendFunc,
	PICABlendFunction,
	PICABlendMode,
	PICALogicalOp,
	PICAPrimitiveMode,
	PICAColorOperation,
	PICADepthColorMask,
	PICADrawMode,
	PICAFaceCulling,
};