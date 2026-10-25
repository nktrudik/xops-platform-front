export const vertexShader = `
precision highp float;
attribute vec2 a_uv;
uniform float u_time;
uniform float u_aspect;
uniform vec2 u_pointer;
uniform mediump float u_engaged;
varying mediump vec3 v_normal;
varying mediump vec3 v_position;

vec3 rotate(vec3 p) {
  float x = -0.18 + u_pointer.y * 0.22 + sin(u_time * 0.23) * 0.07;
  float y = 0.18 + u_pointer.x * 0.28;
  float z = -0.18 + sin(u_time * 0.19) * 0.065;
  p.yz = mat2(cos(x), -sin(x), sin(x), cos(x)) * p.yz;
  p.xz = mat2(cos(y), -sin(y), sin(y), cos(y)) * p.xz;
  p.xy = mat2(cos(z), -sin(z), sin(z), cos(z)) * p.xy;
  return p;
}
void main() {
  float t = a_uv.x;
  float v = a_uv.y;
  float breath = sin(u_time * 0.38);
  float a = 1.32 + breath * 0.10 - u_engaged * 0.08;
  float b = 0.66 + cos(u_time * 0.31) * 0.055 + u_engaged * 0.07;
  vec3 center = vec3(a * sin(t), b * sin(2.0*t), 0.53 * cos(t));
  center.x += 0.10*cos(2.0*t + u_time*0.28);
  center.z += 0.09 * sin(3.0*t + u_time*0.42);
  vec3 tangent = normalize(vec3(a*cos(t) - 0.20*sin(2.0*t + u_time*0.28), 2.0*b*cos(2.0*t), -0.53*sin(t) + 0.27*cos(3.0*t + u_time*0.42)));
  vec3 n = normalize(cross(tangent, vec3(0.0, 0.0, 1.0)));
  vec3 binormal = normalize(cross(tangent, n));
  float roll = t + 0.55*sin(2.0*t + u_time*0.32) + 0.13*sin(u_time*0.41);
  vec3 side = n*cos(roll) + binormal*sin(roll);
  vec3 up = -n*sin(roll) + binormal*cos(roll);
  float width = 0.31 + 0.035*sin(2.0*t - u_time*0.29);
  float thickness = 0.048;
  vec3 p = rotate(center + side*cos(v)*width + up*sin(v)*thickness);
  v_normal = normalize(rotate(side*cos(v)/width + up*sin(v)/thickness));
  v_position = p;
  float perspective = 4.8 / (4.8 - p.z);
  gl_Position = vec4(p.x * 0.63 / u_aspect * perspective, p.y * 0.63 * perspective, -p.z * 0.15, 1.0);
}
`

export const fragmentShader = `
precision mediump float;
varying mediump vec3 v_normal;
varying mediump vec3 v_position;
uniform mediump float u_engaged;
void main() {
  vec3 n = normalize(v_normal);
  vec3 view = normalize(vec3(0.0, 0.0, 4.8) - v_position);
  vec3 light = normalize(vec3(-2.4, 3.6, 4.0));
  float diffuse = max(dot(n, light), 0.0);
  float fresnel = pow(1.0 - max(dot(n, view), 0.0), 3.0);
  vec3 reflection = reflect(-view, n);
  float softbox = pow(max(dot(reflection, normalize(vec3(-0.5, 0.8, 1.0))), 0.0), 14.0);
  float strip = pow(max(dot(reflection, normalize(vec3(0.7, -0.25, 1.0))), 0.0), 58.0);
  float edge = pow(max(dot(reflection, normalize(vec3(-1.0, -0.5, 0.2))), 0.0), 13.0);
  float silk = exp(-pow((reflection.x + 0.32*reflection.y + 0.28)/0.18, 2.0)) * smoothstep(-0.25, 0.7, reflection.z);
  vec3 red = vec3(0.89, 0.024, 0.067);
  vec3 color = red * (0.46 + diffuse * 0.66);
  color += vec3(1.0, 0.86, 0.87) * softbox * 0.88;
  color += vec3(0.88, 0.91, 1.0) * strip * 0.72;
  color += vec3(1.0, 0.78, 0.82) * silk * 0.62;
  color += vec3(0.55, 0.12, 0.21) * edge * 0.45;
  color += fresnel * vec3(0.23, 0.035, 0.075);
  color += u_engaged * vec3(0.035, 0.005, 0.008);
  gl_FragColor = vec4(color, 1.0);
}
`
