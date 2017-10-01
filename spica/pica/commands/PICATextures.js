// PICATexEnvStage.js

const PICATextureCombinerAlphaOp = {
	Alpha : 0,
	OneMinusAlpha : 1,
	Red : 2,
	OneMinusRed : 3,
	Green : 4,
	OneMinusGreen : 5,
	Blue : 6,
	OneMinusBlue : 7,
};

const PICATextureCombinerColorOp = {
    Color : 0,
    OneMinusColor : 1,
    Alpha : 2,
    OneMinusAlpha : 3,
    Red : 4,
    OneMinusRed : 5,
    Green : 8,
    OneMinusGreen : 9,
    Blue : 12,
    OneMinusBlue : 13,
};

const PICATextureCombinerMode = {
    Replace : 0,
    Modulate : 1,
    Add : 2,
    AddSigned : 3,
    Interpolate : 4,
    Subtract : 5,
    DotProduct3Rgb : 6,
    DotProduct3Rgba : 7,
    MultAdd : 8,
    AddMult : 9,
};

const PICATextureCombinerScale = {
    One : 0,
    Two : 1,
    Four : 2,
};

const PICATextureCombinerSource = {
    PrimaryColor : 0,
    FragmentPrimaryColor : 1,
    FragmentSecondaryColor : 2,
    Texture0 : 3,
    Texture1 : 4,
    Texture2 : 5,
    Texture3 : 6,
    PreviousBuffer : 13,
    Constant : 14,
    Previous : 15,
};

const PICATextureFilter = {
    Nearest : 0,
    Linear : 1,
};

const PICATextureFormat = {
    RGBA8 : 0,
    RGB8 : 1,
    RGBA5551 : 2,
    RGB565 : 3,
    RGBA4 : 4,
    LA8 : 5,
    HiLo8 : 6,
    L8 : 7,
    A8 : 8,
    LA4 : 9,
    L4 : 10,
    A4 : 11,
    ETC1 : 12,
    ETC1A4 : 13,
};

const PICATextureSamplerType = {
    UvCoordinateMap : 0,
    CameraCubeEnvMap : 1,
    Shadow : 2,
    ProjectionMap : 3,
    ShadowBox : 4,
};

const PICATextureWrap = {
    ClampToEdge : 0,
    ClampToBorder : 1,
    Repeat : 2,
    Mirror : 3,
};

class PICATexEnvCombiner {
	constructor(param) {
		/** @type {PICATextureCombinerMode} */
		this.color = ((param >>  0) & 0xF);
		/** @type {PICATextureCombinerMode} */
		this.alpha = ((param >> 16) & 0xF);
	}
	toUint32() {
		return ((this.color & 0xF) << 0) | ((this.color & 0xF) << 16);
	}
}

class PICATexEnvOperand {
	/** @param {uint} param */
	constructor(param) {
		/** @type {PICATextureCombinerColorOp[]} */
		this.color = new Array(3);
		if (param !== undefined) {
			this.color[0] = ((param >> 0) & 0xF);
			this.color[1] = ((param >> 4) & 0xF);
			this.color[2] = ((param >> 8) & 0xF);
		}
		
		/** @type {PICATextureCombinerAlphaOp[]} */
		this.alpha = new Array(3);
		if (param !== undefined) {
			this.alpha[0] = ((param >> 12) & 0x7);
			this.alpha[1] = ((param >> 16) & 0x7);
			this.alpha[2] = ((param >> 20) & 0x7);
		}
	}
	toUint32() {
		return 0; //TODO
	}
}

class PICATexEnvScale {
	/** @param {uint} param */
	constructor(param) {
		/** @type {PICATextureCombinerScale } */
		this.color = ((param >>  0) & 0x3);
		/** @type {PICATextureCombinerScale } */
		this.alpha = ((param >> 16) & 0x3);
	}
	toUint32() {
		return ((this.color & 0x3) << 0) | ((this.color & 0x3) << 16);
	}
}

class PICATexEnvSource {
	/** @param {uint} param */
	constructor(param) {
		/** @type {PICATextureCombinerSource[]} */
		this.color = new Array(3);
		if (param !== undefined) {
			this.color[0] = ((param >> 0) & 0xF);
			this.color[1] = ((param >> 4) & 0xF);
			this.color[2] = ((param >> 8) & 0xF);
		}
		
		/** @type {PICATextureCombinerSource[]} */
		this.alpha = new Array(3);
		if (param !== undefined) {
			this.alpha[0] = ((param >> 12) & 0x7);
			this.alpha[1] = ((param >> 16) & 0x7);
			this.alpha[2] = ((param >> 20) & 0x7);
		}
	}
	toUint32() {
		return 0; //TODO
	}
}

