// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/Material/GFMaterial.cs

const { GFSection } = require('../GFSection');
const { GFHashName } = require('./GFHashName');
const {
	PICALUTInAbs, PICALUTInScale, PICALUTInSel,
	PICAColorOperation, PICABlendFunction, PICALogicalOp, PICAAlphaTest, PICAStencilTest,
	PICAStencilOperation, PICADepthColorMask, PICAFaceCulling,
} = require('../../pica/commands');
const { PICACommandReader, PICARegister } = require('../../pica');

const GFTextureMappingType = {
    UvCoordinateMap : 0,
    CameraCubeEnvMap : 1,
    CameraSphereEnvMap : 2,
    ProjectionMap : 3,
    Shadow : 4,
    ShadowBox : 5,
	toThree : function(pica) {
		const THREE = require('three');
		switch (pica) {
			case GFTextureMappingType.UvCoordinateMap: return THREE.UVMapping;
			case GFTextureMappingType.CameraCubeEnvMap: return THREE.CubeReflectionMapping;
			case GFTextureMappingType.CameraSphereEnvMap: return THREE.SphericalReflectionMapping;
			case GFTextureMappingType.ProjectionMap: return THREE.EquirectangularReflectionMapping; //?
			case GFTextureMappingType.Shadow: throw new TypeError('Unsupported GFTextureMappingType.Shadow');
			case GFTextureMappingType.ShadowBox: throw new TypeError('Unsupported GFTextureMappingType.ShadowBox');
		}
	},
};

const GFTextureWrap = {
    ClampToEdge : 0,
    ClampToBorder : 1,
    Repeat : 2,
    Mirror : 3,
	toThree : function(pica) {
		const THREE = require('three');
		switch (pica) {
			case GFTextureWrap.ClampToEdge: return THREE.ClampToEdgeWrapping;
			case GFTextureWrap.ClampToBorder: return THREE.ClampToEdgeWrapping;
			case GFTextureWrap.Repeat: return THREE.RepeatWrapping;
			case GFTextureWrap.Mirror: return THREE.MirroredRepeatWrapping;
		}
	},
};

const GFMinFilter = {
    Nearest : 0,
    NearestMipmapNearest : 1,
    NearestMipmapLinear : 2,
    Linear : 3,
    LinearMipmapNearest : 4,
    LinearMipmapLinear : 5,
	toThree : function(pica) {
		const THREE = require('three');
		switch (pica) {
			case GFMinFilter.Nearest: return THREE.NearestFilter;
			case GFMinFilter.NearestMipmapNearest: return THREE.NearestMipMapNearestFilter;
			case GFMinFilter.NearestMipmapLinear: return THREE.NearestMipMapLinearFilter;
			case GFMinFilter.Linear: return THREE.LinearFilter;
			case GFMinFilter.LinearMipmapNearest: return THREE.LinearMipMapNearestFilter;
			case GFMinFilter.LinearMipmapLinear: return THREE.LinearMipMapLinearFilter;
		}
	},
};

const GFMagFilter = {
    Nearest : 0,
    Linear : 1,
	toThree : function(pica) {
		const THREE = require('three');
		switch (pica) {
			case GFMagFilter.Nearest: return THREE.NearestFilter;
			case GFMagFilter.Linear: return THREE.LinearFilter;
		}
	},
};

function RGBA(param) {
	let R = (param >>  0) & 0xFF;
	let G = (param >>  8) & 0xFF;
	let B = (param >> 16) & 0xFF;
	let A = (param >> 24) & 0xFF;
	return (R << 24) | (G << 16) | (B << 8) | (A << 0);
}

class GFTextureCoord {
	constructor(data) {
		this.hash = data.readUint32();
		this.name = data.readByteLenString();
		
		let unitIndex = data.readUint8();
		
		/** @type {GFTextureMappingType} */
		this.mappingType = data.readUint8();
		
		this.scale = data.readVector2();
		this.rotation = data.readFloat();
		this.translation = data.readVector2();
		
		/** @type {GFTextureWrap} */
		this.wrapU = data.readUint32();
		this.wrapV = data.readUint32();
		
		/** @type {GFMagFilter} @type {GFMinFilter} */
		this.magFilter = data.readUint32(); //unsure
		this.minFilter = data.readUint32(); //unsure
		
		this.minLOD = data.readUint32(); //unsure
	}
	
