// "Battlefield" fragment shader - most commonly used shader for battlefield geometry

uniform vec3 diffuse;
uniform float opacity;

#ifndef USE_ENVMAP
varying vec3 vNormal;
#endif

#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>

#ifdef USE_MAP
uniform sampler2D map;
#endif
#ifdef USE_DETAILMAP
uniform sampler2D detailMap;
#endif
#ifdef USE_OVERLAYMAP
uniform sampler2D overlayMap;
#endif

#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>

// BATTLE_bg_blend01GRE
vec4 texBlendGrass() {
	vec4 colorTex0 = mapTexelToLinear( texture2D( map, vUv ) );
	vec4 colorTex1 = mapTexelToLinear( texture2D( detailMap, vUv2 ) );
	vec4 diffuseColor = mix(colorTex1.rgb, colorTex0.rgb, vColor.a);
	diffuseColor = diffuseColor * diffuse * vColor;
	diffuseColor.a = vColor.a;
	return diffuseColor;
}

// btl_G_kusa_kusa01_Manual
vec4 texGrassWave() {
	vec4 colorTex0 = mapTexelToLinear( texture2D( map, vUv ) );
	vec4 diffuseColor = colorTex0 * vColor;
	diffuseColor *= diffuse;
	diffuseColor.a = min(vColor.a * colorTex0.a + vColor.a, 1);
	return diffuseColor;
}

// BATTLE_bg_default01GRE
vec4 texDefaultBlend() {
	vec4 colorTex0 = mapTexelToLinear( texture2D( map, vUv ) );
	vec4 diffuseColor = colorTex0 * vColor;
	diffuseColor *= diffuse;
	return diffuseColor;
}


// vec4 texDefaultBlend() {
// 	vec4 diffuseColor = vec4( diffuse, opacity );
// 	vec4 texelColor;
// #ifdef USE_MAP
// 	texelColor = texture2D( map, vUv );
// 	texelColor = mapTexelToLinear( texelColor );
// 	diffuseColor *= texelColor;
// #endif
// #ifdef USE_DETAILMAP
// 	texelColor = texture2D( detailMap, vUv2 );
// 	texelColor = mapTexelToLinear( texelColor );
// 	diffuseColor = mix(diffuseColor, texelColor, texelColor.a);
// #endif
// #ifdef USE_OVERLAYMAP
// 	texelColor = texture2D( overlayMap, vUv3 );
// 	texelColor = mapTexelToLinear( texelColor );
// 	diffuseColor = mix(diffuseColor, texelColor, texelColor.a);
// #endif
// 	return diffuseColor;
// }

void main() {
	vec4 diffuseColor = TEX_BLEND_FUNC();

	#include <alphamap_fragment>
#ifdef ALPHATEST
	if ( diffuseColor.a OP_ALPHATEST ALPHATEST ) discard;
#endif

	#include <specularmap_fragment>

	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );

	// accumulation (baked indirect lighting only)
	#ifdef USE_LIGHTMAP

		reflectedLight.indirectDiffuse += texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;

	#else

		reflectedLight.indirectDiffuse += vec3( 1.0 );

	#endif

	// modulation
	#include <aomap_fragment>

	reflectedLight.indirectDiffuse *= diffuseColor.rgb;

	vec3 outgoingLight = reflectedLight.indirectDiffuse;

	#include <envmap_fragment>

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	#include <premultiplied_alpha_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>

}
