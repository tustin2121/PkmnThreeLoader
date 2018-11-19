// 
//

const { 
	ShaderMaterial, UniformsLib, UniformsUtils, ShaderLib, 
	Vector2, Matrix3, Color, 
	TangentSpaceNormalMap, MultiplyOperation, BackSide,
} = require('three');

const { CommonMaterial } = require('./CommonMaterial');

ShaderLib['pkmnBattlefield'] = {
	uniforms: UniformsUtils.merge([
		UniformsLib.common,
		UniformsLib.specularmap,
		UniformsLib.envmap,
		UniformsLib.lightmap,
		UniformsLib.fog,
		UniformsLib.pkmnCommon,
		UniformsLib.pkmnMultiMap,
	]),
	
	vertexShader: require('./Battlefield.vtx.glsl'),
	fragmentShader: require('./Battlefield.frg.glsl'),
};

const BLENDS = {
	'BATTLE_bg_blend01GRE': 'texBlendGrass',
	'btl_G_kusa_kusa01_Manual': 'texGrassWave',
	'BATTLE_bg_default01GRE': 'texDefaultBlend',
};

class BattlefieldMaterial extends CommonMaterial {
	constructor(params) {
		super(params);
		
		this.type = 'BattlefieldMaterial';
		this.parentModel = null;
		
		this.defines = Object.assign(this.defines, {
			'TEX_BLEND_FUNC': 'texDefaultBlend',
			'USE_DETAILMAP': false,
			'USE_OVERLAYMAP': false,
			'UV_MAP': 'vUv',
			'UV_ALPHAMAP': 'vUv',
			'UV_ENVMAP': 'vUv',
		});
		this.uniforms = UniformsUtils.clone(ShaderLib.pkmnBattlefield.uniforms);
		
		this.defaultAttributeValues = Object.assign(this.defaultAttributeValues, {
			color: [1,1,1],
			normal: [0,1,0],
		});
		
		this.vertexShader = ShaderLib.pkmnBattlefield.vertexShader;
		this.fragmentShader = ShaderLib.pkmnBattlefield.fragmentShader;
		
		this.color = new Color( 0xffffff ); // emissive

		this.map = null;
		this.detailMap = null;
		this.overlayMap = null;

		this.lightMap = null;
		this.lightMapIntensity = 1.0;

		this.specularMap = null;

		this.alphaMap = null;

		this.envMap = null;
		this.combine = MultiplyOperation;
		this.reflectivity = 1;
		this.refractionRatio = 0.98;

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
		const { material } = args;
		super.onBeforeRender(args);
		
		if (material.detailMap) {
			material.uniforms.detailMap.value = material.detailMap;
		}
		if (material.overlayMap) {
			material.uniforms.overlayMap.value = material.overlayMap;
		}
		material.defines['USE_DETAILMAP'] = !!material.detailMap;
		material.defines['USE_OVERLAYMAP'] = !!material.overlayMap;
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
		
		// TexCoord[] holds the texture name to be used for this material
		// bumpTexture points to which of them is the bump/normal map
		// https://github.com/gdkchan/SPICA/blob/09d56f40581847e4a81a657c8f35af0ec64059ee/SPICA/Formats/GFL2/Model/GFModel.cs#L313
		if (gfmat.textureCoords) {
			opts.coordMap = new Array(3);
			info.texCoords = new Array(3);
			if (gfmat.textureCoords[0]) {
				let tc = gfmat.textureCoords[0].toThree();
				info.texCoords[0] = tc;
				opts.map = textures[tc.name].toThree(tc);
				opts.coordMap[0] = 'map';
			}
			if (gfmat.textureCoords[1]) {
				let tc = gfmat.textureCoords[0].toThree();
				info.texCoords[1] = tc;
				opts.detailMap = textures[tc.name].toThree(tc);
				opts.coordMap[1] = 'detailMap';
			}
			if (gfmat.textureCoords[2]) {
				let tc = gfmat.textureCoords[0].toThree();
				info.texCoords[2] = tc;
				opts.overlayMap = textures[tc.name].toThree(tc);
				opts.coordMap[2] = 'overlayMap';
			}
			if (gfmat.bumpTexture > -1) {
				let tc = info.texCoords[gfmat.bumpTexture];
				opts.normalMap = textures[tc.name].toThree(tc);
				opts.alphaMap = opts.normalMap;
				opts.coordMap[gfmat.bumpTexture] = 'normalMap';
			}
		}
		
		opts.blendFunction = BLENDS[info.fragmentShader] || BLENDS[info.vertexShader] || 'texDefaultBlend';
		
		return new BattlefieldMaterial(opts);
	}
}
BattlefieldMaterial.prototype.isMeshBasicMaterial = true;
BattlefieldMaterial.matchNames = ['BattleFieldShader'];

module.exports = { BattlefieldMaterial };