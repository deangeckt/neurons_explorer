import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { parseSWCWithTree } from './dataLoader';

const MAX_SPIKES = 16;
const SPIKE_SPAWN_MS = 80;
const SPIKE_SPAWN_JITTER_MS = 60;
const WAVE_SPEED = 350; // SWC coord units per second — spike flare travel speed
const WAVE_WIDTH = 250; // gaussian sigma — wide so each flare covers a big section
const ROTATION_SPEED = 0.3; // radians per second
const LINE_WIDTH_PX = 6.0;

const VERTEX_SHADER = `
attribute vec3 aPosA;
attribute vec3 aPosB;
attribute float aSide;
attribute float aDistFromSoma;
attribute float aBranchTag;

uniform float uTime;
uniform vec4 uSpikes[${MAX_SPIKES}];   // (originDist, startTime, branchTag, _)
uniform vec2 uResolution;
uniform float uLineWidth;

varying float vFlare;
varying float vPhase;

void main() {
    vec4 clipA = projectionMatrix * modelViewMatrix * vec4(aPosA, 1.0);
    vec4 clipB = projectionMatrix * modelViewMatrix * vec4(aPosB, 1.0);
    vec4 clipP = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    vec2 ndcA = clipA.xy / clipA.w;
    vec2 ndcB = clipB.xy / clipB.w;
    vec2 sDir = (ndcB - ndcA) * uResolution * 0.5;
    float sLen = length(sDir);
    vec2 dir = (sLen > 0.001) ? sDir / sLen : vec2(1.0, 0.0);
    vec2 perp = vec2(-dir.y, dir.x);
    vec2 offsetNDC = perp * uLineWidth / uResolution;
    gl_Position = clipP + vec4(offsetNDC * clipP.w * aSide, 0.0, 0.0);

    // Spike flares: wide gaussians that travel and brighten whole sections.
    float flare = 0.0;
    for (int i = 0; i < ${MAX_SPIKES}; i++) {
        if (abs(aBranchTag - uSpikes[i].z) > 0.5) continue;
        float age = uTime - uSpikes[i].y;
        if (age < 0.0) continue;
        float wavePos = uSpikes[i].x + age * ${WAVE_SPEED.toFixed(1)};
        float d = aDistFromSoma - wavePos;
        flare += exp(-(d * d) / ${(WAVE_WIDTH * WAVE_WIDTH).toFixed(1)});
    }
    vFlare = flare;

    // Global always-on traveling color wave — blue↔red sweeps continuously
    // along the entire dendrite regardless of spikes.
    // Two overlapping sin waves at different frequencies for a richer shimmer.
    float travel = aDistFromSoma * 0.035 - uTime * 5.5;
    float travel2 = aDistFromSoma * 0.018 - uTime * 3.2;
    vPhase = clamp(sin(travel) * 0.6 + sin(travel2) * 0.4 + 0.5, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
varying float vFlare;
varying float vPhase;

const vec3 BLUE   = vec3(0.05, 0.45, 1.00);
const vec3 RED    = vec3(1.00, 0.15, 0.30);
const vec3 WHITE  = vec3(1.00, 1.00, 1.00);

void main() {
    // Base: full-brightness traveling color wave — always vivid, no dark patches.
    vec3 base = mix(BLUE, RED, vPhase);

    // Flare: spike-triggered brightness boost that washes toward white-hot.
    float f = clamp(vFlare, 0.0, 2.5);
    vec3 c = mix(base, WHITE, clamp(f * 0.55, 0.0, 1.0));
    // Extra white overshoot where multiple flares overlap.
    c += WHITE * max(f - 1.2, 0.0) * 0.5;

    gl_FragColor = vec4(c, 0.92);
}
`;

interface Props {
    onReady?: () => void;
}

