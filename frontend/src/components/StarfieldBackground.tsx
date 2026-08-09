'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export const StarfieldBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Config parameters
    const CONFIG = {
      bgColor: '#0a0a24',
      flameColor: '#aee9ff',
      flameColor2: '#c79bff',
      flameAmt: 0.2,
      colorA: '#aef6cf',
      colorB: '#5fe6a0',
      colorC: '#eafff2',
      opacity: 2,
      pointSize: 50,
      brightness: 1.85,
      drift: 2.35,
      twinkle: 1,
      spin: 0.03,
      repelRadius: 5,
      repelStrength: 0.35,
      scrollPush: 8,
      scrollDrift: 6,
      scrollSpin: 0.1,
      parallax: 0.6,
    };

    const hexToVec3 = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
    };

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 0, 15);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 80);
    camera.position.set(0, 0, 5);
    scene.add(camera);

    // Renderer - Capped pixel ratio and disabled shadows for massive performance boost
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Geometry
    const count = 4200;
    const depth = 30;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);
    const palette = new Float32Array(count);
    const bright = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 24;
      positions[i3 + 1] = (Math.random() - 0.5) * 16;
      positions[i3 + 2] = (Math.random() - 0.5) * 30;

      palette[i] = Math.floor(Math.random() * 3);
      bright[i] = 0.7 + Math.random() * 0.6;
      scales[i] = 0.5 + Math.pow(Math.random(), 1.4) * 2.5;
      phases[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aPalette', new THREE.BufferAttribute(palette, 1));
    geometry.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));

    // Shader Material
    const uniforms = {
      uTime: { value: 0 },
      uSize: { value: CONFIG.pointSize },
      uOpacity: { value: 0 },
      uDrift: { value: 0 },
      uDepth: { value: depth },
      uTwinkle: { value: CONFIG.twinkle },
      uCursor: { value: new THREE.Vector3() },
      uRepelRadius: { value: CONFIG.repelRadius },
      uRepelStrength: { value: CONFIG.repelStrength },
      uActivity: { value: 0 },
      uColorA: { value: hexToVec3(CONFIG.colorA) },
      uColorB: { value: hexToVec3(CONFIG.colorB) },
      uColorC: { value: hexToVec3(CONFIG.colorC) },
      uBrightness: { value: CONFIG.brightness },
    };

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
      vertexShader: `
        uniform float uTime; uniform float uSize; uniform float uDrift; uniform float uDepth; uniform float uTwinkle;
        uniform vec3 uCursor; uniform float uRepelRadius; uniform float uRepelStrength; uniform float uActivity;
        uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC;
        attribute float aScale; attribute float aPhase; attribute float aPalette; attribute float aBright;
        varying vec3 vColor; varying float vTwinkle;
        void main() {
          vec3 pos = position;
          pos.z = mod(pos.z + uDrift + (uDepth * 0.5), uDepth) - (uDepth * 0.5);

          float tw = sin(uTime * 1.6 + aPhase * 6.2831);
          vTwinkle = (1.0 - uTwinkle) + uTwinkle * (0.55 + 0.45 * tw);

          vec4 modelPosition = modelMatrix * vec4(pos, 1.0);

          vec3 toParticle = modelPosition.xyz - uCursor;
          float dist = length(toParticle);
          float falloff = smoothstep(uRepelRadius, 0.0, dist);
          modelPosition.xyz += normalize(toParticle + vec3(0.0001)) * falloff * uRepelStrength * uActivity;

          vec4 viewPosition = viewMatrix * modelPosition;
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = uSize * aScale;
          gl_PointSize *= (1.0 / -viewPosition.z);

          vec3 base = aPalette < 0.5 ? uColorA : (aPalette < 1.5 ? uColorB : uColorC);
          vColor = base * aBright;
        }
      `,
      fragmentShader: `
        uniform float uOpacity; uniform float uBrightness;
        varying vec3 vColor; varying float vTwinkle;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float strength = pow(1.0 - d * 2.0, 4.0);
          vec3 color = mix(vec3(0.0), vColor, strength);
          gl_FragColor = vec4(color * uBrightness, strength * uOpacity * vTwinkle);
        }
      `,
    });

    const points = new THREE.Points(geometry, material);
    const group = new THREE.Group();
    group.add(points);
    scene.add(group);

    // Composers
    const renderScene = new RenderPass(scene, camera);

    // Final Composite Pass Shader (Simplified to render background flame and points directly)
    const FinalPassShader = {
      uniforms: {
        iTime: { value: 0 },
        tDiffuse: { value: null },
        uBg: { value: hexToVec3(CONFIG.bgColor) },
        uFlameA: { value: hexToVec3(CONFIG.flameColor) },
        uFlameB: { value: hexToVec3(CONFIG.flameColor2) },
        uFlameAmt: { value: CONFIG.flameAmt },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float iTime;
        uniform sampler2D tDiffuse;
        uniform vec3 uBg;
        uniform vec3 uFlameA;
        uniform vec3 uFlameB;
        uniform float uFlameAmt;
        varying vec2 vUv;

        vec3 warp3d(vec3 pos, float t) {
          float curv = 0.8, a = 1.9, b = 0.7;
          pos *= 2.0;
          pos.x += curv * sin(t + a * pos.y) + t * b;
          pos.y += curv * cos(t + a * pos.x);
          pos.y += curv * sin(t + a * pos.z) + t * b;
          pos.z += curv * cos(t + a * pos.y);
          pos.z += curv * sin(t + a * pos.x) + t * b;
          pos.x += curv * cos(t + a * pos.z);
          return 0.5 + 0.5 * cos(pos.xyz + vec3(1.0, 2.0, 4.0));
        }

        void main() {
          vec2 uv = 2.0 * vUv - 1.0;
          vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime * 1.5), vec3(1.5));
          vec3 flame = 1.5 * uFlameA * w.x;
          flame *= w.y;
          flame += uFlameB * w.z;
          flame *= smoothstep(0.25, 1.0, abs(uv.y));
          float md = smoothstep(-0.7, 1.0, -uv.y * uv.x);
          flame *= md * md;
          vec3 bg = uBg * (1.0 - 0.4 * length(uv));
          gl_FragColor = vec4(
            bg + flame * uFlameAmt +
            texture2D(tDiffuse, vUv).xyz,
            1.0
          );
        }
      `,
    };

    const finalPass = new ShaderPass(FinalPassShader);

    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(finalPass);

    // Interaction & Logic
    const POINTER = {
      world: new THREE.Vector3(),
      activity: 0,
      ndc: { x: 0, y: 0 },
      active: false,
      lastMove: 0,
    };

    const mouseSmooth = { x: 0, y: 0 };
    let scrollTarget = 0;
    let scrollSmooth = 0;
    let scrollCurrent = 0;

    const handleMouseMove = (e: MouseEvent) => {
      POINTER.ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
      POINTER.ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
      POINTER.active = true;
      POINTER.lastMove = performance.now();
    };

    const handleMouseLeave = () => {
      POINTER.active = false;
    };

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        scrollTarget = Math.max(0, Math.min(1, window.scrollY / scrollHeight));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll);

    // NDC to World plane intersection logic
    const raycaster = new THREE.Raycaster();
    const updatePointer = () => {
      if (POINTER.active) {
        raycaster.setFromCamera(new THREE.Vector2(POINTER.ndc.x, POINTER.ndc.y), camera);
        const dir = raycaster.ray.direction;
        if (Math.abs(dir.z) > 1e-4) {
          const t = -camera.position.z / dir.z;
          if (t > 0) {
            const target = raycaster.ray.origin.clone().add(dir.clone().multiplyScalar(t));
            POINTER.world.lerp(target, 0.12);
          }
        }
      } else {
        POINTER.world.lerp(new THREE.Vector3(0, 0, 0), 0.12);
      }

      const idle = (performance.now() - POINTER.lastMove) / 1000;
      const want = POINTER.active && idle < 3 ? 1 : 0;
      POINTER.activity += (want - POINTER.activity) * 0.06;

      uniforms.uCursor.value.copy(POINTER.world);
      uniforms.uActivity.value = POINTER.activity;
    };

    // Render loop
    const appearStart = performance.now();
    let t0 = performance.now() / 1000;
    let uDrift = 0;
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Damp scroll and mouse parallax offsets
      scrollSmooth += (scrollTarget - scrollSmooth) * 0.1;
      scrollCurrent += (scrollSmooth - scrollCurrent) * 0.06;

      mouseSmooth.x += (POINTER.ndc.x - mouseSmooth.x) * 0.06;
      mouseSmooth.y += (POINTER.ndc.y - mouseSmooth.y) * 0.06;

      const t = performance.now() / 1000;
      const dt = Math.min(0.05, t - t0);
      t0 = t;

      // Update uniforms & transformations
      uniforms.uTime.value = t;
      uDrift += dt * (CONFIG.drift + scrollCurrent * CONFIG.scrollDrift);
      uniforms.uDrift.value = uDrift;

      // Appear fade
      const elapsed = performance.now() - appearStart;
      const fade = Math.max(0, Math.min(1, (elapsed - 300) / 1400));
      uniforms.uOpacity.value = fade * CONFIG.opacity;

      // Spin & Camera movement
      group.rotation.z += dt * (CONFIG.spin + scrollCurrent * CONFIG.scrollSpin);
      camera.position.set(mouseSmooth.x * CONFIG.parallax, mouseSmooth.y * CONFIG.parallax, 5 - scrollCurrent * CONFIG.scrollPush);
      camera.lookAt(mouseSmooth.x * CONFIG.parallax, mouseSmooth.y * CONFIG.parallax, -10);

      // Compositing sequence
      finalPass.uniforms.iTime.value = t;
      updatePointer();

      finalComposer.render();
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      finalComposer.setSize(width, height);
      handleScroll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full z-0 pointer-events-none overflow-hidden bg-black">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyan-400/40 uppercase tracking-[0.3em] animate-pulse">
        Scroll ↓ to dive
      </div>
    </div>
  );
};
