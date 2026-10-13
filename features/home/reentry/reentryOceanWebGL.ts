"use client";

export interface ReentryOceanWebGLRenderer {
  readonly canvas: HTMLCanvasElement;
  render(options: {
    width: number;
    height: number;
    timeS: number;
  }): HTMLCanvasElement | null;
  destroy(): void;
}

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_daylight;
uniform float u_twilight;
uniform float u_sun_x;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  return mix(
    mix(a, b, f.x),
    mix(c, d, f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.53;

  for (int i = 0; i < 4; i++) {
    v += noise2(p) * a;
    p = p * 2.03 + vec2(17.17, 9.31);
    a *= 0.48;
  }

  return v;
}

vec4 waveField(vec2 p) {
  float h = 0.0;
  float dx = 0.0;
  float dz = 0.0;

  vec2 d1 = normalize(vec2(1.0, 0.36));
  vec2 d2 = normalize(vec2(-0.52, 1.0));
  vec2 d3 = normalize(vec2(0.72, 1.0));
  vec2 d4 = normalize(vec2(-1.0, 0.18));

  float f1 = 1.15;
  float f2 = 1.85;
  float f3 = 3.10;
  float f4 = 5.20;

  float a1 = 0.42;
  float a2 = 0.25;
  float a3 = 0.13;
  float a4 = 0.055;

  float q1 = dot(p, d1) * f1 + u_time * 0.63;
  float q2 = dot(p, d2) * f2 + u_time * 0.88;
  float q3 = dot(p, d3) * f3 + u_time * 1.16;
  float q4 = dot(p, d4) * f4 + u_time * 1.42;

  h += sin(q1) * a1;
  h += sin(q2) * a2;
  h += sin(q3) * a3;
  h += sin(q4) * a4;

  dx += cos(q1) * a1 * f1 * d1.x;
  dx += cos(q2) * a2 * f2 * d2.x;
  dx += cos(q3) * a3 * f3 * d3.x;
  dx += cos(q4) * a4 * f4 * d4.x;

  dz += cos(q1) * a1 * f1 * d1.y;
  dz += cos(q2) * a2 * f2 * d2.y;
  dz += cos(q3) * a3 * f3 * d3.y;
  dz += cos(q4) * a4 * f4 * d4.y;

  float detail =
    sin(p.x * 8.7 + p.y * 4.1 + u_time * 1.9) *
    sin(p.y * 9.4 - p.x * 2.7 + u_time * 1.45);

  h += detail * 0.025;

  return vec4(dx, dz, h, detail);
}

vec3 skyBase(vec2 uv) {
  float y = clamp(uv.y / 0.64, 0.0, 1.0);

  vec3 dayTop = vec3(0.025, 0.31, 0.72);
  vec3 dayHorizon = vec3(0.68, 0.86, 0.96);

  vec3 duskTop = vec3(0.015, 0.06, 0.16);
  vec3 duskHorizon = vec3(0.63, 0.37, 0.32);

  vec3 nightTop = vec3(0.002, 0.008, 0.025);
  vec3 nightHorizon = vec3(0.025, 0.13, 0.24);

  vec3 day = mix(dayTop, dayHorizon, pow(y, 1.18));
  vec3 night = mix(nightTop, nightHorizon, pow(y, 1.35));
  vec3 twilight = mix(duskTop, duskHorizon, pow(y, 1.10));

  vec3 sky = mix(night, day, u_daylight);
  sky = mix(sky, twilight, u_twilight * (1.0 - u_daylight) * 0.82);

  return sky;
}

void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  float horizon = 0.635;

  vec3 color = skyBase(uv);

  if (uv.y < horizon) {
    vec2 cloudP = vec2(
      uv.x * (2.35 + aspect * 0.30) + u_time * 0.006,
      uv.y * 2.10 - u_time * 0.0015
    );

    float cloudN = fbm(cloudP * 2.2 + vec2(7.0, 13.0));
    float cloudBand =
      smoothstep(0.17, 0.64, uv.y) *
      (1.0 - smoothstep(0.60, 0.69, uv.y));

    float cloud = smoothstep(0.54, 0.74, cloudN + cloudBand * 0.18);

    vec3 cloudDay = vec3(0.98, 0.99, 1.0);
    vec3 cloudNight = vec3(0.12, 0.18, 0.27);
    vec3 cloudColor = mix(cloudNight, cloudDay, u_daylight);

    color = mix(
      color,
      cloudColor,
      cloud * mix(0.20, 0.78, u_daylight)
    );

    float night = 1.0 - smoothstep(0.10, 0.42, u_daylight);
    vec2 starCell = floor(uv * vec2(115.0, 175.0));
    float starHash = hash21(starCell);
    float star = smoothstep(0.9955, 1.0, starHash);
    float twinkle = 0.72 + 0.28 * sin(u_time * 2.2 + starHash * 31.4);
    color += vec3(0.78, 0.88, 1.0) * star * twinkle * night * 0.85;

    if (u_daylight > 0.035) {
      float sunY = mix(0.55, 0.105, u_daylight);
      vec2 sunPos = vec2(u_sun_x, sunY);
      float dist = length((uv - sunPos) * vec2(aspect, 1.0));

      float halo = 0.028 / max(0.010, dist);
      halo = min(1.0, halo * halo);
      float core = 1.0 - smoothstep(0.010, 0.022, dist);

      color +=
        vec3(1.0, 0.88, 0.63) *
        halo *
        mix(0.16, 0.55, u_daylight);

      color = mix(
        color,
        vec3(1.0, 0.985, 0.90),
        core * 0.98
      );
    }
  } else {
    float depth = clamp(
      (uv.y - horizon) /
      max(0.0001, 1.0 - horizon),
      0.0,
      1.0
    );

    float z = mix(
      26.0,
      1.15,
      pow(depth, 0.58)
    );

    float span = mix(
      30.0,
      4.2,
      pow(depth, 0.62)
    );

    vec2 p = vec2(
      (uv.x - 0.5) * span,
      z
    );

    vec4 wf = waveField(p);

    vec3 n = normalize(
      vec3(
        -wf.x,
        2.25,
        -wf.y
      )
    );

    vec3 viewDir = normalize(
      vec3(
        (uv.x - 0.5) * aspect * 0.85,
        0.72,
        1.35
      )
    );

    vec3 sunDir = normalize(
      vec3(
        (u_sun_x - 0.5) * 1.8,
        1.05 + u_daylight * 0.75,
        -0.45
      )
    );

    float ndv = max(
      0.0,
      dot(n, viewDir)
    );

    float fresnel =
      0.035 +
      0.965 *
      pow(
        1.0 - ndv,
        4.2
      );

    vec3 deepDay = vec3(0.005, 0.16, 0.27);
    vec3 nearDay = vec3(0.01, 0.29, 0.40);
    vec3 deepNight = vec3(0.002, 0.018, 0.045);
    vec3 nearNight = vec3(0.004, 0.07, 0.12);

    vec3 waterDeep =
      mix(
        deepNight,
        deepDay,
        u_daylight
      );

    vec3 waterNear =
      mix(
        nearNight,
        nearDay,
        u_daylight
      );

    vec3 water =
      mix(
        waterDeep,
        waterNear,
        depth
      );

    float reflectedY =
      clamp(
        0.46 +
        n.z * 0.26 -
        n.x * 0.05,
        0.02,
        0.62
      );

    vec3 reflectedSky =
      skyBase(
        vec2(
          uv.x +
            n.x * 0.055,
          reflectedY
        )
      );

    color =
      mix(
        water,
        reflectedSky,
        fresnel *
          mix(
            0.50,
            0.86,
            u_daylight
          )
      );

    vec3 reflected =
      reflect(
        -sunDir,
        n
      );

    float spec =
      pow(
        max(
          0.0,
          dot(
            reflected,
            viewDir
          )
        ),
        mix(
          42.0,
          105.0,
          u_daylight
        )
      );

    float brokenSpec =
      0.48 +
      0.52 *
      noise2(
        p * 2.8 +
        vec2(
          u_time * 0.15,
          -u_time * 0.10
        )
      );

    spec *= brokenSpec;

    color +=
      vec3(1.0, 0.91, 0.72) *
      spec *
      mix(
        0.18,
        2.1,
        u_daylight
      );

    float crest =
      smoothstep(
        0.52,
        0.92,
        wf.z +
          noise2(
            p * 1.7 +
            u_time * 0.07
          ) *
            0.28
      );

    float foamBreak =
      smoothstep(
        0.45,
        0.75,
        noise2(
          p * 3.4 +
          vec2(
            u_time * 0.18,
            0.0
          )
        )
      );

    float foam =
      crest *
      foamBreak *
      smoothstep(
        0.14,
        0.92,
        depth
      );

    vec3 foamColor =
      mix(
        vec3(0.42, 0.58, 0.70),
        vec3(0.94, 0.985, 1.0),
        u_daylight
      );

    color =
      mix(
        color,
        foamColor,
        foam * mix(0.22, 0.72, u_daylight)
      );

    float horizonHaze =
      1.0 -
      smoothstep(
        0.0,
        0.13,
        depth
      );

    color =
      mix(
        color,
        skyBase(vec2(uv.x, horizon)),
        horizonHaze * 0.56
      );

    color *=
      0.94 +
      0.10 *
      smoothstep(
        0.0,
        0.70,
        depth
      );
  }

  color = color / (color + vec3(0.72));
  color = pow(
    color,
    vec3(0.92)
  );

  gl_FragColor = vec4(color, 1.0);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Unable to create WebGL shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (
    !gl.getShaderParameter(
      shader,
      gl.COMPILE_STATUS,
    )
  ) {
    const log =
      gl.getShaderInfoLog(shader) ??
      "Unknown shader compile error.";

    gl.deleteShader(shader);

    throw new Error(log);
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
): WebGLProgram {
  const vertex =
    compileShader(
      gl,
      gl.VERTEX_SHADER,
      VERTEX_SHADER,
    );

  const fragment =
    compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      FRAGMENT_SHADER,
    );

  const program =
    gl.createProgram();

  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    throw new Error(
      "Unable to create WebGL program.",
    );
  }

  gl.attachShader(
    program,
    vertex,
  );

  gl.attachShader(
    program,
    fragment,
  );

  gl.linkProgram(program);

  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (
    !gl.getProgramParameter(
      program,
      gl.LINK_STATUS,
    )
  ) {
    const log =
      gl.getProgramInfoLog(program) ??
      "Unknown WebGL link error.";

    gl.deleteProgram(program);

    throw new Error(log);
  }

  return program;
}

