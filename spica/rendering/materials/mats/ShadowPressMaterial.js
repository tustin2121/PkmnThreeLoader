// 
//

const { 
	UniformsLib, UniformsUtils, ShaderLib, 
	Vector2, Matrix3, Color, 
	OneMinusSrcAlphaFactor, SrcAlphaFactor, CustomBlending, AddEquation,
} = require('three');
const { PICATestFunc, PICAStencilOp } = require('../../../pica/commands/PICATests');

const { CommonMaterial } = require('./CommonMaterial');

ShaderLib['pkmnShadow'] = {
	uniforms: UniformsUtils.merge([
		UniformsLib.common,
		UniformsLib.fog,
		UniformsLib.lights,
		UniformsLib.pkmnCommon,
		UniformsLib.pkmnShadowPress
	]),
	
	vertexShader: require('../shaders/ShadowPress.vtx.glsl'),
	fragmentShader: require('../shaders/ShadowPress.frg.glsl'),
};

class ShadowPressMaterial extends CommonMaterial {
	constructor(params) {
		super(params);
		
		this.type = 'ShadowPressMaterial';
		this.parentModel = null;
		
		this.defines = Object.assign(this.defines, {
			'TEX_BLEND_FUNC': 'texDefaultBlend',
			'USE_DETAILMAP': false,
			'USE_OVERLAYMAP': false,
			'UV_MAP': 'vUv',
			'UV_ALPHAMAP': 'vUv',
			'UV_ENVMAP': 'vUv',
		});
		this.uniforms = UniformsUtils.clone(ShaderLib.pkmnShadow.uniforms);
		
		this.defaultAttributeValues = Object.assign(this.defaultAttributeValues, {
			color: [1,1,1],
			normal: [0,1,0],
		});
		
		this.vertexShader = ShaderLib.pkmnShadow.vertexShader;
		this.fragmentShader = ShaderLib.pkmnShadow.fragmentShader;
		
		this.blending = CustomBlending;
		this.blendEquation = AddEquation;
		this.blendEquationAlpha = AddEquation;
		this.blendSrc = SrcAlphaFactor;
		this.blendSrcAlpha = SrcAlphaFactor;
		this.blendDst = OneMinusSrcAlphaFactor;
		this.blendDstAlpha = OneMinusSrcAlphaFactor;
		
		this.stencilTest = true;
		this.stencilFunc = [ PICATestFunc.toThree(PICATestFunc.Equal), 0, 0x01 ];
		this.stencilOp = [ 
			PICAStencilOp.toThree(PICAStencilOp.Keep), 
			PICAStencilOp.toThree(PICAStencilOp.Keep), 
			PICAStencilOp.toThree(PICAStencilOp.Increment), 
		];
		
		this.color = new Color( 0x000000 ); // emissive

		this.alphaMap = null;

		this.wireframe = false;
		this.wireframeLinewidth = 1;
		this.wireframeLinecap = 'round';
		this.wireframeLinejoin = 'round';

		this.skinning = false;
		this.morphTargets = false;

		this.lights = true;

		this.setValues(params);
	}
	
	// Because we can't get automatic support for this stuff from the renderer...
	onBeforeRender(args) {
		const { renderer, material } = args;
		super.onBeforeRender(args);
		if (material.parentModel) {
			if (material.uniforms.shadowDirection) {
				if (material.parentModel._shadowLight) {
					let vec = material.parentModel._shadowLight.position;
					material.uniforms.shadowDirection.value.copy(vec);
					material.uniforms.shadowDirection.value.normalize();
				} else {
					material.uniforms.shadowDirection.value = material.parentModel._shadowDirection;
				}
			}
			if (material.uniforms.shadowPlane) {
				let plane = material.parentModel._shadowPlane;
				material.uniforms.shadowPlane.value.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
			}
		}
	}
	
	get blendFunction() { return this.defines['TEX_BLEND_FUNC']; }
	set blendFunction(val) { this.defines['TEX_BLEND_FUNC'] = val; }
	
	/**
	 * 
	 * @param {GFMaterial} gfmat - Material to convert
	 * @param {GFTexture[]} textures - Hash of textures to use
	 */
	static fromGFMaterial(gfmat, textures) {
		let info = {
			fragmentShader: gfmat.fragShaderName,
			vertexShader: gfmat.vtxShaderName,
		};
		let opts = {
			name: gfmat.matName,
			color: gfmat.diffuseColor >> 8,
			emissive: gfmat.emissionColor >> 8,
			
			colorWrite: gfmat.colorBufferWrite,
			depthWrite: gfmat.depthBufferWrite,
			depthTest: gfmat.depthBufferRead,
			
			userData: info, //TODO: clear userData when saving off the pokemon
		};
		if (gfmat.alphaTest) Object.assign(opts, gfmat.alphaTest.toThree());
		if (gfmat.blendFunction) Object.assign(opts, gfmat.blendFunction.toThree());
		if (gfmat.colorOperation) Object.assign(opts, gfmat.colorOperation.toThree());
		if (gfmat.stencilTest && gfmat.stencilTest.enabled) {
			Object.assign(opts, gfmat.stencilTest.toThree());
			Object.assign(opts, gfmat.stencilOperation.toThree());
		}
		
		return new ShadowPressMaterial(opts);
	}
}
// ShadowPressMaterial.prototype.isMeshBasicMaterial = true;
ShadowPressMaterial.matchNames = ['PressShadow', 'PressShadowGRE'];

module.exports = { ShadowPressMaterial };