	toThree() {
		const THREE = require('three');
		let obj = {
			name: this.name,
			
			offset: this.translation.clone(),
			repeat: this.scale.clone(),
			rotation: this.rotation,
			center: this.translation.clone().negate(),
			
			mapping: GFTextureMappingType.toThree(this.mappingType),
			wrapS: GFTextureWrap.toThree(this.wrapU),
			wrapT: GFTextureWrap.toThree(this.wrapV),
			magFilter: GFMagFilter.toThree(this.magFilter),
			minFilter: GFMinFilter.toThree(this.minFilter),
		};
		
		return obj;
	}
}

class GFMaterial {
	constructor(data) {
		/** @type {string} */	this.matName = '';
		/** @type {string} */	this.shaderName = '';
		/** @type {string} */	this.vtxShaderName = '';
		/** @type {string} */	this.fragShaderName = '';
		
		/** @type {uint} */		this.lut0HashId = 0;
		/** @type {uint} */		this.lut1HashId = 0;
		/** @type {uint} */		this.lut2HashId = 0;
		
		/** @type {int8} */		this.bumpTexture = 0;
		
		/** @type {uint8} */	this.constantAssignment = new Array(6);
		
		/** @type {RGBA} */		this.constantColor = new Array(6);
		/** @type {RGBA} */		this.specularColor = new Array(2);
		/** @type {RGBA} */		this.blendColor = 0;
		/** @type {RGBA} */		this.emissionColor = 0;
		/** @type {RGBA} */		this.ambientColor = 0;
		/** @type {RGBA} */		this.diffuseColor = 0;
		
		/** @type {int} */		this.edgeType = 0;
		/** @type {int} */		this.idEdgeEnable = 0;
		/** @type {int} */		this.edgeId = 0;
		/** @type {int} */		this.projectionType = 0;
		/** @type {float} */	this.rimPower = 0;
		/** @type {float} */	this.rimScale = 0;
		/** @type {float} */	this.phonePower = 0;
		/** @type {float} */	this.phoneScale = 0;
		/** @type {int} */		this.idEdgeOffsetEnable = 0;
		/** @type {int} */		this.edgeMapAlphaMask = 0;
		/** @type {int} */		this.bakeTexture = new Array(3);
		/** @type {int} */		this.bakeConstant = new Array(6);
		/** @type {int} */		this.vtxShaderType = 0;
		/** @type {float} */	this.shaderParam = new Array(4);
		
		/** @type {int} */		this.renderPriority = 0;
		/** @type {int} */		this.renderLayer = 0;
		
		/** @type {PICAColorOperation} */	this.colorOperation = null;
		/** @type {PICABlendFunction} */	this.blendFunction = null;
		/** @type {PICALogicalOp} */		this.logicalOperation = 0;
		/** @type {PICAAlphaTest} */		this.alphaTest = null;
		/** @type {PICAStencilTest} */		this.stencilTest = null;
		/** @type {PICAStencilOperation} */	this.stencilOperation = null;
		/** @type {PICADepthColorMask} */	this.depthColorMask = null;
		/** @type {PICAFaceCulling} */		this.faceCulling = 0;
		
		/** @type {PICALUTInAbs} */			this.lutInputAbsolute = 0;
		/** @type {PICALUTInSel} */			this.lutInputSelection = 0;
		/** @type {PICALUTInScale} */		this.lutInputScale = 0;
		
		/** @type {bool} */		this.colorBufferRead = false;
		/** @type {bool} */		this.colorBufferWrite = false;
		/** @type {bool} */		this.stencilBufferWrite = false;
		/** @type {bool} */		this.stencilBufferRead = false;
		/** @type {bool} */		this.depthBufferWrite = false;
		/** @type {bool} */		this.depthBufferRead = false;
		
		/** @type {GFTextureCoord[]} */	this.textureCoords = new Array(3);
		/** @type {RGBA[]} */			this.borderColor = new Array(3);
		/** @type {float[]} */			this.textureSources = new Array(4);
		
		if (!data) return this;
		
		let matSection = new GFSection(data);
		let pos = data.offset;
		
		let HNs = new Array(4);
		for (let i = 0; i < 4; i++) {
			HNs[i] = new GFHashName(data);
		}
		// TODO check hash names
		
		this.matName = HNs[0].name;
		this.shaderName = HNs[1].name;
		this.vtxShaderName = HNs[2].name;
		this.fragShaderName = HNs[3].name;
		
		this.lut0HashId = data.readUint32();
		this.lut1HashId = data.readUint32();
		this.lut2HashId = data.readUint32();
		data.readUint32(); //This seems to always be 0
		
		this.bumpTexture = data.readInt8();
		
		for (let i = 0; i < 6; i++) this.constantAssignment[i] = data.readUint8();
		data.skip(1);
		
		for (let i = 0; i < 6; i++) this.constantColor[i] = data.readRGBA();
		for (let i = 0; i < 2; i++) this.specularColor[i] = data.readRGBA();
		this.blendColor = data.readRGBA();
		this.emissionColor = data.readRGBA();
		this.ambientColor = data.readRGBA();
		this.diffuseColor = data.readRGBA();
		
		this.edgeType = data.readInt32();
		this.idEdgeEnable = data.readInt32();
		this.edgeId = data.readInt32();
		this.projectionType = data.readInt32();
		this.rimPower = data.readFloat32();
		this.rimScale = data.readFloat32();
		this.phonePower = data.readFloat32();
		this.phoneScale = data.readFloat32();
		this.idEdgeOffsetEnable = data.readInt32();
		this.edgeMapAlphaMask = data.readInt32();
		for (let i = 0; i < 3; i++) this.bakeTexture[i] = data.readInt32();
		for (let i = 0; i < 6; i++) this.bakeConstant[i] = data.readInt32();
		this.vtxShaderType = data.readInt32();
		for (let i = 0; i < 4; i++) this.shaderParam[i] = data.readFloat32();
		
		let unitsCount = data.readUint32();
		for (let i = 0; i < unitsCount; i++) {
			this.textureCoords[i] = new GFTextureCoord(data);
		}
		
		data.skipPadding();
		
		let commandsLen = data.readUint32();
		this.renderPriority = data.readUint32();
		this.unk001 = data.readUint32(); //Seems to be a 24 bit value
		this.renderLayer = data.readUint32();
		this.unk002 = data.readUint32(); //LUT 0 (Reflection R?) hash again?
		this.unk003 = data.readUint32(); //LUT 1 (Reflection G?) hash again?
		this.unk004 = data.readUint32(); //LUT 2 (Reflection B?) hash again?
		this.unk005 = data.readUint32(); //another hash?
		
		let commands = new Array(commandsLen >> 2);
		for (let i = 0; i < commands.length; i++) {
			commands[i] = data.readUint32();
		}
		
		let cmdReader = new PICACommandReader(commands);
		while (cmdReader.hasCommand) {
			let cmd = cmdReader.getCommand();
			let param = cmd.parameters[0];
			switch (cmd.register) {
				case PICARegister.GPUREG_TEXUNIT0_BORDER_COLOR: this.borderColor[0] = RGBA(param); break;
				case PICARegister.GPUREG_TEXUNIT1_BORDER_COLOR: this.borderColor[1] = RGBA(param); break;
				case PICARegister.GPUREG_TEXUNIT2_BORDER_COLOR: this.borderColor[2] = RGBA(param); break;
				
				case PICARegister.GPUREG_COLOR_OPERATION: this.colorOperation = new PICAColorOperation(param); break;
				case PICARegister.GPUREG_BLEND_FUNC: this.blendFunction = new PICABlendFunction(param); break;
				case PICARegister.GPUREG_LOGIC_OP: this.logicalOperation = (param & 0xF); break;
				case PICARegister.GPUREG_FRAGOP_ALPHA_TEST: this.alphaTest = new PICAAlphaTest(param); break;
				case PICARegister.GPUREG_STENCIL_TEST: this.stencilTest = new PICAStencilTest(param); break;
				case PICARegister.GPUREG_STENCIL_OP: this.stencilOperation = new PICAStencilOperation(param); break;
				case PICARegister.GPUREG_DEPTH_COLOR_MASK: this.depthColorMask = new PICADepthColorMask(param); break;
				case PICARegister.GPUREG_FACECULLING_CONFIG: this.faceCulling = (param & 3); break;
				
				case PICARegister.GPUREG_COLORBUFFER_READ:  this.colorBufferRead = (param & 0xF) == 0xF; break;
				case PICARegister.GPUREG_COLORBUFFER_WRITE: this.colorBufferWrite= (param & 0xF) == 0xF; break;
				
				case PICARegister.GPUREG_DEPTHBUFFER_READ:
					this.stencilBufferRead = (param & 1) != 0;
					this.depthBufferRead   = (param & 2) != 0;
					break;
				case PICARegister.GPUREG_DEPTHBUFFER_WRITE:
					this.stencilBufferWrite = (param & 1) != 0;
					this.depthBufferWrite   = (param & 2) != 0;
					break;
				
				case PICARegister.GPUREG_LIGHTING_LUTINPUT_ABS: this.lutInputAbsolute = new PICALUTInAbs(param); break;
				case PICARegister.GPUREG_LIGHTING_LUTINPUT_SELECT: this.lutInputSelection = new PICALUTInSel(param); break;
				case PICARegister.GPUREG_LIGHTING_LUTINPUT_SCALE: this.lutInputScalen = new PICALUTInScale(param); break;
			}
		}
		
		// These define the mapping used by each texture (?)
		// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/CtrH3D/Model/Material/H3DMaterialParams.cs#L383
		// 0-2 = UVMap[0-2]
		// 3 = CameraCubeEnvMap
		// 4 = CameraSphereEnvMap
		// 5 = ProjectionMap?
		// https://github.com/gdkchan/SPICA/blob/6c0b4083e26af3fbb7b3f6410dba15fd9b5c6e13/SPICA.Rendering/Model.cs#L206
		// https://github.com/gdkchan/SPICA/blob/421240ffd586293a242d31d602ca5e0a655a2bfb/SPICA.Rendering/VertexShader.cs#L62
		// https://github.com/gdkchan/SPICA/blob/03b37e23846eb3b2029f78ee8984a052929f833b/SPICA.Rendering/Resources/DefaultVertexShader.txt
		this.textureSources[0] = cmdReader.vtxShaderUniforms[0].x;
		this.textureSources[1] = cmdReader.vtxShaderUniforms[0].y;
		this.textureSources[2] = cmdReader.vtxShaderUniforms[0].z;
		this.textureSources[3] = cmdReader.vtxShaderUniforms[0].w;
		
		data.offset = pos + matSection.length;
	}
	
