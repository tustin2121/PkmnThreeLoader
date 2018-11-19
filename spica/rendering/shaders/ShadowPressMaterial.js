// 
//

const { 
	UniformsLib, UniformsUtils, ShaderLib, 
	Vector2, Matrix3, Color, 
	OneMinusSrcAlphaFactor, SrcAlphaFactor, CustomBlending, AddEquation,
} = require('three');

const { CommonMaterial } = require('./CommonMaterial');

ShaderLib['pkmnShadow'] = {
	uniforms: UniformsUtils.merge([
		UniformsLib.common,
		UniformsLib.fog,
		UniformsLib.lights,
		UniformsLib.pkmnCommon,
		UniformsLib.pkmnShadowPress
	]),
	
	vertexShader: require('./ShadowPress.vtx.glsl'),
	fragmentShader: require('./ShadowPress.frg.glsl'),
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
				material.uniforms.shadowDirection.value = material.parentModel._shadowDirection;
			}
		}
		const gl = renderer.context;
		const stencil = renderer.state.buffers.stencil;
		
		stencil.setTest(true);
		stencil.setFunc( gl.EQUAL, 0, 0x0F );
		stencil.setOp( gl.KEEP, gl.KEEP, gl.INCR );
	}
	
	onAfterRender(args) {
		const { renderer } = args;
		super.onAfterRender(args);
		const gl = renderer.context;
		const stencil = renderer.state.buffers.stencil;
		
		stencil.setTest(false);
		stencil.setFunc( gl.ALWAYS, 1, 0x0F );
		stencil.setOp( gl.KEEP, gl.KEEP, gl.KEEP );
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
		
		// TexCoord[] holds the texture name to be used for this material
		// bumpTexture points to which of them is the bump/normal map
		// https://github.com/gdkchan/SPICA/blob/09d56f40581847e4a81a657c8f35af0ec64059ee/SPICA/Formats/GFL2/Model/GFModel.cs#L313
		// if (gfmat.textureCoords) {
		// 	opts.coordMap = new Array(3);
		// 	info.texCoords = new Array(3);
		// 	if (gfmat.textureCoords[0]) {
		// 		let tc = gfmat.textureCoords[0].toThree();
		// 		info.texCoords[0] = tc;
		// 		opts.map = textures[tc.name].toThree(tc);
		// 		opts.coordMap[0] = 'map';
		// 	}
		// 	if (gfmat.textureCoords[1]) {
		// 		let tc = gfmat.textureCoords[0].toThree();
		// 		info.texCoords[1] = tc;
		// 		opts.detailMap = textures[tc.name].toThree(tc);
		// 		opts.coordMap[1] = 'detailMap';
		// 	}
		// 	if (gfmat.textureCoords[2]) {
		// 		let tc = gfmat.textureCoords[0].toThree();
		// 		info.texCoords[2] = tc;
		// 		opts.overlayMap = textures[tc.name].toThree(tc);
		// 		opts.coordMap[2] = 'overlayMap';
		// 	}
		// 	if (gfmat.bumpTexture > -1) {
		// 		let tc = info.texCoords[gfmat.bumpTexture];
		// 		opts.normalMap = textures[tc.name].toThree(tc);
		// 		opts.alphaMap = opts.normalMap;
		// 		opts.coordMap[gfmat.bumpTexture] = 'normalMap';
		// 	}
		// }
		
		return new ShadowPressMaterial(opts);
	}
}
// ShadowPressMaterial.prototype.isMeshBasicMaterial = true;
ShadowPressMaterial.matchNames = ['PressShadow', 'PressShadowGRE'];

module.exports = { ShadowPressMaterial };
