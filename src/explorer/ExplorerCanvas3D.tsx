import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RenderedNeuron, SynapsePoint } from './types';

interface Props {
    neurons: RenderedNeuron[];
    synapses: SynapsePoint[];
}

// Cortical layer boundaries (µm depth from pia, SWC y-space)
const LAYER_DEPTHS: Record<string, number> = {
    'L2/3': 250,
    L4: 350,
    L5: 510,
    L6: 740,
};
const LAYER_COLOR = 0x999999;

// Circular synapse sprite — created once
const circleTexture = (() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
})();

// Build a canvas-based text sprite (label floating in 3D space)
function makeLabel(text: string, fontSize = 36, color = '#555555'): THREE.Sprite {
    const DPR = 3; // supersampling for sharp text
    const W = 256 * DPR;
    const H = 72 * DPR;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 8, H / DPR / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
}

// Build a thin line from (x1,y1,z1) to (x2,y2,z2)
function makeLine(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    color: number,
    opacity = 0.45,
): THREE.Line {
    const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, y1, z1),
        new THREE.Vector3(x2, y2, z2),
    ]);
    const mat = new THREE.LineBasicMaterial({ color, opacity, transparent: true });
    return new THREE.Line(geo, mat);
}

// Dispose and remove all dynamic scene objects
function clearDynamic(scene: THREE.Scene) {
    const toRemove = scene.children.filter((c) => c.userData.dynamic);
    toRemove.forEach((c) => {
        scene.remove(c);
        if ((c as any).geometry) (c as any).geometry.dispose();
        const mat = (c as any).material;
        if (mat) {
            if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
            else mat.dispose();
        }
    });
}

function tag<T extends THREE.Object3D>(obj: T): T {
    obj.userData.dynamic = true;
    return obj;
}

const ExplorerCanvas3D: React.FC<Props> = ({ neurons, synapses }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const frameRef = useRef<number>(0);

    // Initialise Three.js once
    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
            60,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            1,
            100000,
        );
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        rendererRef.current = renderer;
        containerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        scene.add(new THREE.AmbientLight(0xffffff, 1.0));

        const animate = () => {
            frameRef.current = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!containerRef.current) return;
            camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(frameRef.current);
            window.removeEventListener('resize', handleResize);
            controls.dispose();
            renderer.dispose();
            if (containerRef.current?.contains(renderer.domElement)) {
                containerRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    // Rebuild scene whenever neurons / synapses change
    useEffect(() => {
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!scene) return;

        clearDynamic(scene);
        if (neurons.length === 0 && synapses.length === 0) return;

        const allPositions: THREE.Vector3[] = [];

        // ── Neurons ──────────────────────────────────────────────────────────
        for (const neuron of neurons) {
            if (neuron.segments.length === 0) continue;
            const positions = new Float32Array(neuron.segments.length * 6);
            let i = 0;
            for (const seg of neuron.segments) {
                // Y-axis inverted: cortical depth increases downward in SWC,
                // so we negate Y to match ax.invert_yaxis() from viz.py.
                positions[i++] = seg.x1;
                positions[i++] = -seg.y1;
                positions[i++] = seg.z1;
                positions[i++] = seg.x2;
                positions[i++] = -seg.y2;
                positions[i++] = seg.z2;
                allPositions.push(new THREE.Vector3(seg.x2, -seg.y2, seg.z2));
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.LineBasicMaterial({
                color: new THREE.Color(neuron.color),
                opacity: neuron.opacity,
                transparent: neuron.opacity < 1,
            });
            scene.add(tag(new THREE.LineSegments(geo, mat)));
        }

        // ── Synapses ─────────────────────────────────────────────────────────
        if (synapses.length > 0) {
            const pts = new Float32Array(synapses.length * 3);
            synapses.forEach((s, i) => {
                pts[i * 3] = s.x;
                pts[i * 3 + 1] = -s.y; // Y-inverted
                pts[i * 3 + 2] = s.z;
                allPositions.push(new THREE.Vector3(s.x, -s.y, s.z));
            });
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
            const mat = new THREE.PointsMaterial({
                color: 0xff0000,
                size: 12,
                map: circleTexture,
                transparent: true,
                alphaTest: 0.5,
                sizeAttenuation: true,
            });
            scene.add(tag(new THREE.Points(geo, mat)));
        }

        // ── Bounding box ──────────────────────────────────────────────────────
        const box = new THREE.Box3().setFromPoints(allPositions);
        const center = box.getCenter(new THREE.Vector3());
        const bSize = box.getSize(new THREE.Vector3());

        const xMin = box.min.x - 40;
        const xMax = box.max.x + 40;
        const zMid = center.z;
        // Sprite scale proportional to scene width
        const spriteW = bSize.x * 0.14;
        const spriteH = spriteW * 0.28;

        // ── Cortical layer lines ──────────────────────────────────────────────
        // LAYER_DEPTHS are in SWC y-space (depth from pia, positive downward).
        // After Y-inversion in Three.js: yThree = -ySWC, so depth=250 → y=-250.
        // Labels are centred vertically between consecutive boundaries.
        let prevDepth = 0;
        for (const [name, depthMicrons] of Object.entries(LAYER_DEPTHS)) {
            const yThree = -depthMicrons;
            const yMid = -((depthMicrons + prevDepth) / 2);
            // Horizontal dashed line across X extent
            const line = makeLine(xMin, yThree, zMid, xMax, yThree, zMid, LAYER_COLOR, 0.4);
            scene.add(tag(line));

            // Label centred between this boundary and the previous one
            const label = makeLabel(name, 40, '#666666');
            label.scale.set(spriteW, spriteH, 1);
            label.position.set(xMin - spriteW * 0.6, yMid, zMid);
            scene.add(tag(label));

            prevDepth = depthMicrons;
        }

        // ── Floating X / Y axis indicator ────────────────────────────────────
        // Placed at the bottom-left corner of the bounding box
        const axLen = Math.min(bSize.x, bSize.y) * 0.15;
        const axOrigin = new THREE.Vector3(xMin, box.min.y - axLen * 0.4, zMid);

        // X axis (red, pointing right)
        const xArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            axOrigin,
            axLen,
            0xcc3333,
            axLen * 0.2,
            axLen * 0.12,
        );
        scene.add(tag(xArrow));
        const xLabel = makeLabel('X', 32, '#cc3333');
        xLabel.scale.set(spriteW * 0.6, spriteH * 0.6, 1);
        xLabel.position.set(axOrigin.x + axLen * 1.2, axOrigin.y, zMid);
        scene.add(tag(xLabel));

        // Y axis (green, pointing up in Three.js = toward pia = decreasing depth)
        const yArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            axOrigin,
            axLen,
            0x2e7d32,
            axLen * 0.2,
            axLen * 0.12,
        );
        scene.add(tag(yArrow));
        const yLabel = makeLabel('Y (pia ↑)', 28, '#2e7d32');
        yLabel.scale.set(spriteW * 0.9, spriteH * 0.9, 1);
        yLabel.position.set(axOrigin.x, axOrigin.y + axLen * 1.3, zMid);
        scene.add(tag(yLabel));

        // ── Fit camera ───────────────────────────────────────────────────────
        if (camera && controls) {
            const maxDim = Math.max(bSize.x, bSize.y, bSize.z);
            const fov = camera.fov * (Math.PI / 180);
            const dist = Math.abs(maxDim / Math.sin(fov / 2));
            camera.position.set(center.x + dist * 0.3, center.y + dist * 0.3, center.z + dist * 0.8);
            controls.target.copy(center);
            controls.update();
        }
    }, [neurons, synapses]);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default ExplorerCanvas3D;
