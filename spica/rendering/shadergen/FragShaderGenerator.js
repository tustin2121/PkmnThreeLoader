// https://github.com/gdkchan/SPICA/blob/6ffdfdc1ddf3b3614b9fda457ef9717194d6cf34/SPICA.Rendering/Shaders/FragmentShaderGenerator.cs

const { 
	PICATexEnvStage, PICATextureCombinerSource, PICALUTInput, PICALUTScale,
	PICATextureCombinerColorOp, PICATextureCombinerAlphaOp, PICATestFunc, 
	PICATextureCombinerMode,
} = require('../../pica/commands');
const { GFTextureMappingType } = require('../../gf/model');
const ShaderGenerator = require('./ShaderGenerator');

const FRAG_SHADER_BASE = `#version 150
precision highp float;
precision highp int;

uniform sampler2D LUTs[6];

uniform sampler2D Textures[3];

uniform sampler2D LightDistanceLUT[3];

uniform sampler2D LightAngleLUT[3];

uniform samplerCube TextureCube;

struct Light_t {
	vec3 Position;
	vec3 Direction;
	vec4 Ambient;
	vec4 Diffuse;
	vec4 Specular0;
	vec4 Specular1;
	float AttScale;
	float AttBias;
	float AngleLUTScale;
	int AngleLUTInput;
	int SpotAttEnb; //Spotlight Attribute Enable
	int DistAttEnb; //Diststant light Attribute Enabled
	int TwoSidedDiff;
	int Directional;
};

uniform int LightsCount;

uniform Light_t Lights[3];

uniform vec4 SAmbient;

vec3 QuatRotate(vec4 q, vec3 v) {
    return v + 2 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

float SampleLUT(int lidx, float idx, float s) {
	float x = (idx + 1) * 0.5;
	float r = texture(LUTs[lidx], vec2(x, 0)).r;

	return min(r * s, 1);
}

//SPICA auto-generated Fragment Shader
uniform vec4 u_EmissionColor;
uniform vec4 u_AmbientColor;
uniform vec4 u_DiffuseColor;
uniform vec4 u_Specular0Color;
uniform vec4 u_Specular1Color;
uniform vec4 u_Constant0Color;
uniform vec4 u_Constant1Color;
uniform vec4 u_Constant2Color;
uniform vec4 u_Constant3Color;
uniform vec4 u_Constant4Color;
uniform vec4 u_Constant5Color;

in vec4 QuatNormal;
in vec4 Color;
in vec4 TexCoord0;
in vec4 TexCoord1;
in vec4 TexCoord2;
in vec4 View;

layout(location=0) out vec4 Output;
`;

class FragShaderGenerator extends ShaderGenerator {
	/**
	 * @param {ShaderBinary} shBin -
	 */
	constructor(shBin, { shader, mat }) {
		super(shBin);
		
		/** @type {GFShader} */
		this.shader = shader
		/** @type {GFMaterial} */
		this.mat = mat;
		
		/** @type {string[]} */
		this.sb = null;
		/** @type {bool[]} */
		this.hasTexColor = [];
	}
	
	append(...str) {
		this.sb.push(...(str.map(x=>'\t'+x)));
	}
	