class PICATexEnvStage {
	constructor() {
		this.source = new PICATexEnvSource();
		this.operand = new PICATexEnvOperand();
		this.combiner = new PICATexEnvCombiner();
		this.color = 0x00000000; /** @type {RGBA} */
		this.scale = new PICATexEnvScale();
		
		this.updateColorBuffer = false;
		this.updateAlphaBuffer = false;
	}
	
	get isColorPassThrough() {
		return	this.combiner.color	=== PICATextureCombinerMode.Replace &&
				this.source.color[0] === PICATextureCombinerSource.Previous &&
				this.operand.color[0]=== PICATextureCombinerColorOp.Color &&
				this.scale.color		=== PICATextureCombinerScale.One &&
				!this.updateColorBuffer;
	}
	get isAlphaPassThrough() {
		return	this.combiner.alpha	=== PICATextureCombinerMode.Replace &&
				this.source.alpha[0] === PICATextureCombinerSource.Previous &&
				this.operand.alpha[0]=== PICATextureCombinerColorOp.Alpha &&
				this.scale.alpha		=== PICATextureCombinerScale.One &&
				!this.updateAlphaBuffer;
	}
	
	static get texture0() {
		//Does TextureRGB * SecondaryColor, and TextureA is used unmodified
        //Note: This is meant to be used on the first stage
		let out = new PICATexEnvStage();
		out.source.color[0] = PICATextureCombinerSource.Texture0;
		out.source.alpha[0] = PICATextureCombinerSource.Texture0;
		return out;
	}
	static get passthrough() {
		//Does nothing, just pass the previous color down the pipeline
		let out = new PICATexEnvStage();
		out.source.color[0] = PICATextureCombinerSource.Previous;
		out.source.alpha[0] = PICATextureCombinerSource.Previous;
		return out;
	}
	
	/**
	 * @param {PICATexEnvStage[]} texEnvStages
	 * @param {uint} param
	 */
	static setUpdateBuffer(texEnvStages, param) {
		texEnvStages[1].updateColorBuffer = ((param & 0x0100) !== 0);
		texEnvStages[2].updateColorBuffer = ((param & 0x0200) !== 0);
		texEnvStages[3].updateColorBuffer = ((param & 0x0400) !== 0);
		texEnvStages[4].updateColorBuffer = ((param & 0x0800) !== 0);
		
		texEnvStages[1].UpdateAlphaBuffer = ((param & 0x1000) !== 0);
		texEnvStages[2].UpdateAlphaBuffer = ((param & 0x2000) !== 0);
		texEnvStages[3].UpdateAlphaBuffer = ((param & 0x4000) !== 0);
		texEnvStages[4].UpdateAlphaBuffer = ((param & 0x8000) !== 0);
	}
	/**
	 * @param {PICATexEnvStage[]} texEnvStages
	 * @return {uint} param
	 */
	static getUpdateBuffer(texEnvStages) {
		let param = 0;
		if (texEnvStages[1].updateColorBuffer) param |= 0x0100;
		if (texEnvStages[2].updateColorBuffer) param |= 0x0200;
		if (texEnvStages[3].updateColorBuffer) param |= 0x0400;
		if (texEnvStages[4].updateColorBuffer) param |= 0x0800;
		
		if (texEnvStages[1].UpdateAlphaBuffer) param |= 0x1000;
		if (texEnvStages[2].UpdateAlphaBuffer) param |= 0x2000;
		if (texEnvStages[3].UpdateAlphaBuffer) param |= 0x4000;
		if (texEnvStages[4].UpdateAlphaBuffer) param |= 0x8000;
		return param;
	}
}

module.exports = {
	PICATexEnvCombiner,
	PICATexEnvOperand,
	PICATexEnvScale,
	PICATexEnvSource,
	PICATexEnvStage,
	PICATextureCombinerAlphaOp,
	PICATextureCombinerColorOp,
	PICATextureCombinerMode,
	PICATextureCombinerScale,
	PICATextureCombinerSource,
	PICATextureFilter,
	PICATextureFormat,
	PICATextureSamplerType,
	PICATextureWrap,
};