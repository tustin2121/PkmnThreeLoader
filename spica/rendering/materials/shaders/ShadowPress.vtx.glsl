// "ShadowPress" vertex shader

varying vec3 vViewPosition;
// varying vec3 vNormal;

#include <common>

uniform vec3 shadowDirection;
uniform vec4 shadowPlane;

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
	vec3 sPosition = linePlaneIntersect(mPosition, lightDirection, shadowPlane.xyz * -shadowPlane.w, shadowPlane.xyz);
	
	gl_Position = projectionMatrix * viewMatrix * vec4(sPosition, 1.0);
	
	// vNormal = transformedNormal;
	vViewPosition = -mPosition;

	#include <worldpos_vertex>
	#include <fog_vertex>
}