	getFragShader() {
		let index = 0;
		let hasFragColors = false;
		this.hasTexColor = [false, false, false];
		
		this.sb = [
			FRAG_SHADER_BASE,
			`void main(){`,
			`\tvec4 Previous;`,
			`\tvec4 CombBuffer = ${vec4FromColor(this.shader.texEnvBufferColor)};`,
		];
		
		for (let stage of this.shader.texEnvStages) {
			let hasColor = !stage.isColorPassThrough;
			let hasAlpha = !stage.isAlphaPassThrough;
			
			let colorArgs = [];
			let alphaArgs = [];
			let constant = (()=>{
				let i = (this.mat.constantColors >> (index++ * 4)) & 0xF;
				if (i > 5) i = 0;
				return `u_Constant${i}Color`;
			})();
			
			for (let p = 0; p < 3; p++) {
				// check if the fragment lighting colors are used
				if (!hasFragColors && (
					stage.source.color[p] == PICATextureCombinerSource.FragmentPrimaryColor ||
					stage.source.alpha[p] == PICATextureCombinerSource.FragmentPrimaryColor ||
					stage.source.color[p] == PICATextureCombinerSource.FragmentSecondaryColor ||
					stage.source.alpha[p] == PICATextureCombinerSource.FragmentSecondaryColor
				)) {
					this._genFragColors();
					hasFragColors = true;
				}
				
				// Check if any of the texture units are used
				for (let unit = 0; unit < 3; unit++) {
					if (this.hasTexColor[unit] && (
						stage.source.color[p] == PICATextureCombinerSource.Texture0 + unit ||
						stage.source.alpha[p] == PICATextureCombinerSource.Texture0 + unit
					)) {
						this._genTexColor(unit);
						this.hasTexColor[unit] = true;
					}
				}
				
				let colorArg = getCombinerSource(stage.source.color[p], constant);
				let alphaArg = getCombinerSource(stage.source.alpha[p], constant);
				
				switch (stage.operand.color[p] & ~1) {
					case PICATextureCombinerColorOp.Alpha:	colorArg = `${colorArg}.aaaa`; break;
					case PICATextureCombinerColorOp.Red: 	colorArg = `${colorArg}.rrrr`; break;
					case PICATextureCombinerColorOp.Green:	colorArg = `${colorArg}.gggg`; break;
					case PICATextureCombinerColorOp.Blue:	colorArg = `${colorArg}.bbbb`; break;
				}
				switch (stage.operand.alpha[p] & ~1) {
					case PICATextureCombinerAlphaOp.Alpha:	alphaArg = `${alphaArg}.a`; break;
					case PICATextureCombinerAlphaOp.Red: 	alphaArg = `${alphaArg}.r`; break;
					case PICATextureCombinerAlphaOp.Green:	alphaArg = `${alphaArg}.g`; break;
					case PICATextureCombinerAlphaOp.Blue:	alphaArg = `${alphaArg}.b`; break;
				}
				
				if (stage.operand.color[p] & 1) colorArg = `1 - ${colorArg}`;
				if (stage.operand.alpha[p] & 1) alphaArg = `1 - ${alphaArg}`;
				
				colorArgs[p] = colorArg;
				alphaArgs[p] = alphaArg;
			}
			
			if (hasColor) this._genCombinerColor(stage, colorArgs);
			if (hasAlpha) this._genCombinerAlpha(stage, alphaArgs);
			
			let colorScale = 1 << stage.scale.color;
			let alphaScale = 1 << stage.scale.alpha;
			
			if (colorScale != 1) this.append(`Output.rgb = min(Output.rgb * ${colorScale}, 1);`);
			if (alphaScale != 1) this.append(`Output.a = min(Output.a * ${alphaScale}, 1);`);
			
			if (stage.updateColorBuffer) this.append(`CombBuffer.rgb = Previous.rgb;`);
			if (stage.updateAlphaBuffer) this.append(`CombBuffer.a = Previous.a;`);
			if (index < 6 && (hasColor || hasAlpha)) this.append(`Previous = Output;`);
		}
		
		if (this.mat.alphaTest && this.mat.alphaTest.enabled) {
			let ref = (this.mat.alphaTest.reference / 255).toString();
			
			//Note: This is the condition to pass the test, so we actually inverse to discard
			switch (this.mat.alphaTest.function) {
				case PICATestFunc.Never:	this.append(`discard;`);
				case PICATestFunc.Equal:	this.append(`if (Output.a != ${ref}) discard;`);
				case PICATestFunc.Notequal:	this.append(`if (Output.a == ${ref}) discard;`);
				case PICATestFunc.Less:		this.append(`if (Output.a >= ${ref}) discard;`);
				case PICATestFunc.Lequal:	this.append(`if (Output.a > ${ref}) discard;`);
				case PICATestFunc.Greater:	this.append(`if (Output.a <= ${ref}) discard;`);
				case PICATestFunc.Gequal:	this.append(`if (Output.a < ${ref}) discard;`);
			}
		}
		
		this.sb.push('}');
		return this.sb.join('\n');
	}
	
