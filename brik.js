/* ═══════════════════════════════════════════
     히어로 섹션 유체 그라데이션 (중력 엔진 탑재)
     ═══════════════════════════════════════════ */

var canvas = document.getElementById('canvas');
var __ctArea = canvas ? canvas.parentElement : null;
var __maxDim = (window.innerWidth <= 768) ? 960 : 4096;

var _origGetContext = canvas.getContext.bind(canvas);
canvas.getContext = function(type, attrs) {
  if (type === 'webgl' || type === 'webgl2') {
    attrs = Object.assign({}, attrs || {}, { preserveDrawingBuffer: true, alpha: true });
  }
  return _origGetContext(type, attrs);
};

function resizeCanvas() {
  if (!__ctArea) return;
  var cs = getComputedStyle(__ctArea);
  var w = Math.max(1, __ctArea.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
  var h = Math.max(1, __ctArea.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
  canvas.width = Math.min(__maxDim, w);
  canvas.height = Math.min(__maxDim, h);
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);
if (typeof ResizeObserver !== 'undefined' && __ctArea) {
  new ResizeObserver(resizeCanvas).observe(__ctArea);
}
resizeCanvas();

var controls = (function() {
  // 💡 투명도 조절: "opacity":0.95 
  var _v = {"sourceImage":"images/hero/1.jpg","color1":"#125622","color2":"#87BD4F","color3":"#C0F083","color4":"#FFFFFF","playing":true,"speed":1.1,"grainSpeed":0,"sharpness":0,"flow":1,"noise":0.01,"opacity":0.80,"backdropBlur":90,"eraserOn":true,"eraseRadius":78,"eraserSoftness":1,"eraserFade":3};
  var _defaults = JSON.parse(JSON.stringify(_v));
  var _listeners = {};
  var _anyListeners = [];
  var _actionListeners = {};
  function _notify(key, value) {
    if (_listeners[key]) _listeners[key].forEach(function(fn) { fn(value); });
    _anyListeners.forEach(function(fn) { fn(key, value); });
  }
  function _hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function _clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function _hexToRgbaCss(hex, opacity0to100) {
    var rgb = _hexToRgb(hex);
    if (!rgb) return 'rgba(0,0,0,1)';
    var op = opacity0to100 != null && !isNaN(Number(opacity0to100)) ? Number(opacity0to100) : 100;
    var a = _clamp(op, 0, 100) / 100;
    return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')';
  }
  var api = {
    get: function(k) { return _v[k]; },
    getAll: function() { return Object.assign({}, _v); },
    getDefaults: function() { return JSON.parse(JSON.stringify(_defaults)); },
    getColorWithAlpha: function(baseKey) { return _hexToRgbaCss(_v[baseKey], _v[baseKey + '_opacity']); },
    set: function(k, v) { _v[k] = v; _notify(k, v); },
    setValues: function(values) {
      if (!values || typeof values !== 'object') return;
      Object.keys(values).forEach(function(k) {
        if (!(k in _v)) return;
        try { _v[k] = JSON.parse(JSON.stringify(values[k])); } catch (e) { _v[k] = values[k]; }
        _notify(k, _v[k]);
      });
    },
    setDefaults: function(values) {
      if (!values || typeof values !== 'object') return;
      Object.keys(values).forEach(function(k) {
        try { _defaults[k] = JSON.parse(JSON.stringify(values[k])); } catch (e) { _defaults[k] = values[k]; }
      });
    },
    resetAll: function() {
      Object.keys(_defaults).forEach(function(k) {
        try { _v[k] = JSON.parse(JSON.stringify(_defaults[k])); } catch (e) { _v[k] = _defaults[k]; }
        _notify(k, _v[k]);
      });
    },
    triggerAction: function(k) {
      if (_actionListeners[k]) _actionListeners[k].forEach(function(fn) { fn(); });
    },
    onChange: function(k, cb) {
      if (!_listeners[k]) _listeners[k] = [];
      _listeners[k].push(cb);
    },
    onAny: function(cb) { _anyListeners.push(cb); },
    onAction: function(k, cb) {
      if (!_actionListeners[k]) _actionListeners[k] = [];
      _actionListeners[k].push(cb);
    }
  };
  window.ControlsAPI = api;
  window.ChatoolyControls = api;
  
  api.getMousePos = function(event) {
    if (!canvas) return { x: 0, y: 0 };
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var touch = event.touches && event.touches[0] ? event.touches[0] : event.changedTouches && event.changedTouches[0] ? event.changedTouches[0] : null;
    var clientX = touch ? touch.clientX : event.clientX;
    var clientY = touch ? touch.clientY : event.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };
  window.CanvasRuntimeAPI = api;
  return api;
})();

{
const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true });

function ctrl(key, fallback) {
  try { const v = controls.get(key); return (v === undefined || v === null) ? fallback : v; } catch (e) { return fallback; }
}

let maskW = 0, maskH = 0;
let maskFbo = [null, null], maskTex = [null, null];
let maskRead = 0;

function makeTex(w, h) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function setupMask(w, h) {
  maskW = Math.max(1, w); maskH = Math.max(1, h);
  for (let i = 0; i < 2; i++) {
    if (maskTex[i]) gl.deleteTexture(maskTex[i]);
    if (maskFbo[i]) gl.deleteFramebuffer(maskFbo[i]);
    maskTex[i] = makeTex(maskW, maskH);
    maskFbo[i] = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, maskFbo[i]);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, maskTex[i], 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  maskRead = 0;
}

const vertSrc = `#version 300 es
in vec2 aPosition; out vec2 vUv;
void main(){ vUv = aPosition*0.5+0.5; gl_Position = vec4(aPosition,0.0,1.0); }`;

const brushFrag = `#version 300 es
precision highp float;
uniform sampler2D uPrev; uniform vec2 uPoint; uniform vec2 uPrevPoint; uniform float uRadius; uniform float uAspect; uniform float uSoftness;
in vec2 vUv; out vec4 fragColor;
float segDist(vec2 p, vec2 a, vec2 b){
  vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.0,1.0); return length(pa-ba*h);
}
void main(){
  vec4 prev=texture(uPrev,vUv); vec2 p=vUv; p.x*=uAspect; vec2 a=uPoint; a.x*=uAspect; vec2 b=uPrevPoint; b.x*=uAspect;
  float d=segDist(p,a,b); float innerFrac=mix(0.95,0.02,clamp(uSoftness,0.0,1.0));
  float add=1.0-smoothstep(uRadius*innerFrac,uRadius,d);
  float acc=max(prev.r,add); fragColor=vec4(acc,acc,acc,1.0);
}`;

const decayFrag = `#version 300 es
precision highp float; uniform sampler2D uPrev; uniform float uDecay;
in vec2 vUv; out vec4 fragColor;
void main(){ float v=texture(uPrev,vUv).r*uDecay; fragColor=vec4(v,v,v,1.0); }`;

const fluidFrag = `#version 300 es
precision highp float;
uniform float uTime; uniform vec2 uResolution; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3; uniform vec3 uColor4;
uniform float uSpeed; uniform float uGrainSpeed; uniform float uFlow; uniform float uNoise; uniform float uSharpness; uniform float uOpacity;
uniform sampler2D uMask; uniform sampler2D uBg; uniform float uHasBg; uniform float uBgAspect; uniform float uCanvasAspect; uniform float uBlur;
uniform vec2 uGyro; // 💡 자이로스코프 좌표 수신용 엔진 탑재 완료!
in vec2 vUv; out vec4 fragColor;

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy); vec3 x1=x0-i1+1.0*C.xxx; vec3 x2=x0-i2+2.0*C.xxx; vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0); vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec2 coverUv(vec2 uv){
  vec2 c=uv-0.5; float r=uCanvasAspect/uBgAspect; if(r>1.0) c.x*=r; else c.y/=r; return c+0.5;
}
vec3 blurBg(vec2 uv,float rad){
  if(rad<=0.0) return texture(uBg,coverUv(uv)).rgb;
  vec3 sum=vec3(0.0); float wsum=0.0;
  for(int i=-3;i<=3;i++){
    for(int j=-3;j<=3;j++){
      vec2 o=vec2(float(i),float(j))/3.0*rad; float w=exp(-(float(i*i+j*j))*0.35);
      sum+=texture(uBg,coverUv(uv+o)).rgb*w; wsum+=w;
    }
  }
  return sum/wsum;
}
void main(){
  vec2 uv=vUv; vec2 p=uv*2.0-1.0; p.x*=uResolution.x/uResolution.y; float t=uTime*uSpeed*0.2;

  // 💡 자이로스코프에서 받아온 좌표(uGyro)를 물감의 흐름 좌표에 실시간으로 더해줍니다!
  vec2 fp = p * uFlow + uGyro; 

  float n1=snoise(vec3(fp,t));
  float n2=snoise(vec3(fp+vec2(5.2,1.3),t+10.0));
  float n3=snoise(vec3(fp+vec2(-3.1,4.2),t+20.0));
  float n4=snoise(vec3(fp+vec2(2.5,-2.1),t+30.0));

  float grainTime=uTime*uGrainSpeed; float grain=hash(uv*uResolution+grainTime*10.0)*2.0-1.0;
  float edge0=mix(-0.2,0.45,uSharpness); float edge1=mix(0.8,0.55,uSharpness);
  n1=smoothstep(edge0,edge1,n1+grain*uNoise); n2=smoothstep(edge0,edge1,n2+grain*uNoise);
  n3=smoothstep(edge0,edge1,n3+grain*uNoise); n4=smoothstep(edge0,edge1,n4+grain*uNoise);

  vec3 pc=vec3(0.0); float a=0.0;
  pc+=uColor1*n1*(1.0-a); a+=n1*(1.0-a); pc+=uColor2*n2*(1.0-a); a+=n2*(1.0-a);
  pc+=uColor3*n3*(1.0-a); a+=n3*(1.0-a); pc+=uColor4*n4*(1.0-a); a+=n4*(1.0-a);

  float vignette=length(uv-0.5)*2.0; float mfac=1.0-vignette*0.3; mfac*=uOpacity;
  float mask=texture(uMask,uv).r; mfac*=(1.0-mask); mfac=clamp(mfac,0.0,1.0);
  pc*=mfac; float fa=clamp(a*mfac,0.0,1.0);

  if(uHasBg>0.5){
    vec3 sharpBg=texture(uBg,coverUv(uv)).rgb; vec3 softBg=blurBg(uv,uBlur*fa);
    vec3 bg=mix(sharpBg,softBg,fa); vec3 outRgb=pc+bg*(1.0-fa); fragColor=vec4(outRgb,1.0);
  } else {
    fragColor=vec4(pc,fa);
  }
}`;

function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;
}
function link(vs, fs) {
  const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p); return p;
}

