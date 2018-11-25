// "ShadowPress" fragment shader

varying vec3 vViewPosition;
// varying vec3 vNormal;

uniform vec4 shadowPlane;

#include <common>

void main() {
	if ( dot(vViewPosition, shadowPlane.xyz) > shadowPlane.w ) discard;
	gl_FragColor = vec4(0, 0, 0, 0.5);
}