	_genFragColors() {
		// See Model and Mesh SPICA classes for the LUT mappings
		let dist0 = getLUTInput(this.mat.lutInputSelection.dist0, this.mat.lutInputScale.dist0, 0);
		let dist1 = getLUTInput(this.mat.lutInputSelection.dist1, this.mat.lutInputScale.dist1, 1);
		let fresnel = getLUTInput(this.mat.lutInputSelection.fresnel, this.mat.lutInputScale.fresnel, 2);
		let reflectR = getLUTInput(this.mat.lutInputSelection.reflectR, this.mat.lutInputScale.reflectR, 3);
		let reflectG = getLUTInput(this.mat.lutInputSelection.reflectG, this.mat.lutInputScale.reflectG, 4);
		let reflectB = getLUTInput(this.mat.lutInputSelection.reflectB, this.mat.lutInputScale.reflectB, 5);
		const color = `u_EmissionColor + u_AmbientColor * SAmbient`;
		
		this.append(`vec4 FragPriColor = vec4((${color}).rgb, 1);`);
		this.append(`vec4 FragSecColor = vec4(0, 0, 0, 1);`);
		
		// BumpMode is always "AsBump" for GF type, so we're simplifying from the original
		if (!this.hasTexColor[this.mat.bumpTexture]) {
			this._genTexColor(this.mat.bumpTexture);
			this.hasTexColor[this.mat.bumpTexture] = true;
		}
		let bumpColor = `Color${this.mat.bumpTexture}.xyz * 2 - 1`;
		this.append(`vec3 SurfNormal = ${bumpColor};`);
		this.append(`vec3 SurfTangent = vec3(1, 0, 0);`);
		// GF type does not renormalize bump normals, so cutting from original
		
		const halfProj = `Half - Normal / dot(Normal, Normal) * dot(Normal, Half)`;
		const DistAttIdx = `clamp(length(-View.xyz - Lights[i].Position) * Lights[i].AttScale + Lights[i].AttBias, 0, 1)`;
		this.sb.push(
`	vec4 NormQuat = normalize(QuatNormal);
	vec3 Normal = vec3 Normal = QuatRotate(NormQuat, SurfNormal);
	vec3 Tangent = QuatRotate(NormQuat, SurfTangent);
	
	for (int i = 0; i < LightsCount; i++) {
		vec3 Light = (Lights[i].Directional != 0) ? normalize(Lights[i].Position) : normalize(Lights[i].Position + View.xyz);
		vec3 Half = normalize(normalize(View.xyz) + Light);
		float CosNormalHalf = dot(Normal, Half);
		float CosViewHalf = dot(normalize(View.xyz), Half);
		float CosNormalView = dot(Normal, normalize(View.xyz));
		float CosLightNormal = dot(Light, Normal);
		float CosLightSpot = dot(Light, Lights[i].Direction);
		float CosPhi = dot(${halfProj}, Tangent);
		float ln = (Lights[i].TwoSidedDiff != 0) ? abs(CosLightNormal) : max(CosLightNormal, 0);
		float SpotAtt = 1;
		
		if (Lights[i].SpotAttEnb != 0) {
			float SpotIndex;
			
			switch (Lights[i].AngleLUTInput) {
				case 0: SpotIndex = CosNormalHalf; break;
				case 1: SpotIndex = CosViewHalf; break;
				case 2: SpotIndex = CosNormalView; break;
				case 3: SpotIndex = CosLightNormal; break;
				case 4: SpotIndex = CosLightSpot; break;
				case 5: SpotIndex = CosPhi; break;
			}
			
			SpotAtt = SampleLUT(6 + i * 2, SpotIndex, Lights[i].AngleLUTScale);
		}
		
		float DistAtt = 1;
		
		if (Lights[i].DistAttEnb != 0) {
			DistAtt = SampleLUT(7 + i * 2, ${DistAttIdx}, 1);
		}
`
		);
		
		let specular0Color = `u_Specular0Color`;
		let specular1Color = `r`;
		// GF models only use LUT Reflection, so that's the only if statement we're adding here
		this.append(`\tvec4 r = vec4(${reflectR}, ${reflectG}, ${reflectB}, 1);`);
		
		this.sb.push(
`		vec4 Diffuse =
			u_AmbientColor * Lights[i].Ambient +
			u_DiffuseColor * Lights[i].Diffuse * clamp(ln, 0, 1);
		vec4 Specular = ${specular0Color} * Lights[i].Specular0 + ${specular1Color} * Lights[i].Specular1;
		FragPriColor.rgb += Diffuse.rgb * SpotAtt * DistAtt;
		FragSecColor.rgb += Specular.rgb * SpotAtt * DistAtt;
`
		);
		
		// No fresnel selectors
		
		this.append(`}`); //end light loop
		this.append(`FragPriColor = clamp(FragPriColor, 0, 1);`);
		this.append(`FragSecColor = clamp(FragSecColor, 0, 1);`);
		this.append(``);
	}
	
