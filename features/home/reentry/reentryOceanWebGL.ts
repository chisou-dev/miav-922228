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

const VERTEX_SHADER = \`
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
\`;

const FRAGMENT_SHADER = \`
precision highp float;

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_daylight;
uniform float u_twilight;
uniform float u_light_x;
uniform float u_moon_strength;

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
  float a = 0.52;

  for (int i = 0; i < 5; i++) {
    v += noise2(p) * a;
    p = p * 2.03 + vec2(19.17, 7.31);
    a *= 0.48;
  }

  return v;
}

float ridged(vec2 p) {
  float v = 0.0;
  float a = 0.55;

  for (int i = 0; i < 4; i++) {
    float n = noise2(p);
    n = 1.0 - abs(n * 2.0 - 1.0);
    v += n * n * a;
    p = p * 2.11 + vec2(8.7, 14.2);
    a *= 0.48;
  }

  return v;
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);

  return mat2(
    c, -s,
    s,  c
  );
}

float starField(
  vec2 uv,
  float scale,
  float threshold
) {
  vec2 p = uv * scale;
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;

  vec2 jitter =
    vec2(
      hash21(id + vec2(2.7, 9.1)),
      hash21(id + vec2(7.4, 3.6))
    ) -
    0.5;

  float d =
    length(
      f -
      jitter * 0.72
    );

  float seed =
    hash21(
      id +
      vec2(13.1, 5.7)
    );

  float visible =
    smoothstep(
      threshold,
      1.0,
      seed
    );

  float core =
    1.0 -
    smoothstep(
      0.012,
      0.055,
      d
    );

  return visible * core;
}

vec4 waveField(vec2 p) {
  float h = 0.0;
  float dx = 0.0;
  float dz = 0.0;

  vec2 d1 = normalize(vec2(1.00, 0.27));
  vec2 d2 = normalize(vec2(-0.61, 1.00));
  vec2 d3 = normalize(vec2(0.74, 1.00));
  vec2 d4 = normalize(vec2(-1.00, 0.18));
  vec2 d5 = normalize(vec2(0.31, -1.00));
  vec2 d6 = normalize(vec2(1.00, -0.72));

  float q1 = dot(p, d1) * 0.92 + u_time * 0.43;
  float q2 = dot(p, d2) * 1.37 + u_time * 0.61;
  float q3 = dot(p, d3) * 2.15 + u_time * 0.82;
  float q4 = dot(p, d4) * 3.70 + u_time * 1.15;
  float q5 = dot(p, d5) * 6.20 + u_time * 1.62;
  float q6 = dot(p, d6) * 9.10 + u_time * 2.08;

  float a1 = 0.53;
  float a2 = 0.31;
  float a3 = 0.18;
  float a4 = 0.095;
  float a5 = 0.040;
  float a6 = 0.018;

  h += sin(q1) * a1;
  h += sin(q2) * a2;
  h += sin(q3) * a3;
  h += sin(q4) * a4;
  h += sin(q5) * a5;
  h += sin(q6) * a6;

  dx += cos(q1) * a1 * 0.92 * d1.x;
  dx += cos(q2) * a2 * 1.37 * d2.x;
  dx += cos(q3) * a3 * 2.15 * d3.x;
  dx += cos(q4) * a4 * 3.70 * d4.x;
  dx += cos(q5) * a5 * 6.20 * d5.x;
  dx += cos(q6) * a6 * 9.10 * d6.x;

  dz += cos(q1) * a1 * 0.92 * d1.y;
  dz += cos(q2) * a2 * 1.37 * d2.y;
  dz += cos(q3) * a3 * 2.15 * d3.y;
  dz += cos(q4) * a4 * 3.70 * d4.y;
  dz += cos(q5) * a5 * 6.20 * d5.y;
  dz += cos(q6) * a6 * 9.10 * d6.y;

  float micro =
    sin(p.x * 12.7 + p.y * 5.1 + u_time * 2.30) *
    sin(p.y * 13.9 - p.x * 3.7 + u_time * 1.73);

  h += micro * 0.020;

  return vec4(dx, dz, h, micro);
}

vec3 skyBase(vec2 uv) {
  float y =
    clamp(
      uv.y / 0.635,
      0.0,
      1.0
    );

  vec3 dayTop =
    vec3(0.018, 0.30, 0.72);

  vec3 dayHorizon =
    vec3(0.66, 0.86, 0.97);

  vec3 duskTop =
    vec3(0.012, 0.040, 0.11);

  vec3 duskHorizon =
    vec3(0.63, 0.34, 0.25);

  vec3 nightTop =
    vec3(0.0015, 0.004, 0.014);

  vec3 nightHorizon =
    vec3(0.018, 0.070, 0.13);

  vec3 day =
    mix(
      dayTop,
      dayHorizon,
      pow(y, 1.14)
    );

  vec3 night =
    mix(
      nightTop,
      nightHorizon,
      pow(y, 1.42)
    );

  vec3 twilight =
    mix(
      duskTop,
      duskHorizon,
      pow(y, 1.08)
    );

  vec3 sky =
    mix(
      night,
      day,
      u_daylight
    );

  sky =
    mix(
      sky,
      twilight,
      u_twilight *
        (1.0 - u_daylight) *
        0.78
    );

  return sky;
}

vec3 renderNightSky(
  vec2 uv,
  float aspect
) {
  vec3 base = skyBase(uv);

  float night =
    1.0 -
    smoothstep(
      0.06,
      0.36,
      u_daylight
    );

  if (night <= 0.001) {
    return base;
  }

  vec2 starUv =
    vec2(
      (uv.x - 0.5) *
        aspect +
        0.5,
      uv.y
    );

  float starsA =
    starField(
      starUv,
      118.0,
      0.985
    );

  float starsB =
    starField(
      starUv +
        vec2(0.071, 0.029),
      205.0,
      0.992
    );

  float twinkle =
    0.82 +
    0.18 *
      sin(
        u_time * 2.2 +
        starUv.x * 71.0 +
        starUv.y * 39.0
      );

  vec3 stars =
    vec3(
      0.76,
      0.87,
      1.00
    ) *
    (
      starsA * 0.92 +
      starsB * 0.62
    ) *
    twinkle;

  /*
   * Milky-Way-like density band.
   * It is deliberately subtle enough to read as sky texture rather than
   * a painted stripe.
   */
  vec2 galaxyP =
    rot(-0.58) *
    vec2(
      (uv.x - 0.52) * aspect,
      uv.y - 0.30
    );

  float galaxyBand =
    exp(
      -abs(galaxyP.y) *
      6.6
    );

  float galaxyDust =
    fbm(
      galaxyP * 5.4 +
      vec2(4.2, 11.7)
    );

  float galaxyKnots =
    ridged(
      galaxyP * 8.2 +
      vec2(1.7, 6.1)
    );

  float galaxy =
    galaxyBand *
    smoothstep(
      0.36,
      0.88,
      galaxyDust * 0.72 +
      galaxyKnots * 0.40
    );

  vec3 galaxyColor =
    mix(
      vec3(0.08, 0.15, 0.26),
      vec3(0.34, 0.48, 0.70),
      galaxyDust
    );

  base +=
    stars *
    night;

  base +=
    galaxyColor *
    galaxy *
    night *
    0.50;

  return base;
}

vec3 renderClouds(
  vec2 uv,
  vec3 sky,
  float aspect
) {
  vec2 p =
    vec2(
      uv.x * (2.0 + aspect * 0.22),
      uv.y * 2.45
    );

  p +=
    vec2(
      u_time * 0.007,
      -u_time * 0.0012
    );

  float low =
    fbm(
      p * 1.45 +
      vec2(7.0, 13.0)
    );

  float detail =
    fbm(
      p * 3.70 +
      vec2(19.0, 4.0)
    );

  float carve =
    ridged(
      p * 2.55 +
      vec2(3.0, 22.0)
    );

  float horizonBanks =
    smoothstep(
      0.34,
      0.62,
      uv.y
    ) *
    (
      1.0 -
      smoothstep(
        0.61,
        0.69,
        uv.y
      )
    );

  float overhead =
    smoothstep(
      0.07,
      0.30,
      uv.y
    ) *
    (
      1.0 -
      smoothstep(
        0.42,
        0.60,
        uv.y
      )
    );

  float density =
    smoothstep(
      0.56,
      0.79,
      low * 0.72 +
      detail * 0.34 +
      horizonBanks * 0.17 +
      overhead * 0.06
    );

  density *=
    smoothstep(
      0.02,
      0.16,
      uv.y
    );

  float edge =
    smoothstep(
      0.48,
      0.70,
      low * 0.75 +
      detail * 0.28
    ) -
    density;

  vec3 dayCloud =
    mix(
      vec3(0.58, 0.67, 0.74),
      vec3(1.0, 1.0, 0.99),
      detail
    );

  vec3 nightCloud =
    mix(
      vec3(0.018, 0.028, 0.045),
      vec3(0.16, 0.21, 0.28),
      detail
    );

  vec3 cloudColor =
    mix(
      nightCloud,
      dayCloud,
      u_daylight
    );

  float silver =
    edge *
    (
      0.14 +
      u_moon_strength *
      0.72
    );

  cloudColor +=
    vec3(0.48, 0.60, 0.74) *
    silver;

  float cloudAlpha =
    density *
    mix(
      0.76,
      0.88,
      u_daylight
    );

  return mix(
    sky,
    cloudColor,
    cloudAlpha
  );
}

void main() {
  vec2 uv =
    vec2(
      v_uv.x,
      1.0 - v_uv.y
    );

  float aspect =
    u_resolution.x /
    max(
      1.0,
      u_resolution.y
    );

  float horizon = 0.635;

  vec3 color =
    renderNightSky(
      uv,
      aspect
    );

  if (uv.y < horizon) {
    color =
      renderClouds(
        uv,
        color,
        aspect
      );

    if (u_daylight > 0.035) {
      float sunY =
        mix(
          0.54,
          0.10,
          u_daylight
        );

      vec2 sunPos =
        vec2(
          u_light_x,
          sunY
        );

      float dist =
        length(
          (
            uv -
            sunPos
          ) *
          vec2(
            aspect,
            1.0
          )
        );

      float halo =
        0.025 /
        max(
          0.010,
          dist
        );

      halo =
        min(
          1.0,
          halo * halo
        );

      float core =
        1.0 -
        smoothstep(
          0.009,
          0.021,
          dist
        );

      color +=
        vec3(
          1.0,
          0.86,
          0.58
        ) *
        halo *
        mix(
          0.13,
          0.52,
          u_daylight
        );

      color =
        mix(
          color,
          vec3(
            1.0,
            0.985,
            0.90
          ),
          core * 0.98
        );
    }
  } else {
    float depth =
      clamp(
        (
          uv.y -
          horizon
        ) /
        max(
          0.0001,
          1.0 -
          horizon
        ),
        0.0,
        1.0
      );

    /*
     * Perspective plane. Distant wavelengths compress naturally toward the
     * horizon while near waves occupy much more screen space.
     */
    float z =
      mix(
        44.0,
        1.05,
        pow(
          depth,
          0.54
        )
      );

    float span =
      mix(
        52.0,
        4.6,
        pow(
          depth,
          0.64
        )
      );

    vec2 p =
      vec2(
        (
          uv.x -
          0.5
        ) *
        span,
        z
      );

    vec4 wf =
      waveField(p);

    float microX =
      cos(
        p.x * 15.2 +
        p.y * 4.7 +
        u_time * 2.3
      ) *
      0.12;

    float microZ =
      cos(
        p.y * 16.1 -
        p.x * 3.2 +
        u_time * 1.9
      ) *
      0.12;

    vec3 n =
      normalize(
        vec3(
          -wf.x -
            microX,
          2.18,
          -wf.y -
            microZ
        )
      );

    vec3 viewDir =
      normalize(
        vec3(
          (
            uv.x -
            0.5
          ) *
            aspect *
            0.88,
          0.84,
          1.48
        )
      );

    vec3 lightDir =
      normalize(
        vec3(
          (
            u_light_x -
            0.5
          ) *
            1.65,
          1.36,
          -0.50
        )
      );

    float ndv =
      clamp(
        dot(
          n,
          viewDir
        ),
        0.0,
        1.0
      );

    float fresnel =
      0.028 +
      0.972 *
      pow(
        1.0 -
        ndv,
        4.8
      );

    vec3 deepDay =
      vec3(
        0.004,
        0.135,
        0.235
      );

    vec3 nearDay =
      vec3(
        0.008,
        0.275,
        0.38
      );

    vec3 deepNight =
      vec3(
        0.0015,
        0.020,
        0.048
      );

    vec3 nearNight =
      vec3(
        0.005,
        0.060,
        0.105
      );

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
        pow(
          depth,
          0.72
        )
      );

    float reflectedY =
      clamp(
        0.47 +
        n.z * 0.30 -
        n.x * 0.06,
        0.02,
        0.61
      );

    vec2 reflectUv =
      vec2(
        uv.x +
          n.x * 0.060,
        reflectedY
      );

    vec3 reflectedSky =
      renderNightSky(
        reflectUv,
        aspect
      );

    color =
      mix(
        water,
        reflectedSky,
        fresnel *
          mix(
            0.68,
            0.88,
            u_daylight
          )
      );

    /*
     * Moon/sun sparkle comes from the actual surface normal, then gets broken
     * up by roughness so it becomes a field of photographic glints rather
     * than a vertical dotted lane.
     */
    vec3 reflectedLight =
      reflect(
        -lightDir,
        n
      );

    float directSpec =
      pow(
        max(
          0.0,
          dot(
            reflectedLight,
            viewDir
          )
        ),
        mix(
          58.0,
          128.0,
          u_daylight
        )
      );

    float lightPath =
      exp(
        -abs(
          uv.x -
          u_light_x
        ) /
        (
          0.020 +
          depth *
            0.21
        )
      );

    float glitterNoise =
      noise2(
        p * 3.7 +
        vec2(
          u_time * 0.12,
          -u_time * 0.08
        )
      );

    float glitterBreak =
      smoothstep(
        0.45,
        0.83,
        glitterNoise
      );

    float nightStrength =
      (
        1.0 -
        u_daylight
      ) *
      (
        0.18 +
        u_moon_strength *
          1.25
      );

    float dayStrength =
      u_daylight *
      2.10;

    float silverGlint =
      (
        directSpec *
          (
            0.40 +
            lightPath *
              1.45
          ) +
        lightPath *
          glitterBreak *
          0.22
      ) *
      (
        nightStrength +
        dayStrength
      );

    vec3 specColor =
      mix(
        vec3(
          0.58,
          0.72,
          0.90
        ),
        vec3(
          1.0,
          0.91,
          0.72
        ),
        u_daylight
      );

    color +=
      specColor *
      silverGlint;

    /*
     * Fine sky sheen keeps night water readable between bright reflections.
     */
    float skySheen =
      pow(
        max(
          0.0,
          1.0 -
          abs(n.z) * 0.72
        ),
        5.0
      ) *
      (
        0.035 +
        (
          1.0 -
          u_daylight
        ) *
          0.050
      );

    color +=
      vec3(
        0.10,
        0.21,
        0.33
      ) *
      skySheen;

    float slope =
      length(
        vec2(
          wf.x,
          wf.y
        )
      );

    float crestGate =
      smoothstep(
        0.90,
        1.72,
        slope +
        max(
          0.0,
          wf.z
        ) *
          0.58
      );

    float foamNoise =
      noise2(
        p * 2.7 +
        vec2(
          u_time * 0.16,
          0.0
        )
      );

    float foamBreak =
      smoothstep(
        0.52,
        0.82,
        foamNoise
      );

    float foam =
      crestGate *
      foamBreak *
      smoothstep(
        0.22,
        0.96,
        depth
      );

    vec3 foamColor =
      mix(
        vec3(
          0.30,
          0.42,
          0.56
        ),
        vec3(
          0.96,
          0.99,
          1.0
        ),
        u_daylight
      );

    color =
      mix(
        color,
        foamColor,
        foam *
          mix(
            0.28,
            0.74,
            u_daylight
          )
      );

    /*
     * The hot re-entry nose reflects as an unstable orange ribbon below the
     * craft during the final seconds, matching the reference look.
     */
    float landingReveal =
      smoothstep(
        12.6,
        15.0,
        u_time
      );

    float heatWidth =
      0.010 +
      depth * 0.050;

    float heatPath =
      exp(
        -abs(
          uv.x -
          0.48
        ) /
        heatWidth
      );

    heatPath *=
      smoothstep(
        0.32,
        0.60,
        depth
      );

    float heatFlicker =
      0.50 +
      0.50 *
      noise2(
        vec2(
          p.x * 2.8 +
            u_time * 0.45,
          p.y * 1.6 -
            u_time * 0.20
        )
      );

    float orangeReflection =
      landingReveal *
      heatPath *
      heatFlicker *
      (
        0.32 +
        directSpec * 0.80
      );

    color +=
      vec3(
        1.0,
        0.23,
        0.035
      ) *
      orangeReflection *
      1.45;

    color +=
      vec3(
        1.0,
        0.63,
        0.18
      ) *
      orangeReflection *
      orangeReflection *
      1.10;

    float horizonHaze =
      1.0 -
      smoothstep(
        0.0,
        0.12,
        depth
      );

    color =
      mix(
        color,
        skyBase(
          vec2(
            uv.x,
            horizon
          )
        ),
        horizonHaze *
          mix(
            0.30,
            0.52,
            u_daylight
          )
      );

    /*
     * Near-water contrast is higher, like a low camera looking across real
     * swells. Highlights survive while troughs remain deep.
     */
    color *=
      0.88 +
      0.15 *
      smoothstep(
        0.15,
        0.95,
        depth
      );
  }

  float vignette =
    smoothstep(
      1.10,
      0.24,
      length(
        (
          uv -
          vec2(
            0.5,
            0.52
          )
        ) *
        vec2(
          0.82,
          0.62
        )
      )
    );

  color *=
    mix(
      0.88,
      1.0,
      vignette
    );

  color =
    color /
    (
      color +
      vec3(0.56)
    );

  color =
    pow(
      color,
      vec3(0.88)
    );

  gl_FragColor =
    vec4(
      color,
      1.0
    );
}
\`;

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

  let fragment:
    WebGLShader;

  try {
    fragment =
      compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        FRAGMENT_SHADER,
      );
  } catch {
    fragment =
      compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        FRAGMENT_SHADER.replace(
          "precision highp float;",
          "precision mediump float;",
        ),
      );
  }

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

const SYNODIC_MONTH_MS =
  29.530588853 *
  24 *
  60 *
  60 *
  1000;

const MOON_PHASE_REFERENCE_MS =
  Date.UTC(
    2000,
    0,
    6,
    18,
    14,
    0,
  );

function clamp01(
  value: number,
): number {
  return Math.min(
    1,
    Math.max(
      0,
      value,
    ),
  );
}

function localDaylight(
  hour: number,
): number {
  return clamp01(
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
  );
}

function moonPresentation(
  now: Date,
): {
  x: number;
  strength: number;
} {
  const nowMs =
    now.getTime();

  const phase =
    (
      (
        nowMs -
        MOON_PHASE_REFERENCE_MS
      ) %
        SYNODIC_MONTH_MS +
      SYNODIC_MONTH_MS
    ) %
    SYNODIC_MONTH_MS /
    SYNODIC_MONTH_MS;

  const transitHour =
    (
      12 +
      phase * 24
    ) %
    24;

  const hour =
    now.getHours() +
    now.getMinutes() /
      60 +
    now.getSeconds() /
      3600;

  let hourFromTransit =
    hour -
    transitHour;

  while (
    hourFromTransit >
    12
  ) {
    hourFromTransit -= 24;
  }

  while (
    hourFromTransit <
    -12
  ) {
    hourFromTransit += 24;
  }

  const altitude =
    Math.max(
      0,
      Math.cos(
        (
          hourFromTransit /
          6
        ) *
          Math.PI /
          2,
      ),
    );

  const illuminated =
    (
      1 -
      Math.cos(
        phase *
          Math.PI *
          2,
      )
    ) /
    2;

  const transitOffset =
    clamp01(
      (
        hourFromTransit +
        6
      ) /
        12,
    );

  const x =
    0.82 +
    (
      0.18 -
      0.82
    ) *
      transitOffset;

  const day =
    localDaylight(hour);

  const darkness =
    1 -
    Math.min(
      1,
      day * 1.25,
    );

  const strength =
    altitude *
    Math.sqrt(illuminated) *
    darkness;

  return {
    x,
    strength,
  };
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
        powerPreference:
          "high-performance",
      },
    );

  if (!gl) {
    return null;
  }

  let program:
    WebGLProgram;

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

  const lightX =
    gl.getUniformLocation(
      program,
      "u_light_x",
    );

  const moonStrength =
    gl.getUniformLocation(
      program,
      "u_moon_strength",
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
            1.35,
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

        /*
         * Slightly higher budget than v1 because water detail is now the
         * visual reward of Stage 1, while still staying bounded on phones.
         */
        const pixelBudget =
          1_650_000;

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
            0.88,
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
          clamp01(
            (
              hour -
              5.5
            ) /
              13,
          );

        const sunX =
          0.08 +
          0.84 *
            sunProgress;

        const moon =
          moonPresentation(now);

        const activeLightX =
          day >
          0.12
            ? sunX
            : moon.x;

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

        if (lightX) {
          gl.uniform1f(
            lightX,
            activeLightX,
          );
        }

        if (moonStrength) {
          gl.uniform1f(
            moonStrength,
            moon.strength,
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