	toThree() {
		const THREE = require('three');
		let info = {};
		let opts = {
			name: this.matName,
			color: this.diffuseColor >> 8,
			emissive: this.emissionColor >> 8,
			
			colorWrite: this.colorBufferWrite,
			depthWrite: this.depthBufferWrite,
			depthTest: this.depthBufferRead,
			
			userData: info, //TODO: clear userData when saving off the pokemon
		};
		// if (this.alphaTest) Object.assign(opts, this.alphaTest.toThree());
		if (this.blendFunction) Object.assign(opts, this.blendFunction.toThree());
		if (this.colorOperation) Object.assign(opts, this.colorOperation.toThree());
		//TODO?
		
		// TODO: TexCoord[] holds the texture name to be used for this material
		// bumpTexture points to which of them is the bump/normal map
		// https://github.com/gdkchan/SPICA/blob/09d56f40581847e4a81a657c8f35af0ec64059ee/SPICA/Formats/GFL2/Model/GFModel.cs#L313
		if (this.textureCoords) {
			info.coodMap = new Array(3);
			if (this.textureCoords[0]) {
				info.map = this.textureCoords[0].toThree();
				info.coodMap[0] = 'map';
			}
			if (this.bumpTexture > -1) {
				info.normalMap = this.textureCoords[this.bumpTexture].toThree();
				info.coodMap[this.bumpTexture] = 'normalMap';
			}
		}
		
		info.fragmentShader = this.fragShaderName;
		info.vertexShader = this.vtxShaderName;
		
		// opts.skinning = true;
		// opts.lights = true;
		// opts.fog = true;
		// opts.wireframe = true;
		
		// return new THREE.ShaderMaterial(opts);
		return new THREE.MeshBasicMaterial(opts);
	}
}

module.exports = {
	GFMaterial,
	GFTextureCoord,
	GFTextureMappingType,
	GFTextureWrap,
	GFMinFilter,
	GFMagFilter,
};