	_genTexColor(index) {
		let texCoord = this.mat.textureCoords[index];
		let texture;
		
		if (index == 0) {
			switch (texCoord.mappingType) {
				case GFTextureMappingType.CameraCubeEnvMap:
					texture = `texture(TextureCube, TexCoord0.xyz)`;
					break;
				case GFTextureMappingType.ProjectionMap:
					texture = `textureProj(Textures[0], TexCoord0)`;
					break;
				default:
					texture = `texture(Textures[0], TexCoord0.xy)`;
					break;
			}
		} else {
			let coordIndex = index;
			// Default H3DTexCoordConfig??? no modification needed
			switch (coordIndex) {
				default:
				case 0: texture = `texture(Textures[${index}], TexCoord0.xy);`; break;
				case 1: texture = `texture(Textures[${index}], TexCoord1.xy);`; break;
				case 2: texture = `texture(Textures[${index}], TexCoord2.xy);`; break;
			}
		}
		this.append(`vec4 Color${index} = ${texture};`);
	}
	
	_genCombinerColor(stage, colorArgs) {
		switch (stage.combiner.alpha) {
			case PICATextureCombinerMode.Replace:
				return this.append(`Output.rgb = (${colorArgs[0]}).rgb;`);
			case PICATextureCombinerMode.Modulate:
				return this.append(`Output.rgb = (${colorArgs[0]}).rgb * (${colorArgs[1]}).rgb;`);
			case PICATextureCombinerMode.Add:
				return this.append(`Output.rgb = min((${colorArgs[0]}).rgb + (${colorArgs[1]}).rgb, 1);`);
			case PICATextureCombinerMode.AddSigned:
				return this.append(`Output.rgb = clamp((${colorArgs[0]}).rgb + (${colorArgs[1]}).rgb - 0.5, 0, 1);`);
			case PICATextureCombinerMode.Interpolate:
				return this.append(`Output.rgb = mix((${colorArgs[1]}).rgb, (${colorArgs[0]}).rgb, (${colorArgs[2]}).rgb);`);
			case PICATextureCombinerMode.Subtract:
				return this.append(`Output.rgb = max((${colorArgs[0]}).rgb - (${colorArgs[1]}).rgb, 0);`);
			case PICATextureCombinerMode.DotProduct3Rgb:
				return this.append(`Output.rgb = vec3(min(dot((${colorArgs[0]}).rgb, (${colorArgs[1]}).rgb), 1));`);
			case PICATextureCombinerMode.DotProduct3Rgba:
				return this.append(`Output.rgb = vec3(min(dot((${colorArgs[0]}), (${colorArgs[1]})), 1));`);
			case PICATextureCombinerMode.MultAdd:
				return this.append(`Output.rgb = min((${colorArgs[0]}).rgb * (${colorArgs[1]}).rgb + (${colorArgs[2]}).rgb, 1);`);
			case PICATextureCombinerMode.AddMult:
				return this.append(`Output.rgb = min((${colorArgs[0]}).rgb + (${colorArgs[1]}).rgb, 1) * (${colorArgs[2]}).rgb;`);
		}
	}
	
