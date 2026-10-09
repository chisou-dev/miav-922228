import type { AimingPull } from "./reentryAimInput";
import type { ReentryPhase, ReentryResult } from "./reentryTypes";
import type { SpaceApproachResult } from "./reentrySpaceApproach";
import {
  cameraMix,
  cockpitStress,
  playbackToFrameProgress,
  presentationHeatGlow,
} from "./reentryPlayback";
import { VISUAL } from "./reentryVisualParams";
import type { ReentryOutcome } from "./reentryTypes";
import {
  frameToWorld,
  heatTint,
  prefersReducedMotion,
  restFrame,
  sampleFrame,
  trailIntensity,
  visualUnit,
  type HeatTint,
  type Vec3,
} from "./reentryVisual";

export interface ReentryDrawState {
  phase: ReentryPhase;
  result: ReentryResult | null;
  flightProgress: number;
  /** Legacy drag aim — unused in power/angle launch UI. */
  aimingPull?: AimingPull | null;
  seed: number;
  angleNorm?: number;
  spaceApproach?: SpaceApproachResult | null;
  spaceShare?: number;
  /** Static image layers behind canvas; WebGL draws effects only. */
  hybridMode?: boolean;
}

const EARTH_VS = `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uMvp;
uniform mat4 uModel;
out vec3 vNormal;
out vec3 vWorld;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vWorld = world.xyz;
  vNormal = mat3(uModel) * aPos;
  gl_Position = uMvp * vec4(aPos, 1.0);
}`;

const EARTH_FS = `#version 300 es
precision mediump float;
in vec3 vNormal;
in vec3 vWorld;
out vec4 frag;
uniform vec3 uLight;
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i);
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
}
void main() {
  vec3 n = normalize(vNormal);
  float land = smoothstep(0.46, 0.62, noise(n * 3.1));
  float cloud = smoothstep(0.78, 0.9, noise(n * 7.0 + 4.0));
  vec3 ocean = vec3(0.055, 0.085, 0.105);
  vec3 shore = vec3(0.11, 0.115, 0.09);
  vec3 albedo = mix(ocean, shore, land);
  albedo = mix(albedo, vec3(0.16, 0.17, 0.16), cloud * 0.22);
  float day = smoothstep(-0.08, 0.55, dot(n, normalize(uLight)));
  vec3 night = vec3(0.012, 0.015, 0.02);
  frag = vec4(mix(night, albedo, day), 1.0);
}`;

const ATM_VS = `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uMvp;
uniform mat4 uModel;
out vec3 vNormal;
out vec3 vWorld;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vWorld = world.xyz;
  vNormal = mat3(uModel) * aPos;
  gl_Position = uMvp * vec4(aPos, 1.0);
}`;

const ATM_FS = `#version 300 es
precision mediump float;
in vec3 vNormal;
in vec3 vWorld;
out vec4 frag;
uniform vec3 uCam;
uniform float uRimAlpha;
void main() {
  vec3 n = normalize(vNormal);
  vec3 view = normalize(uCam - vWorld);
  float rim = pow(1.0 - abs(dot(n, view)), 3.1);
  vec3 col = vec3(0.38, 0.52, 0.62);
  frag = vec4(col, rim * uRimAlpha);
}`;

const POINT_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aColor;
layout(location=2) in float aSize;
uniform mat4 uViewProj;
out vec4 vColor;
void main() {
  gl_Position = uViewProj * vec4(aPos, 1.0);
  gl_PointSize = aSize;
  vColor = aColor;
}`;

const POINT_FS = `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 frag;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float a = smoothstep(1.0, 0.2, d) * vColor.a;
  frag = vec4(vColor.rgb, a);
}`;

const LINE_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aColor;
uniform mat4 uViewProj;
out vec4 vColor;
void main() {
  gl_Position = uViewProj * vec4(aPos, 1.0);
  vColor = aColor;
}`;