const vs = compile(gl.VERTEX_SHADER, vertSrc);
const fluidProg = link(vs, compile(gl.FRAGMENT_SHADER, fluidFrag));
const brushProg = link(vs, compile(gl.FRAGMENT_SHADER, brushFrag));
const decayProg = link(vs, compile(gl.FRAGMENT_SHADER, decayFrag));

const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
function bindQuad(prog) {
  const a = gl.getAttribLocation(prog, 'aPosition'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
}

// 💡 U.gyro 연결 추가!
const U = {
  time: gl.getUniformLocation(fluidProg, 'uTime'), res: gl.getUniformLocation(fluidProg, 'uResolution'),
  c1: gl.getUniformLocation(fluidProg, 'uColor1'), c2: gl.getUniformLocation(fluidProg, 'uColor2'),
  c3: gl.getUniformLocation(fluidProg, 'uColor3'), c4: gl.getUniformLocation(fluidProg, 'uColor4'),
  speed: gl.getUniformLocation(fluidProg, 'uSpeed'), grainSpeed: gl.getUniformLocation(fluidProg, 'uGrainSpeed'),
  flow: gl.getUniformLocation(fluidProg, 'uFlow'), noise: gl.getUniformLocation(fluidProg, 'uNoise'),
  sharp: gl.getUniformLocation(fluidProg, 'uSharpness'), opacity: gl.getUniformLocation(fluidProg, 'uOpacity'),
  mask: gl.getUniformLocation(fluidProg, 'uMask'), bg: gl.getUniformLocation(fluidProg, 'uBg'),
  hasBg: gl.getUniformLocation(fluidProg, 'uHasBg'), bgAspect: gl.getUniformLocation(fluidProg, 'uBgAspect'),
  canvasAspect: gl.getUniformLocation(fluidProg, 'uCanvasAspect'), blur: gl.getUniformLocation(fluidProg, 'uBlur'),
  gyro: gl.getUniformLocation(fluidProg, 'uGyro') 
};
const B = {
  prev: gl.getUniformLocation(brushProg, 'uPrev'), point: gl.getUniformLocation(brushProg, 'uPoint'),
  prevPoint: gl.getUniformLocation(brushProg, 'uPrevPoint'), radius: gl.getUniformLocation(brushProg, 'uRadius'),
  aspect: gl.getUniformLocation(brushProg, 'uAspect'), softness: gl.getUniformLocation(brushProg, 'uSoftness'),
};
const DEC = { prev: gl.getUniformLocation(decayProg, 'uPrev'), decay: gl.getUniformLocation(decayProg, 'uDecay') };

function hexToRgb(hex) {
  hex = hex || '#000000'; return [ parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255 ];
}

let bgTex = makeTex(2, 2); let bgLoaded = false; let bgAspect = 1.0; let currentBgSrc = null;

function loadBgImage(src) {
  if (!src || src === currentBgSrc) return; currentBgSrc = src;
  const img = new Image(); if (!/^data:/i.test(src)) img.crossOrigin = 'anonymous';
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, bgTex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    bgAspect = img.width / img.height; bgLoaded = true;
  };
  img.src = src;
}
loadBgImage(ctrl('sourceImage', ''));