const LoadingNeuron: React.FC<Props> = (props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const onReadyRef = useRef(props.onReady);
    onReadyRef.current = props.onReady;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 1, 100000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        const resolution = new THREE.Vector2(1, 1);
        const sizeRenderer = () => {
            const w = container.clientWidth || 1;
            const h = container.clientHeight || 1;
            renderer.setSize(w, h, false);
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            // Shader uses pixel-space math — pass the actual drawing-buffer size.
            const pr = renderer.getPixelRatio();
            resolution.set(w * pr, h * pr);
        };
        sizeRenderer();
        const resizeObserver = new ResizeObserver(sizeRenderer);
        resizeObserver.observe(container);

        const clock = new THREE.Clock();
        let rafId = 0;
        let disposed = false;
        let pivot: THREE.Group | null = null;
        let branchTags: number[] = [];
        const maxDistByTag = new Map<number, number>();
        let mesh: THREE.Mesh | null = null;
        let material: THREE.ShaderMaterial | null = null;
        let nextSpikeAt = 0;
        let nextSlot = 0;
        const spikes: THREE.Vector4[] = [];
        for (let i = 0; i < MAX_SPIKES; i++) {
            spikes.push(new THREE.Vector4(0, -1000, -1, 0));
        }

        const animate = () => {
            rafId = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();

            if (material) material.uniforms.uTime.value = t;
            if (pivot) pivot.rotation.y = t * ROTATION_SPEED;

            if (mesh && branchTags.length > 0) {
                while (t >= nextSpikeAt) {
                    const tag = branchTags[Math.floor(Math.random() * branchTags.length)];
                    const maxDist = maxDistByTag.get(tag) ?? 0;
                    const originDist = Math.random() * maxDist - WAVE_WIDTH;
                    spikes[nextSlot].set(originDist, t, tag, 0);
                    nextSlot = (nextSlot + 1) % MAX_SPIKES;
                    nextSpikeAt = t + (SPIKE_SPAWN_MS + (Math.random() * 2 - 1) * SPIKE_SPAWN_JITTER_MS) / 1000;
                }
            }

            renderer.render(scene, camera);
        };

        const url = `${process.env.PUBLIC_URL ?? ''}/loading_neuron.swc`;
        fetch(url)
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error('not found'))))
            .then((text) => {
                if (disposed) return;
                const tree = parseSWCWithTree(text);
                if (tree.segments.length === 0) return;

                // Dendrite-only: drop axon (tid===2).
                const dendriteIdx: number[] = [];
                for (let s = 0; s < tree.segments.length; s++) {
                    if (tree.segments[s].tid !== 2) dendriteIdx.push(s);
                }
                if (dendriteIdx.length === 0) return;

                const N = dendriteIdx.length;
                // 4 verts per segment: (A,-1), (A,+1), (B,-1), (B,+1)
                const position = new Float32Array(N * 4 * 3);
                const aPosA = new Float32Array(N * 4 * 3);
                const aPosB = new Float32Array(N * 4 * 3);
                const aSide = new Float32Array(N * 4);
                const aDist = new Float32Array(N * 4);
                const aTag = new Float32Array(N * 4);
                const indices = new Uint32Array(N * 6);

                let bbMinX = Infinity,
                    bbMinY = Infinity,
                    bbMinZ = Infinity;
                let bbMaxX = -Infinity,
                    bbMaxY = -Infinity,
                    bbMaxZ = -Infinity;

                for (let k = 0; k < N; k++) {
                    const s = dendriteIdx[k];
                    const seg = tree.segments[s];
                    const ax = seg.x1,
                        ay = -seg.y1,
                        az = seg.z1; // Y-inverted to match main scene
                    const bx = seg.x2,
                        by = -seg.y2,
                        bz = seg.z2;
                    const distA = tree.aDistFromSoma[s * 2];
                    const distB = tree.aDistFromSoma[s * 2 + 1];
                    // One tag per segment — pick the child endpoint's tag so each
                    // segment cleanly belongs to the branch it's part of.
                    const tag = tree.aBranchTag[s * 2 + 1];

                    if (ax < bbMinX) bbMinX = ax;
                    if (ay < bbMinY) bbMinY = ay;
                    if (az < bbMinZ) bbMinZ = az;
                    if (ax > bbMaxX) bbMaxX = ax;
                    if (ay > bbMaxY) bbMaxY = ay;
                    if (az > bbMaxZ) bbMaxZ = az;
                    if (bx < bbMinX) bbMinX = bx;
                    if (by < bbMinY) bbMinY = by;
                    if (bz < bbMinZ) bbMinZ = bz;
                    if (bx > bbMaxX) bbMaxX = bx;
                    if (by > bbMaxY) bbMaxY = by;
                    if (bz > bbMaxZ) bbMaxZ = bz;

                    const v = k * 4;
                    // v0: A, -1
                    position[v * 3 + 0] = ax;
                    position[v * 3 + 1] = ay;
                    position[v * 3 + 2] = az;
                    aPosA[v * 3 + 0] = ax;
                    aPosA[v * 3 + 1] = ay;
                    aPosA[v * 3 + 2] = az;
                    aPosB[v * 3 + 0] = bx;
                    aPosB[v * 3 + 1] = by;
                    aPosB[v * 3 + 2] = bz;
                    aSide[v] = -1;
                    aDist[v] = distA;
                    aTag[v] = tag;
                    // v1: A, +1
                    position[(v + 1) * 3 + 0] = ax;
                    position[(v + 1) * 3 + 1] = ay;
                    position[(v + 1) * 3 + 2] = az;
                    aPosA[(v + 1) * 3 + 0] = ax;
                    aPosA[(v + 1) * 3 + 1] = ay;
                    aPosA[(v + 1) * 3 + 2] = az;
                    aPosB[(v + 1) * 3 + 0] = bx;
                    aPosB[(v + 1) * 3 + 1] = by;
                    aPosB[(v + 1) * 3 + 2] = bz;
                    aSide[v + 1] = 1;
                    aDist[v + 1] = distA;
                    aTag[v + 1] = tag;
                    // v2: B, -1
                    position[(v + 2) * 3 + 0] = bx;
                    position[(v + 2) * 3 + 1] = by;
                    position[(v + 2) * 3 + 2] = bz;
                    aPosA[(v + 2) * 3 + 0] = ax;
                    aPosA[(v + 2) * 3 + 1] = ay;
                    aPosA[(v + 2) * 3 + 2] = az;
                    aPosB[(v + 2) * 3 + 0] = bx;
                    aPosB[(v + 2) * 3 + 1] = by;
                    aPosB[(v + 2) * 3 + 2] = bz;
                    aSide[v + 2] = -1;
                    aDist[v + 2] = distB;
                    aTag[v + 2] = tag;
                    // v3: B, +1
                    position[(v + 3) * 3 + 0] = bx;
                    position[(v + 3) * 3 + 1] = by;
                    position[(v + 3) * 3 + 2] = bz;
                    aPosA[(v + 3) * 3 + 0] = ax;
                    aPosA[(v + 3) * 3 + 1] = ay;
                    aPosA[(v + 3) * 3 + 2] = az;
                    aPosB[(v + 3) * 3 + 0] = bx;
                    aPosB[(v + 3) * 3 + 1] = by;
                    aPosB[(v + 3) * 3 + 2] = bz;
                    aSide[v + 3] = 1;
                    aDist[v + 3] = distB;
                    aTag[v + 3] = tag;

                    const ii = k * 6;
                    indices[ii + 0] = v + 0;
                    indices[ii + 1] = v + 2;
                    indices[ii + 2] = v + 1;
                    indices[ii + 3] = v + 1;
                    indices[ii + 4] = v + 2;
                    indices[ii + 5] = v + 3;
                }

                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
                geo.setAttribute('aPosA', new THREE.BufferAttribute(aPosA, 3));
                geo.setAttribute('aPosB', new THREE.BufferAttribute(aPosB, 3));
                geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
                geo.setAttribute('aDistFromSoma', new THREE.BufferAttribute(aDist, 1));
                geo.setAttribute('aBranchTag', new THREE.BufferAttribute(aTag, 1));
                geo.setIndex(new THREE.BufferAttribute(indices, 1));

                material = new THREE.ShaderMaterial({
                    vertexShader: VERTEX_SHADER,
                    fragmentShader: FRAGMENT_SHADER,
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                    uniforms: {
                        uTime: { value: 0 },
                        uSpikes: { value: spikes },
                        uResolution: { value: resolution },
                        uLineWidth: { value: LINE_WIDTH_PX },
                    },
                });

                mesh = new THREE.Mesh(geo, material);
                // Disable frustum culling — our shader displaces vertices in
                // screen space, so Three's bounding-box culling is unreliable.
                mesh.frustumCulled = false;

                // Center the mesh on its bounding box so rotation feels balanced.
                const cx = (bbMinX + bbMaxX) * 0.5;
                const cy = (bbMinY + bbMaxY) * 0.5;
                const cz = (bbMinZ + bbMaxZ) * 0.5;
                mesh.position.set(-cx, -cy, -cz);

                pivot = new THREE.Group();
                pivot.add(mesh);
                scene.add(pivot);

                // Fit camera to bounds.
                const dx = bbMaxX - bbMinX;
                const dy = bbMaxY - bbMinY;
                const dz = bbMaxZ - bbMinZ;
                const maxDim = Math.max(dx, dy, dz, 1);
                const dist = (maxDim * 0.6) / Math.tan((camera.fov * Math.PI) / 360);
                camera.position.set(0, 0, dist);
                camera.lookAt(0, 0, 0);

                // Spike-scheduler tag set, restricted to vertices we actually drew.
                const seen = new Set<number>();
                for (let k = 0; k < aTag.length; k++) {
                    const t = aTag[k];
                    if (t < 0) continue;
                    seen.add(t);
                    const d = aDist[k];
                    const prev = maxDistByTag.get(t);
                    if (prev === undefined || d > prev) maxDistByTag.set(t, d);
                }
                branchTags = Array.from(seen);

                // Pre-fill all spike slots immediately so the very first rendered
                // frame already has maximum flare activity — no scheduler warm-up.
                const t0 = clock.getElapsedTime();
                for (let si = 0; si < MAX_SPIKES; si++) {
                    const tag = branchTags[si % branchTags.length];
                    const maxDist = maxDistByTag.get(tag) ?? 0;
                    const originDist = Math.random() * maxDist - WAVE_WIDTH;
                    // Stagger start times slightly so flares don't all peak at once.
                    spikes[si].set(originDist, t0 - Math.random() * 0.8, tag, 0);
                }
                nextSlot = 0;
                nextSpikeAt = t0;

                onReadyRef.current?.();
            })
            .catch(() => {
                onReadyRef.current?.();
            });

        animate();

        return () => {
            disposed = true;
            cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
            if (mesh) mesh.geometry.dispose();
            if (material) material.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default LoadingNeuron;