	_genCombinerAlpha(stage, alphaArgs) {
		switch (stage.combiner.alpha) {
			case PICATextureCombinerMode.Replace:
				return this.append(`Output.a = (${alphaArgs[0]});`);
			case PICATextureCombinerMode.Modulate:
				return this.append(`Output.a = (${alphaArgs[0]}) * (${alphaArgs[1]});`);
			case PICATextureCombinerMode.Add:
				return this.append(`Output.a = min((${alphaArgs[0]}) + (${alphaArgs[1]}), 1);`);
			case PICATextureCombinerMode.AddSigned:
				return this.append(`Output.a = clamp((${alphaArgs[0]}) + (${alphaArgs[1]}) - 0.5, 0, 1);`);
			case PICATextureCombinerMode.Interpolate:
				return this.append(`Output.a = mix((${alphaArgs[1]}), (${alphaArgs[0]}), (${alphaArgs[2]}));`);
			case PICATextureCombinerMode.Subtract:
				return this.append(`Output.a = max((${alphaArgs[0]}) - (${alphaArgs[1]}), 0);`);
			case PICATextureCombinerMode.DotProduct3Rgb:
				return this.append(`Output.a = min(dot(vec3(${alphaArgs[0]}), vec3(${alphaArgs[1]})), 1);`);
			case PICATextureCombinerMode.DotProduct3Rgba:
				return this.append(`Output.a = min(dot(vec4(${alphaArgs[0]}), vec4(${alphaArgs[1]})), 1);`);
			case PICATextureCombinerMode.MultAdd:
				return this.append(`Output.a = min((${alphaArgs[0]}) * (${alphaArgs[1]}) + (${alphaArgs[2]}), 1);`);
			case PICATextureCombinerMode.AddMult:
				return this.append(`Output.a = min((${alphaArgs[0]}) + (${alphaArgs[1]}), 1) * (${alphaArgs[2]});`);
		}
	}
}

module.exports = { FragShaderGenerator };

function getLUTInput(input, scale, LUT) {
	let inputStr = (()=>{
		switch (input) {
			default:
			case PICALUTInput.CosNormalHalf:	return 'CosNormalHalf';
			case PICALUTInput.CosViewHalf:		return 'CosViewHalf';
			case PICALUTInput.CosNormalView:	return 'CosNormalView';
			case PICALUTInput.CosLightNormal:	return 'CosLightNormal';
			case PICALUTInput.CosLightSpot:		return 'CosLightSpot';
			case PICALUTInput.CosPhi:			return 'CosPhi';
		}
	})();
	let output = `texture(LUTs[${LUT}], vec2((${inputStr} + 1) * 0.5)).r`;
	
	if (scale != PICALUTScale.One) {
		let scaleStr = PICALUTScale.toFloat(scale).toString();
		output = `min(${output} * ${scaleStr}, 1)`;
	}
	return output;
}

/**
 * 
 * @param {PICATextureCombinerSource} source 
 * @param {string} constant 
 */
function getCombinerSource(source, constant) {
	switch (source) {
		default:
		case PICATextureCombinerSource.PrimaryColor: return `Color`;
		case PICATextureCombinerSource.FragmentPrimaryColor: return 'FragPriColor';
		case PICATextureCombinerSource.FragmentSecondaryColor: return 'FragSecColor';
		case PICATextureCombinerSource.Texture0: return 'Color0';
		case PICATextureCombinerSource.Texture1: return 'Color1';
		case PICATextureCombinerSource.Texture2: return 'Color2';
		case PICATextureCombinerSource.PreviousBuffer: return 'CombBuffer';
		case PICATextureCombinerSource.Constant: return constant;
		case PICATextureCombinerSource.Previous: return 'Previous';
	}
}

function vec4FromColor(color) {
	return `vec4(${color.r/255}, ${color.g/255}, ${color.b/255}, ${color.a/255})`;
}
