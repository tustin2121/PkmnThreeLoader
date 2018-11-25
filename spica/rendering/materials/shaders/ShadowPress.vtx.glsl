// "ShadowPress" vertex shader

// varying vec3 vViewPosition;

#include <common>

uniform vec3 shadowDirection;

#if NUM_DIR_LIGHTS > 0
struct DirectionalLight {
	vec3 direction;
	vec3 color;

	int shadow;
	float shadowBias;
	float shadowRadius;
	vec2 shadowMapSize;
};
uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
#endif

#if NUM_HEMI_LIGHTS > 0
struct HemisphereLight {
	vec3 direction;
	vec3 skyColor;
	vec3 groundColor;
};
uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
#endif

#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>

void main() {
	#include <color_vertex>

	vec3 transformed = vec3( position );
	#include <morphtarget_vertex>
	#include <skinbase_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	
	vec3 mPosition = (modelMatrix * vec4( transformed, 1.0 )).xyz;
	vec3 lightDirection = normalize(shadowDirection);
	// #if NUM_DIR_LIGHTS > 0
	// vec3 lightDirection = directionalLights[0].direction;
	// #elif NUM_HEMI_LIGHTS > 0
	// vec3 lightDirection = hemisphereLights[0].direction;
	// lightDirection.y = -lightDirection.y;
	// #else
	// vec3 lightDirection = vec4(0, -1, 0);
	// #endif
	mPosition = linePlaneIntersect(mPosition, lightDirection, vec3(0), vec3(0,1,0));
	
	gl_Position = projectionMatrix * viewMatrix * vec4(mPosition, 1.0);
	
	// vViewPosition = - mvPosition.xyz;

	#include <worldpos_vertex>
	#include <fog_vertex>
}