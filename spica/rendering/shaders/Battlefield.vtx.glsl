// "Battlefield" vertex shader - most commonly used shader for battlefield geometry

#include <common>

uniform mat3 uvTransform;
uniform mat3 uvTransform2;
uniform mat3 uvTransform3;
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vUv3;

#ifdef USE_UV2
attribute vec2 uv2;
#endif
#ifdef USE_UV3
attribute vec2 uv3;
#endif

#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>

void main() {
	
	vUv = (uvTransform * vec3(uv, 1)).xy;
	#ifdef USE_UV2
	vUv2 = (uvTransform2 * vec3(uv2, 1)).xy;
	#else
	vUv2 = (uvTransform2 * vec3(uv, 1)).xy;
	#endif
	#ifdef USE_UV3
	vUv3 = (uvTransform3 * vec3(uv3, 1)).xy;
	#else
	vUv3 = (uvTransform3 * vec3(uv, 1)).xy;
	#endif

	#include <color_vertex>
	#include <skinbase_vertex>

	#ifdef USE_ENVMAP

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	vNormal = transformedNormal;

	#endif

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>

	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>

}