setupMask(canvas.width, canvas.height);
let lastW = canvas.width, lastH = canvas.height;

let pointerDown = false; let lastUv = null;
function eventUv(e) {
  const pos = window.CanvasRuntimeAPI.getMousePos(e);
  return { x: pos.x / canvas.width, y: 1.0 - pos.y / canvas.height };
}
function stamp(uvNow) {
  const write = 1 - maskRead;
  gl.bindFramebuffer(gl.FRAMEBUFFER, maskFbo[write]); gl.viewport(0, 0, maskW, maskH); gl.disable(gl.BLEND);
  gl.useProgram(brushProg); bindQuad(brushProg);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex[maskRead]); gl.uniform1i(B.prev, 0);
  gl.uniform2f(B.point, uvNow.x, uvNow.y); const prevP = lastUv || uvNow; gl.uniform2f(B.prevPoint, prevP.x, prevP.y);
  gl.uniform1f(B.radius, ctrl('eraseRadius', 40) / canvas.width); gl.uniform1f(B.aspect, canvas.width / canvas.height);
  gl.uniform1f(B.softness, ctrl('eraserSoftness', 0.6)); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  maskRead = write; lastUv = uvNow;
}

canvas.addEventListener('pointerdown', (e) => { if (!ctrl('eraserOn', false)) return; pointerDown = true; lastUv = null; stamp(eventUv(e)); });
canvas.addEventListener('pointermove', (e) => { if (!pointerDown || !ctrl('eraserOn', false)) return; stamp(eventUv(e)); });
window.addEventListener('pointerup', () => { pointerDown = false; lastUv = null; });

