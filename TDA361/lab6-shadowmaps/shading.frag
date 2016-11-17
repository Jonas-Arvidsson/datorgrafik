#version 420

// required by GLSL spec Sect 4.5.3 (though nvidia does not, amd does)
precision highp float;

///////////////////////////////////////////////////////////////////////////////
// Material
///////////////////////////////////////////////////////////////////////////////
uniform vec3 material_color;
uniform float material_reflectivity;
uniform float material_metalness;
uniform float material_fresnel;
uniform float material_shininess;
uniform float material_emission;

uniform int has_emission_texture;
layout(binding = 5) uniform sampler2D emissiveMap;

///////////////////////////////////////////////////////////////////////////////
// Environment
///////////////////////////////////////////////////////////////////////////////
layout(binding = 6) uniform sampler2D environmentMap;
layout(binding = 7) uniform sampler2D irradianceMap;
layout(binding = 8) uniform sampler2D reflectionMap;
uniform float environment_multiplier;

///////////////////////////////////////////////////////////////////////////////
// Light source
///////////////////////////////////////////////////////////////////////////////
uniform vec3 point_light_color = vec3(1.0, 1.0, 1.0);
uniform float point_light_intensity_multiplier = 50.0;

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////
#define PI 3.14159265359

///////////////////////////////////////////////////////////////////////////////
// Input varyings from vertex shader
///////////////////////////////////////////////////////////////////////////////
in vec2 texCoord;
in vec3 viewSpaceNormal;
in vec3 viewSpacePosition;

///////////////////////////////////////////////////////////////////////////////
// Input uniform variables
///////////////////////////////////////////////////////////////////////////////
uniform mat4 viewInverse;
uniform vec3 viewSpaceLightPosition;

///////////////////////////////////////////////////////////////////////////////
// Output color
///////////////////////////////////////////////////////////////////////////////
layout(location = 0) out vec4 fragmentColor;



vec3 calculateDirectIllumiunation(vec3 wo, vec3 n)
{
	///////////////////////////////////////////////////////////////////////////
	// Task 1.2 - Calculate the radiance Li from the light, and the direction
	//            to the light. If the light is backfacing the triangle, 
	//            return vec3(0); 
	///////////////////////////////////////////////////////////////////////////
	vec3 wi = normalize(viewSpaceLightPosition - viewSpacePosition);
	float d = length(viewSpaceLightPosition - viewSpacePosition);
	float k = dot(n, wi);
	if (k <= 0)
	{
		return vec3(0);
	}

	vec3 Li = point_light_intensity_multiplier * point_light_color * (1 / pow(d, 2));

	///////////////////////////////////////////////////////////////////////////
	// Task 1.3 - Calculate the diffuse term and return that as the result
	///////////////////////////////////////////////////////////////////////////
	vec3 diffuse_term = material_color * (1.0 / PI) * abs(k) * Li;
	//return vec3(diffuse_term);

	///////////////////////////////////////////////////////////////////////////
	// Task 2 - Calculate the Torrance Sparrow BRDF and return the light 
	//          reflected from that instead
	///////////////////////////////////////////////////////////////////////////
	vec3 wh = normalize(wi + wo);
	float l = dot(n, wh);
	float g = dot(n, wo);
	float o = dot(wo, wh);

	float F = material_fresnel + (1 - material_fresnel) * pow((1 - k), 5);
	float D = ((material_shininess + 2) / (2 * PI)) * pow(l, material_shininess);
	float G = min(1, min(((2 * l * g) / o), ((2 * l * k) / o)));

	float brdf = ((F * D * G) / (4 * g * k));
	//return brdf * k * Li;
	//return vec3(G);
	//return vec3(F);

	///////////////////////////////////////////////////////////////////////////
	// Task 3 - Make your shader respect the parameters of our material model.
	///////////////////////////////////////////////////////////////////////////
	vec3 dielectric_term = brdf * (k * Li) + (1 - F) * diffuse_term;
	vec3 metal_term = brdf * material_color * k * Li;
	vec3 microfacet_term = material_metalness * metal_term + (1 - material_metalness) * dielectric_term;

	return material_reflectivity * microfacet_term + (1 - material_reflectivity) * diffuse_term;
}

vec3 calculateIndirectIllumination(vec3 wo, vec3 n)
{
	///////////////////////////////////////////////////////////////////////////
	// Task 5 - Lookup the irradiance from the irradiance map and calculate
	//      5    the diffuse reflection
	///////////////////////////////////////////////////////////////////////////
	vec3 nws = vec3(viewInverse * vec4(n, 0));
	vec3 irradiance;

	float theta = acos(max(-1.0f, min(1.0f, nws.y)));
	float phi = atan(nws.z, nws.x);
	if (phi < 0.0f) phi = phi + 2.0f * PI;

	vec2 lookup = vec2(phi / (2.0 * PI), theta / PI);
	irradiance = environment_multiplier * texture(irradianceMap, lookup).xyz;

	vec3 diffuse_term = material_color * (1.0 / PI) * irradiance;
	//return diffuse_term;


	vec3 wi0 = (-wo) - 2.0 * dot(n, -wo) * n;
	vec3 wi = vec3(viewInverse * vec4(wi0, 0));
	float roughness = sqrt(sqrt(2 / (material_shininess + 2)));
	float k = dot(n, wi);


	float theta2 = acos(max(-1.0f, min(1.0f, wi.y)));
	float phi2 = atan(wi.z, wi.x);
	if (phi2 < 0.0f) phi2 = phi2 + 2.0f * PI;

	vec2 lookup2 = vec2(phi2 / (2.0 * PI), theta2 / PI);
	vec3 Li = environment_multiplier * textureLod(reflectionMap, lookup2, roughness * 7.0).xyz;


	float F = material_fresnel + (1 - material_fresnel) * pow((1 - k), 5);

	vec3 dielectric_term = F * Li + (1 - F) * diffuse_term;
	vec3 metal_term = F * material_color * Li;
	vec3 microfacet_term = material_metalness * metal_term + (1 - material_metalness) * dielectric_term;

	return material_reflectivity * microfacet_term + (1 - material_reflectivity) * diffuse_term;
}

void main() 
{
	float visibility = 1.0;
	float attenuation = 1.0;
	

	vec3 wo = -normalize(viewSpacePosition);
	vec3 n = normalize(viewSpaceNormal);

	// Direct illumination
	vec3 direct_illumination_term = visibility * calculateDirectIllumiunation(wo, n);

	// Indirect illumination
	vec3 indirect_illumination_term = calculateIndirectIllumination(wo, n);

	///////////////////////////////////////////////////////////////////////////
	// Add emissive term. If emissive texture exists, sample this term.
	///////////////////////////////////////////////////////////////////////////
	vec3 emission_term = material_emission * material_color;
	if (has_emission_texture == 1) {
		emission_term = texture(emissiveMap, texCoord).xyz;
	}

	vec3 shading = 
		direct_illumination_term +
		indirect_illumination_term +
		emission_term;

	fragmentColor = vec4(shading, 1.0);
	return;

}