const LINE_FS = `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 frag;
void main() { frag = vColor; }`;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function program(
  gl: WebGL2RenderingContext,
  vs: string,
  fs: string,
): WebGLProgram {
  const programId = gl.createProgram();
  if (!programId) throw new Error("program");
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(programId, v);
  gl.attachShader(programId, f);
  gl.linkProgram(programId);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(programId, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(programId) ?? "";
    gl.deleteProgram(programId);
    throw new Error(log);
  }
  return programId;
}

function sphere(lat: number, lon: number): { pos: Float32Array; idx: Uint16Array } {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let y = 0; y <= lat; y++) {
    const v = y / lat;
    const theta = v * Math.PI;
    const st = Math.sin(theta);
    const ct = Math.cos(theta);
    for (let x = 0; x <= lon; x++) {
      const u = x / lon;
      const phi = u * Math.PI * 2;
      positions.push(Math.cos(phi) * st, ct, Math.sin(phi) * st);
    }
  }
  const stride = lon + 1;
  for (let y = 0; y < lat; y++) {
    for (let x = 0; x < lon; x++) {
      const a = y * stride + x;
      const b = a + stride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { pos: new Float32Array(positions), idx: new Uint16Array(indices) };
}

function identity(): Float32Array {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

function perspective(fovy: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const o = new Float32Array(16);
  o[0] = f / aspect;
  o[5] = f;
  o[10] = (far + near) * nf;
  o[11] = -1;
  o[14] = 2 * far * near * nf;
  return o;
}

function lookAt(eye: Vec3, target: Vec3, up: Vec3): Float32Array {
  const zx = eye.x - target.x;
  const zy = eye.y - target.y;
  const zz = eye.z - target.z;
  const zl = Math.hypot(zx, zy, zz) || 1;
  const zxn = zx / zl;
  const zyn = zy / zl;
  const zzn = zz / zl;
  const xx = up.y * zzn - up.z * zyn;
  const xy = up.z * zxn - up.x * zzn;
  const xz = up.x * zyn - up.y * zxn;
  const xl = Math.hypot(xx, xy, xz) || 1;
  const xxn = xx / xl;
  const xyn = xy / xl;
  const xzn = xz / xl;
  const yx = zyn * xzn - zzn * xyn;
  const yy = zzn * xxn - zxn * xzn;
  const yz = zxn * xyn - zyn * xxn;
  const o = new Float32Array(16);
  o[0] = xxn;
  o[1] = yx;
  o[2] = zxn;
  o[4] = xyn;
  o[5] = yy;
  o[6] = zyn;
  o[8] = xzn;
  o[9] = yz;
  o[10] = zzn;
  o[12] = -(xxn * eye.x + xyn * eye.y + xzn * eye.z);
  o[13] = -(yx * eye.x + yy * eye.y + yz * eye.z);
  o[14] = -(zxn * eye.x + zyn * eye.y + zzn * eye.z);
  o[15] = 1;
  return o;
}

function scaleMatrix(s: number): Float32Array {
  const m = identity();
  m[0] = s;
  m[5] = s;
  m[10] = s;
  return m;
}

function translateMatrix(x: number, y: number, z: number): Float32Array {
  const m = identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function mul(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function norm(a: Vec3): Vec3 {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

interface Mesh {
  vao: WebGLVertexArrayObject;
  count: number;
  mode: number;
}

export class ReentryGL {
  private gl: WebGL2RenderingContext;
  private earthProg: WebGLProgram;
  private atmProg: WebGLProgram;
  private pointProg: WebGLProgram;
  private lineProg: WebGLProgram;
  private earth: Mesh;
  private atm: Mesh;
  private starBuf: WebGLBuffer;
  private starCount: number;
  private dynPos: WebGLBuffer;
  private dynColor: WebGLBuffer;
  private dynSize: WebGLBuffer;
  private linePos: WebGLBuffer;
  private lineColor: WebGLBuffer;
  private pointVao: WebGLVertexArrayObject;
  private lineVao: WebGLVertexArrayObject;
  private eye: Vec3 = {
    x: VISUAL.readyCamera.x,
    y: VISUAL.readyCamera.y,
    z: VISUAL.readyCamera.z,
  };
  private lastDpr = 1;
  private lastMs = 0;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      powerPreference: "default",
    });
    if (!gl) throw new Error("webgl2");
    this.gl = gl;
    this.earthProg = program(gl, EARTH_VS, EARTH_FS);
    this.atmProg = program(gl, ATM_VS, ATM_FS);
    this.pointProg = program(gl, POINT_VS, POINT_FS);
    this.lineProg = program(gl, LINE_VS, LINE_FS);

    const earthMesh = sphere(40, 64);
    this.earth = this.uploadMesh(earthMesh.pos, earthMesh.idx, gl.TRIANGLES);
    this.atm = this.uploadMesh(earthMesh.pos, earthMesh.idx, gl.TRIANGLES);

    const stars = this.buildStars();
    this.starCount = stars.length / 8;
    this.starBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.starBuf);
    gl.bufferData(gl.ARRAY_BUFFER, stars, gl.STATIC_DRAW);

    this.dynPos = gl.createBuffer()!;
    this.dynColor = gl.createBuffer()!;
    this.dynSize = gl.createBuffer()!;
    this.linePos = gl.createBuffer()!;
    this.lineColor = gl.createBuffer()!;

    this.pointVao = gl.createVertexArray()!;
    this.lineVao = gl.createVertexArray()!;
    gl.clearColor(0.02, 0.03, 0.045, 1);
  }

  resize(cssWidth: number, cssHeight: number): void {
    const cap =
      cssWidth < VISUAL.mobileBreakpointPx
        ? VISUAL.maxDprMobile
        : VISUAL.maxDprDesktop;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    this.lastDpr = dpr;
    this.width = Math.max(1, Math.floor(cssWidth));
    this.height = Math.max(1, Math.floor(cssHeight));
    const canvas = this.gl.canvas as HTMLCanvasElement;
    canvas.width = Math.floor(this.width * dpr);
    canvas.height = Math.floor(this.height * dpr);
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    canvas.dataset.cssWidth = String(this.width);
    canvas.dataset.cssHeight = String(this.height);
    canvas.dataset.drawingBufferWidth = String(canvas.width);
    canvas.dataset.drawingBufferHeight = String(canvas.height);
    canvas.dataset.dpr = dpr.toFixed(2);
    this.gl.viewport(0, 0, canvas.width, canvas.height);
  }

  draw(state: ReentryDrawState): void {
    if (typeof document !== "undefined" && document.hidden) return;
    const gl = this.gl;
    const now = performance.now();
    const dt = this.lastMs === 0 ? 0.016 : Math.min(0.05, (now - this.lastMs) / 1000);
    this.lastMs = now;
    const reduced = prefersReducedMotion();

    const playback =
      state.phase === "result"
        ? 1
        : state.phase === "flight"
          ? state.flightProgress
          : 0;
    const outcome: ReentryOutcome | undefined = state.result?.outcome;
    const frameProgress =
      state.result && (state.phase === "flight" || state.phase === "result")
        ? playbackToFrameProgress(
            playback,
            outcome ?? "BURN",
          )
        : 0;
    const frame =
      state.result && (state.phase === "flight" || state.phase === "result")
        ? sampleFrame(state.result.frames, frameProgress)
        : restFrame(state.result);
    const world = frameToWorld(frame);
    const baseTint = heatTint(frame.heatFluxWm2);
    const presGlow = presentationHeatGlow(
      frame.heatFluxWm2,
      playback,
      outcome ?? "BURN",
    );
    const tint: HeatTint = {
      ...baseTint,
      glow: Math.min(
        1,
        baseTint.glow * (1 - 0.35) + presGlow * 0.65,
      ),
    };
    const stress = cockpitStress(
      frame.integrity,
      frame.dynamicPressurePa,
      playback,
      outcome ?? "BURN",
    );
    const mix = cameraMix(playback, outcome ?? "BURN");

    const prev =
      state.result?.frames.length
        ? sampleFrame(
            state.result.frames,
            Math.max(0, frameProgress - 0.012),
          )
        : frame;
    const vel = norm(sub(world, frameToWorld(prev)));
    const forward =
      Math.hypot(vel.x, vel.y, vel.z) > 0.2
        ? vel
        : { x: 0.15, y: -0.96, z: 0 };

    const exteriorEye = this.desiredExteriorEye(
      state,
      world,
      tint.glow,
      stress,
      reduced,
    );
    const interiorEye = this.desiredInteriorEye(
      world,
      forward,
      stress,
      state,
      reduced,
    );
    const desired = {
      x:
        exteriorEye.x * mix.exterior +
        interiorEye.x * mix.interior,
      y:
        exteriorEye.y * mix.exterior +
        interiorEye.y * mix.interior,
      z:
        exteriorEye.z * mix.exterior +
        interiorEye.z * mix.interior,
    };
    const follow = reduced ? 1 : 1 - Math.exp(-dt * 2.4);
    this.eye = lerpVec(
      this.eye,
      desired,
      state.phase === "flight" ? follow : 1,
    );

    const aspect = this.width / this.height;
    const fov = 0.72 - mix.interior * 0.12;
    const proj = perspective(fov, aspect, 0.05, 30);
    const extTarget = {
      x: world.x * 0.35,
      y: 0.78,
      z: 0,
    };
    const intTarget = add(world, mul(forward, 0.65));
    const target = {
      x: extTarget.x * mix.exterior + intTarget.x * mix.interior,
      y: extTarget.y * mix.exterior + intTarget.y * mix.interior,
      z: extTarget.z * mix.exterior + intTarget.z * mix.interior,
    };
    const view = lookAt(this.eye, target, { x: 0, y: 1, z: 0 });
    const viewProj = multiply(proj, view);

    const hybrid = state.hybridMode === true;
    if (hybrid) {
      gl.clearColor(0, 0, 0, 0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    if (!hybrid) {
      this.drawStars(viewProj);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);

    const idle = state.phase === "power" || state.phase === "angle";
    if (!hybrid) {
      const earthM = idle
        ? multiply(
            translateMatrix(0, VISUAL.earthReadyOffsetY, 0),
            scaleMatrix(VISUAL.earthReadyScale),
          )
        : identity();
      this.drawSolid(this.earthProg, this.earth, viewProj, earthM, this.eye, false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      const atmM = multiply(earthM, scaleMatrix(VISUAL.atmosphereScale));
      this.drawSolid(this.atmProg, this.atm, viewProj, atmM, this.eye, true);
    } else {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
    }

    if (
      mix.exterior > 0.12 &&
      state.result &&
      (state.phase === "flight" || state.phase === "result")
    ) {
      this.drawTrail(state, viewProj, frameProgress);
    }
    let craftPos = world;
    if (state.phase === "flight" && !reduced && mix.exterior > 0.2) {
      const inst = 1 - frame.integrity;
      const wobbleAmp =
        inst * 0.009 +
        stress * 0.006 +
        (outcome === "BREAK" ? stress * 0.012 : 0);
      if (wobbleAmp > 0.002) {
        const wobble =
          Math.sin(performance.now() * 0.055) * wobbleAmp;
        craftPos = {
          x: world.x + wobble,
          y: world.y + wobble * 0.35,
          z: world.z,
        };
      }
    }
    this.drawCraft(
      state,
      craftPos,
      frame,
      tint,
      viewProj,
      frameProgress,
      playback,
      mix,
      reduced,
    );
    this.drawCockpitOverlay(
      mix.interior,
      tint,
      stress,
      playback,
      outcome,
      reduced,
    );
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.earthProg);
    gl.deleteProgram(this.atmProg);
    gl.deleteProgram(this.pointProg);
    gl.deleteProgram(this.lineProg);
    gl.deleteBuffer(this.starBuf);
    gl.deleteBuffer(this.dynPos);
    gl.deleteBuffer(this.dynColor);
    gl.deleteBuffer(this.dynSize);
    gl.deleteBuffer(this.linePos);
    gl.deleteBuffer(this.lineColor);
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
  }

  private desiredExteriorEye(
    state: ReentryDrawState,
    craft: Vec3,
    glow: number,
    stress: number,
    reduced: boolean,
  ): Vec3 {
    if (state.phase === "power" || state.phase === "angle" || reduced) {
      return {
        x: VISUAL.readyCamera.x,
        y: VISUAL.readyCamera.y,
        z: VISUAL.readyCamera.z,
      };
    }
    const close = 0.22 * glow;
    const shake =
      state.result?.outcome === "BREAK"
        ? Math.sin(performance.now() * 0.07) * 0.014 * stress
        : Math.sin(performance.now() * 0.05) * 0.004 * stress;
    return {
      x: craft.x * 0.44 + shake,
      y: 0.5 + craft.y * 0.14,
      z: 2.02 - close,
    };
  }

  private desiredInteriorEye(
    craft: Vec3,
    forward: Vec3,
    stress: number,
    state: ReentryDrawState,
    reduced: boolean,
  ): Vec3 {
    const f = norm(forward);
    const shake =
      reduced || state.result?.outcome !== "BREAK"
        ? Math.sin(performance.now() * 0.08) * 0.003 * stress
        : Math.sin(performance.now() * 0.11) * 0.018 * stress;
    const back = mul(f, -0.045);
    return {
      x: craft.x + back.x + shake,
      y: craft.y + back.y + 0.018 + shake * 0.4,
      z: craft.z + back.z,
    };
  }

  private drawCockpitOverlay(
    interior: number,
    tint: HeatTint,
    stress: number,
    playback: number,
    outcome: ReentryOutcome | undefined,
    reduced: boolean,
  ): void {
    if (interior < 0.04) return;
    const gl = this.gl;
    const a = interior * (reduced ? 0.65 : 1);

    const frameLines: number[] = [];
    const frameCol: number[] = [];
    const pushLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      alpha: number,
    ) => {
      frameLines.push(x1, y1, 0, x2, y2, 0);
      const c = 0.72 + tint.glow * 0.2;
      frameCol.push(c, c, c, alpha, c, c, c, alpha);
    };

    pushLine(-0.82, 0.72, 0.82, 0.72, 0.22 * a);
    pushLine(-0.82, -0.78, 0.82, -0.78, 0.18 * a);
    pushLine(-0.82, 0.72, -0.74, -0.78, 0.16 * a);
    pushLine(0.82, 0.72, 0.74, -0.78, 0.16 * a);
    pushLine(-0.12, 0.72, 0, -0.7, 0.1 * a);
    pushLine(0.12, 0.72, 0, -0.7, 0.1 * a);

    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.lineProg, "uViewProj"),
      false,
      identity(),
    );
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.linePos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(frameLines), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineColor);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(frameCol), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, frameLines.length / 3);

    const glowAlpha = tint.glow * 0.35 * a;
    if (glowAlpha > 0.02) {
      const verts = new Float32Array([
        -0.7, 0.55, 0,
        0.7, 0.55, 0,
        0.7, -0.65, 0,
        -0.7, 0.55, 0,
        0.7, -0.65, 0,
        -0.7, -0.65, 0,
      ]);
      const cols = new Float32Array([
        tint.r, tint.g, tint.b, glowAlpha,
        tint.r, tint.g, tint.b, glowAlpha * 0.9,
        tint.r * 0.9, tint.g * 0.7, tint.b * 0.5, glowAlpha * 0.75,
        tint.r, tint.g, tint.b, glowAlpha,
        tint.r * 0.9, tint.g * 0.7, tint.b * 0.5, glowAlpha * 0.75,
        tint.r * 0.8, tint.g * 0.55, tint.b * 0.4, glowAlpha * 0.55,
      ]);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.linePos);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineColor);
      gl.bufferData(gl.ARRAY_BUFFER, cols, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    let whiteout = 0;
    if (outcome === "BURN" && playback > 0.72) {
      whiteout = Math.min(1, ((playback - 0.72) / 0.22) * tint.glow);
    }
    if (outcome === "BREAK" && playback > 0.78 && playback < 0.86) {
      whiteout = Math.max(whiteout, stress * 0.65);
    }
    if (whiteout > 0.05) {
      const wa = whiteout * a * 0.85;
      const verts = new Float32Array([
        -1, 1, 0, 1, 1, 0, 1, -1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
      ]);
      const cols = new Float32Array(30);
      for (let i = 0; i < 5; i++) {
        cols[i * 6] = 1;
        cols[i * 6 + 1] = 0.94;
        cols[i * 6 + 2] = 0.88;
        cols[i * 6 + 3] = wa;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.linePos);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineColor);
      gl.bufferData(gl.ARRAY_BUFFER, cols, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    const vignette = 0.35 * a;
    if (vignette > 0.05) {
      const v = new Float32Array([
        -1, -1, 0, 1, -1, 0, 1, -0.55, 0,
        -1, -1, 0, 1, -0.55, 0, -1, -0.55, 0,
      ]);
      const vc = new Float32Array([
        0, 0, 0, vignette, 0, 0, 0, vignette, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.linePos);
      gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineColor);
      gl.bufferData(gl.ARRAY_BUFFER, vc, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  private uploadMesh(pos: Float32Array, idx: Uint16Array, mode: number): Mesh {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: idx.length, mode };
  }

  private buildStars(): Float32Array {
    const count = VISUAL.starCount;
    const data = new Float32Array(count * 8);
    for (let i = 0; i < count; i++) {
      const u = visualUnit(1, i, 3);
      const v = visualUnit(1, i, 9);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 6.5;
      const o = i * 8;
      data[o] = r * Math.sin(phi) * Math.cos(theta);
      data[o + 1] = r * Math.cos(phi) * 0.65 + 1.2;
      data[o + 2] = r * Math.sin(phi) * Math.sin(theta);
      const a = 0.25 + visualUnit(1, i, 4) * 0.55;
      data[o + 3] = 0.9;
      data[o + 4] = 0.92;
      data[o + 5] = 0.95;
      data[o + 6] = a;
      data[o + 7] = 1.1 + visualUnit(1, i, 5) * 1.4;
    }
    return data;
  }

  private drawStars(viewProj: Float32Array): void {
    const gl = this.gl;
    gl.useProgram(this.pointProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.pointProg, "uViewProj"), false, viewProj);
    gl.bindVertexArray(this.pointVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.starBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 28);
    gl.drawArrays(gl.POINTS, 0, this.starCount);
  }

  private drawSolid(
    prog: WebGLProgram,
    mesh: Mesh,
    viewProj: Float32Array,
    model: Float32Array,
    cam: Vec3,
    atmosphere: boolean,
  ): void {
    const gl = this.gl;
    const mvp = multiply(viewProj, model);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uMvp"), false, mvp);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uModel"), false, model);
    if (atmosphere) {
      gl.uniform3f(gl.getUniformLocation(prog, "uCam"), cam.x, cam.y, cam.z);
      gl.uniform1f(
        gl.getUniformLocation(prog, "uRimAlpha"),
        VISUAL.atmosphereRimAlpha,
      );
    } else {
      gl.uniform3f(gl.getUniformLocation(prog, "uLight"), -0.45, 0.35, 0.82);
    }
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(mesh.mode, mesh.count, gl.UNSIGNED_SHORT, 0);
  }

  private drawTrail(
    state: ReentryDrawState,
    viewProj: Float32Array,
    progress: number,
  ): void {
    const frames = state.result?.frames ?? [];
    if (frames.length < 2) return;
    const end = Math.max(1, Math.floor(progress * (frames.length - 1)));
    const step = Math.max(1, Math.floor(end / 180));
    const pos: number[] = [];
    const col: number[] = [];
    for (let i = 0; i <= end; i += step) {
      const f = frames[i];
      const p = frameToWorld(f);
      const tint = heatTint(f.heatFluxWm2);
      const a = trailIntensity(f) * VISUAL.trailAlphaScale;
      pos.push(p.x, p.y, p.z);
      col.push(tint.r, tint.g, tint.b, a);
    }
    if (pos.length < 6) return;
    const gl = this.gl;
    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.lineProg, "uViewProj"), false, viewProj);
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.linePos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineColor);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(col), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINE_STRIP, 0, pos.length / 3);
  }

  private drawCraft(
    state: ReentryDrawState,
    world: Vec3,
    frame: ReturnType<typeof sampleFrame>,
    tint: HeatTint,
    viewProj: Float32Array,
    frameProgress: number,
    playback: number,
    mix: { interior: number; exterior: number },
    reduced: boolean,
  ): void {
    const seed = state.seed;
    const outcome = state.result?.outcome;
    const breaking =
      outcome === "BREAK" &&
      mix.exterior > 0.35 &&
      (state.phase === "result" ||
        frame.integrity < 0.35 ||
        frameProgress > 0.78);
    const burningOut =
      outcome === "BURN" &&
      mix.exterior > 0.25 &&
      (state.phase === "result" || playback > 0.84) &&
      tint.glow > 0.28;
    const bodyAlpha =
      (burningOut
        ? Math.max(0, 1 - Math.max(0, playback - 0.84) / 0.14)
        : 1) * mix.exterior;

    const prev = state.result
      ? sampleFrame(state.result.frames, Math.max(0, frameProgress - 0.01))
      : frame;
    const vel = norm(sub(world, frameToWorld(prev)));
    const forward =
      Math.hypot(vel.x, vel.y, vel.z) > 0.2
        ? vel
        : { x: 0.2, y: -0.98, z: 0 };

    if (!state.hybridMode) {
      if (!breaking && bodyAlpha > 0.04) {
        this.drawHull(world, forward, tint, bodyAlpha, viewProj, 1);
      }

      const glowSize = 8 + tint.glow * 22;
      if (mix.exterior > 0.15) {
        this.drawPoints(
          viewProj,
          [world.x, world.y, world.z],
          [tint.r, tint.g, tint.b, (0.12 + tint.glow * 0.65 * bodyAlpha) * mix.exterior],
          [reduced ? 6 : glowSize],
        );
      }
    }

    if (breaking) {
      const count = 2 + Math.floor(visualUnit(seed, 8, 1) * 3.2);
      const pos: number[] = [];
      const col: number[] = [];
      const size: number[] = [];
      for (let i = 0; i < count; i++) {
        const spread = (0.4 + visualUnit(seed, i, 2)) * (0.02 + (1 - frame.integrity) * 0.05);
        const side = visualUnit(seed, i, 3) * 2 - 1;
        const lift = visualUnit(seed, i, 4) * 2 - 1;
        const drag = 0.55 + visualUnit(seed, i, 5) * 0.7;
        const p = add(world, {
          x: forward.x * spread * drag + side * spread,
          y: forward.y * spread * drag * 0.4 + lift * spread * 0.3,
          z: (visualUnit(seed, i, 6) - 0.5) * spread,
        });
        const hot = heatTint(frame.heatFluxWm2 * (0.45 + visualUnit(seed, i, 7)));
        pos.push(p.x, p.y, p.z);
        col.push(hot.r, hot.g, hot.b, 0.85);
        size.push(3.5 + visualUnit(seed, i, 8) * 3);
      }
      this.drawPoints(viewProj, pos, col, size);
    }

    if (tint.glow > 0.25 && !reduced) {
      const n = Math.min(28, 6 + Math.floor(tint.glow * 22));
      const pos: number[] = [];
      const col: number[] = [];
      const size: number[] = [];
      for (let i = 0; i < n; i++) {
        const along = visualUnit(seed, i + 20, 1) * 0.06;
        const side = (visualUnit(seed, i + 20, 2) - 0.5) * 0.02;
        const p = add(world, mul(forward, -along));
        p.x += side;
        const fade = 1 - along / 0.06;
        pos.push(p.x, p.y, p.z);
        col.push(tint.r, tint.g, tint.b, fade * tint.glow * 0.7);
        size.push(2 + tint.glow * 4);
      }
      this.drawPoints(viewProj, pos, col, size);
    }
  }

  private drawHull(
    origin: Vec3,
    forward: Vec3,
    tint: ReturnType<typeof heatTint>,
    alpha: number,
    viewProj: Float32Array,
    scale: number,
  ): void {
    const f = norm(forward);
    const up0 = Math.abs(f.y) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const right = norm(cross(up0, f));
    const up = cross(f, right);
    const s = VISUAL.vehicleHullScale * scale;
    const local = [
      [0, 0, 1.3],
      [0.55, 0.12, -0.8],
      [-0.55, 0.12, -0.8],
      [0, -0.28, -0.55],
    ];
    const worldVerts = local.map(([x, y, z]) =>
      add(origin, add(add(mul(right, x * s), mul(up, y * s)), mul(f, z * s))),
    );
    const faces = [
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 1],
      [1, 3, 2],
    ];
    const pos: number[] = [];
    const col: number[] = [];
    const body = 0.78 + tint.glow * 0.2;
    for (const face of faces) {
      for (const vi of face) {
        const p = worldVerts[vi];
        pos.push(p.x, p.y, p.z);
        col.push(
          body * (0.7 + tint.r * tint.glow),
          body * (0.72 + tint.g * tint.glow),
          body * (0.75 + tint.b * tint.glow * 0.4),
          alpha,
        );
      }
    }
    const gl = this.gl;
    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.lineProg, "uViewProj"), false, viewProj);
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.linePos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineColor);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(col), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, pos.length / 3);
  }

  private drawGuide(pull: AimingPull, origin: Vec3, viewProj: Float32Array): void {
    const dx = pull.currentX - pull.startX;
    const dy = pull.currentY - pull.startY;
    const len = Math.hypot(dx, dy);
    if (len < 4) return;
    const reach = Math.min(0.16, len / 900);
    const end = {
      x: origin.x + (dx / len) * reach,
      y: origin.y - (dy / len) * reach,
      z: 0,
    };
    const gl = this.gl;
    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.lineProg, "uViewProj"), false, viewProj);
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.linePos);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([origin.x, origin.y, origin.z, end.x, end.y, end.z]),
      gl.DYNAMIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineColor);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0.96, 0.94, 0.9, 0.35, 0.96, 0.94, 0.9, 0.05]),
      gl.DYNAMIC_DRAW,
    );
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 2);
  }

  private drawPoints(
    viewProj: Float32Array,
    pos: number[],
    color: number[],
    size: number[],
  ): void {
    if (pos.length === 0) return;
    const gl = this.gl;
    gl.useProgram(this.pointProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.pointProg, "uViewProj"), false, viewProj);
    gl.bindVertexArray(this.pointVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynPos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynColor);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynSize);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(size), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, pos.length / 3);
  }
}

export function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}