function localDaylight(
  hour: number,
): number {
  return Math.min(
    1,
    Math.max(
      0,
      Math.sin(
        (
          (
            hour -
            5.5
          ) /
            13
        ) *
          Math.PI,
      ),
    ),
  );
}

export function createReentryOceanWebGLRenderer():
  ReentryOceanWebGLRenderer | null {
  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  const canvas =
    document.createElement(
      "canvas",
    );

  const gl =
    canvas.getContext(
      "webgl",
      {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      },
    );

  if (!gl) {
    return null;
  }

  let program: WebGLProgram;

  try {
    program =
      createProgram(gl);
  } catch {
    return null;
  }

  const buffer =
    gl.createBuffer();

  if (!buffer) {
    gl.deleteProgram(program);
    return null;
  }

  gl.bindBuffer(
    gl.ARRAY_BUFFER,
    buffer,
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]),
    gl.STATIC_DRAW,
  );

  const position =
    gl.getAttribLocation(
      program,
      "a_position",
    );

  const resolution =
    gl.getUniformLocation(
      program,
      "u_resolution",
    );

  const time =
    gl.getUniformLocation(
      program,
      "u_time",
    );

  const daylight =
    gl.getUniformLocation(
      program,
      "u_daylight",
    );

  const twilight =
    gl.getUniformLocation(
      program,
      "u_twilight",
    );

  const sunX =
    gl.getUniformLocation(
      program,
      "u_sun_x",
    );

  let destroyed = false;

  const renderer:
    ReentryOceanWebGLRenderer = {
      canvas,

      render({
        width,
        height,
        timeS,
      }) {
        if (destroyed) {
          return null;
        }

        const baseDpr =
          Math.min(
            1.25,
            window.devicePixelRatio ||
              1,
          );

        const targetPixels =
          Math.max(
            1,
            width *
              height *
              baseDpr *
              baseDpr,
          );

        const pixelBudget =
          1_350_000;

        const budgetScale =
          targetPixels >
          pixelBudget
            ? Math.sqrt(
                pixelBudget /
                  targetPixels,
              )
            : 1;

        const renderDpr =
          Math.max(
            0.85,
            baseDpr *
              budgetScale,
          );

        const pw =
          Math.max(
            1,
            Math.floor(
              width *
                renderDpr,
            ),
          );

        const ph =
          Math.max(
            1,
            Math.floor(
              height *
                renderDpr,
            ),
          );

        if (
          canvas.width !== pw ||
          canvas.height !== ph
        ) {
          canvas.width = pw;
          canvas.height = ph;
        }

        const now =
          new Date();

        const hour =
          now.getHours() +
          now.getMinutes() /
            60 +
          now.getSeconds() /
            3600;

        const day =
          localDaylight(hour);

        const twilightValue =
          Math.max(
            0,
            1 -
              Math.abs(
                day * 2 -
                1,
              ),
          );

        const sunProgress =
          Math.min(
            1,
            Math.max(
              0,
              (
                hour -
                5.5
              ) /
                13,
            ),
          );

        const x =
          0.08 +
          0.84 *
            sunProgress;

        gl.viewport(
          0,
          0,
          pw,
          ph,
        );

        gl.useProgram(program);

        gl.bindBuffer(
          gl.ARRAY_BUFFER,
          buffer,
        );

        gl.enableVertexAttribArray(
          position,
        );

        gl.vertexAttribPointer(
          position,
          2,
          gl.FLOAT,
          false,
          0,
          0,
        );

        if (resolution) {
          gl.uniform2f(
            resolution,
            pw,
            ph,
          );
        }

        if (time) {
          gl.uniform1f(
            time,
            timeS,
          );
        }

        if (daylight) {
          gl.uniform1f(
            daylight,
            day,
          );
        }

        if (twilight) {
          gl.uniform1f(
            twilight,
            twilightValue,
          );
        }

        if (sunX) {
          gl.uniform1f(
            sunX,
            x,
          );
        }

        gl.drawArrays(
          gl.TRIANGLES,
          0,
          6,
        );

        return canvas;
      },

      destroy() {
        if (destroyed) {
          return;
        }

        destroyed = true;

        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      },
    };

  return renderer;
}