// --------------------------------------------------------------- GYROSCOPE (중력 흐름 로직)
let fluidOffsetX = 0; 
let fluidOffsetY = 0;
let targetVelocityX = 0; 
let targetVelocityY = 0;

window.addEventListener('deviceorientation', (e) => {
  if (e.gamma === null || e.beta === null) return;
  // 기울기 측정 (-1 ~ 1)
  let x = Math.max(-1, Math.min(1, e.gamma / 45)); 
  let y = Math.max(-1, Math.min(1, (e.beta - 45) / 45)); 
  
  // 💡 [폭풍 스피드 적용 완료! 0.15] 
  targetVelocityX = -x * 0.008; 
  targetVelocityY = y * 0.008; 
});

let time = 0; let last = performance.now();
function render(now) {
  const dt = now - last; last = now;
  if (canvas.width !== lastW || canvas.height !== lastH) { setupMask(canvas.width, canvas.height); lastW = canvas.width; lastH = canvas.height; }
  let playing = true; try { playing = controls.get('playing'); } catch (e) {}
  if (playing) time += dt * 0.001;

  const fadeT = ctrl('eraserFade', 3);
  if (fadeT > 0) {
    const dtSec = Math.min(dt * 0.001, 0.05); const perSecond = Math.pow(0.01, 1.0 / fadeT); const decay = Math.pow(perSecond, dtSec); const wDec = 1 - maskRead;
    gl.bindFramebuffer(gl.FRAMEBUFFER, maskFbo[wDec]); gl.viewport(0, 0, maskW, maskH); gl.disable(gl.BLEND);
    gl.useProgram(decayProg); bindQuad(decayProg); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex[maskRead]); gl.uniform1i(DEC.prev, 0);
    gl.uniform1f(DEC.decay, decay); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); maskRead = wDec;
  }

  // 💡 기울인 방향으로 물감 좌표를 "지속적으로" 누적 (계속 흘러내림)
  fluidOffsetX += targetVelocityX;
  fluidOffsetY += targetVelocityY;

  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(fluidProg); bindQuad(fluidProg);
  gl.uniform1f(U.time, time); gl.uniform2f(U.res, canvas.width, canvas.height);
  gl.uniform3fv(U.c1, hexToRgb(ctrl('color1', '#ff007f'))); gl.uniform3fv(U.c2, hexToRgb(ctrl('color2', '#FFF300')));
  gl.uniform3fv(U.c3, hexToRgb(ctrl('color3', '#B800FF'))); gl.uniform3fv(U.c4, hexToRgb(ctrl('color4', '#ff99ff')));
  gl.uniform1f(U.speed, ctrl('speed', 1)); gl.uniform1f(U.grainSpeed, ctrl('grainSpeed', 0)); gl.uniform1f(U.flow, ctrl('flow', 0.5));
  gl.uniform1f(U.noise, ctrl('noise', 0.14)); gl.uniform1f(U.sharp, ctrl('sharpness', 0)); gl.uniform1f(U.opacity, ctrl('opacity', 1));
  
  // 💡 누적된 흐름 좌표를 셰이더 엔진으로 발사!
  if(U.gyro) gl.uniform2f(U.gyro, fluidOffsetX, fluidOffsetY);

  const blurPx = ctrl('backdropBlur', 8); gl.uniform1f(U.hasBg, bgLoaded ? 1.0 : 0.0); gl.uniform1f(U.bgAspect, bgAspect);
  gl.uniform1f(U.canvasAspect, canvas.width / canvas.height); gl.uniform1f(U.blur, blurPx / Math.max(canvas.width, canvas.height) * 4.0);

  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex[maskRead]); gl.uniform1i(U.mask, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bgTex); gl.uniform1i(U.bg, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
}