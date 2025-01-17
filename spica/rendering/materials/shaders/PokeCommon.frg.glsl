// "Common" fragment shader - most commonly used shader for pokemon
#define PHONG

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>

varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vUv3;

varying mat4 vSkinMatrix;

#include <map_pars_fragment>
// #ifdef USE_DETAILMAP
// uniform sampler2D detailMap;
// #endif
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>

#define GRAD_HIGH 0.6
#define GRAD_LOW 0.5
#define GRAD_SHADOW 0.7
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	// dotNL will be from -1.0 to 1.0
	float dotNL = dot( normal, lightDirection );
	float coord = dotNL * 0.5 + 0.5;
	if (coord > GRAD_HIGH) return vec3(1.0);
	if (coord < GRAD_LOW) return vec3(GRAD_SHADOW);
	return vec3( GRAD_SHADOW + ((coord-GRAD_LOW) * 3.0) );
	// return ( coord.x < 0.4 ) ? vec3( 0.7 ) : vec3( 1.0 );
}

#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_phong_pars_fragment>
#include <bumpmap_pars_fragment>
uniform sampler2D normalMap;
uniform vec2 normalScale;
uniform mat3 normalMatrix; // always ObjectSpace
#include <specularmap_pars_fragment>

uniform float time;
uniform float rimEnable;
uniform float rimPower;
uniform float rimScale;
uniform vec3 rimColor;

vec3 calculateRimLight(vec3 normal) {
	float rim = 1.0 - clamp( dot( normalize(vViewPosition), normal), 0.0, 1.0);
	float scale = rimScale * ((sin(time*3.5) + 1.5) * 15.0);
	float power = rimPower + (cos(time*3.5) + 1.0) * 4.0;
	return rimColor * (pow(rim, power) * scale) * rimEnable;
}

void main() {
	vec4 glDebugColor;

	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

#ifdef USE_MAP
	vec4 texelColor = texture2D( map, UV_MAP );
	texelColor = mapTexelToLinear( texelColor );
	diffuseColor *= texelColor;
#endif
// #ifdef USE_DETAILMAP
// 	vec4 texelColor = texture2D( detailMap, UV_DETAILMAP );
// 	texelColor = mapTexelToLinear( texelColor );
// 	diffuseColor *= texelColor;
// #endif
	#include <color_fragment>
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, UV_ALPHAMAP ).a;
#endif

#ifdef ALPHATEST
	if ( diffuseColor.a OP_ALPHATEST ALPHATEST ) discard;
#endif
	
	float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 0.0;
#endif
	
	vec3 normal = normalize( vNormal );
	// glDebugColor = vec4(vec3( dot(normalize(vViewPosition), normal) ), 1);
	// normal = normal * 2.0 - 1.0;
#ifdef USE_NORMALMAP
	// Always use Object Space Normal Maps
	normal = texture2D( normalMap, UV_NORMALMAP ).xyz * 2.0 - 1.0; // overrides both flatShading and attribute normals
	normal = normalize( normalMatrix * mat3(vSkinMatrix) * normal );
#endif
	totalEmissiveRadiance = calculateRimLight(normal);
	
	#include <emissivemap_fragment>
	
	glDebugColor = vec4(normal, 1.0);

	// accumulation
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// modulation
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

	#include <envmap_fragment>

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
	
	// gl_FragColor = glDebugColor;
}
