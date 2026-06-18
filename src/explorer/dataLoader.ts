import { NeuronRecord, SynapseRecord, Segment3D, AffineXY } from './types';

// Voxel → micron conversion (MICrONS EM stack)
const XY_VOXEL_NM = 4;
const Z_VOXEL_NM = 40;
export const voxelToMicron = (x: number, y: number, z: number) => ({
    x: (x * XY_VOXEL_NM) / 1000,
    y: (y * XY_VOXEL_NM) / 1000,
    z: (z * Z_VOXEL_NM) / 1000,
});

// Fit a 2D affine (x_raw_µm, y_raw_µm) → (xt, yt) via least squares over all neuron somas.
// Z is identity: zt = z_raw_µm.
export function computeAlignTransform(neurons: NeuronRecord[]): AffineXY {
    let s1 = 0,
        sx = 0,
        sy = 0,
        sx2 = 0,
        sxy = 0,
        sy2 = 0;
    let sxXt = 0,
        syXt = 0,
        sXt = 0;
    let sxYt = 0,
        syYt = 0,
        sYt = 0;

    for (const n of neurons) {
        const x = (n.pt_position_x * XY_VOXEL_NM) / 1000;
        const y = (n.pt_position_y * XY_VOXEL_NM) / 1000;
        const xt = n.pt_position_xt;
        const yt = n.pt_position_yt;
        s1++;
        sx += x;
        sy += y;
        sx2 += x * x;
        sxy += x * y;
        sy2 += y * y;
        sxXt += x * xt;
        syXt += y * xt;
        sXt += xt;
        sxYt += x * yt;
        syYt += y * yt;
        sYt += yt;
    }

    // Solve 3×3 system A * [a, b, c]^T = rhs  via Cramer's rule
    // A = [[sx2, sxy, sx], [sxy, sy2, sy], [sx, sy, s1]]
    const solve3 = (r0: number, r1: number, r2: number): [number, number, number] => {
        const det = sx2 * (sy2 * s1 - sy * sy) - sxy * (sxy * s1 - sy * sx) + sx * (sxy * sy - sy2 * sx);
        const a = (r0 * (sy2 * s1 - sy * sy) - sxy * (r1 * s1 - r2 * sy) + sx * (r1 * sy - r2 * sy2)) / det;
        const b = (sx2 * (r1 * s1 - r2 * sy) - r0 * (sxy * s1 - sy * sx) + sx * (sxy * r2 - r1 * sx)) / det;
        const c = (sx2 * (sy2 * r2 - r1 * sy) - sxy * (sxy * r2 - r1 * sx) + r0 * (sxy * sy - sy2 * sx)) / det;
        return [a, b, c];
    };

    const [ax, bx, cx] = solve3(sxXt, syXt, sXt);
    const [ay, by, cy] = solve3(sxYt, syYt, sYt);
    return { ax, bx, cx, ay, by, cy };
}

export function applyAlignTransform(x: number, y: number, z: number, t: AffineXY) {
    return {
        x: t.ax * x + t.bx * y + t.cx,
        y: t.ay * x + t.by * y + t.cy,
        z,
    };
}

function parseCSVLines(text: string): { header: string[]; rows: string[][] } {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const header = lines[0].split(',');
    const rows = lines.slice(1).map((l) => l.split(','));
    return { header, rows };
}

let neuronsCache: NeuronRecord[] | null = null;
let synapsesCache: SynapseRecord[] | null = null;

export async function loadNeurons(): Promise<NeuronRecord[]> {
    if (neuronsCache) return neuronsCache;

    const resp = await fetch(`${process.env.PUBLIC_URL}/neurons_1718.csv`);
    const text = await resp.text();
    const { header, rows } = parseCSVLines(text);

    const idx = (col: string) => header.indexOf(col);
    const iRootId = idx('root_id');
    const iCellType = idx('cell_type');
    const iClfType = idx('clf_type');
    const iPx = idx('pt_position_x');
    const iPy = idx('pt_position_y');
    const iPz = idx('pt_position_z');
    const iPxt = idx('pt_position_xt');
    const iPyt = idx('pt_position_yt');

    neuronsCache = rows
        .filter((r) => r.length > iRootId && r[iRootId].trim())
        .map((r) => ({
            root_id: BigInt(r[iRootId].trim()),
            cell_type: r[iCellType]?.trim() ?? '',
            clf_type: r[iClfType]?.trim() ?? '',
            pt_position_x: Number(r[iPx]),
            pt_position_y: Number(r[iPy]),
            pt_position_z: Number(r[iPz]),
            pt_position_xt: Number(r[iPxt]),
            pt_position_yt: Number(r[iPyt]),
        }));

    return neuronsCache;
}

// Parse "[x y z]" bracket format from center_position column
function parseCenterPosition(s: string): [number, number, number] | null {
    const m = s.match(/\[\s*([\d]+)\s+([\d]+)\s+([\d]+)\s*\]/);
    if (!m) return null;
    return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}

export async function loadSynapses(): Promise<SynapseRecord[]> {
    if (synapsesCache) return synapsesCache;

    const resp = await fetch(`${process.env.PUBLIC_URL}/intrinsic_synapses_1718.csv`);
    const text = await resp.text();

    const lines = text.split('\n');
    const header = lines[0].split(',');
    const iPreId = header.indexOf('pre_id');
    const iPostId = header.indexOf('post_id');
    const iCenter = header.indexOf('center_position');

    const records: SynapseRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // The center_position column contains "[x y z]" which may have no commas,
        // so we split only on commas outside brackets.
        const cols = splitCSVRow(line);
        if (cols.length <= Math.max(iPreId, iPostId, iCenter)) continue;

        const pos = parseCenterPosition(cols[iCenter]);
        if (!pos) continue;

        records.push({
            pre_id: BigInt(cols[iPreId].trim()),
            post_id: BigInt(cols[iPostId].trim()),
            cx: pos[0],
            cy: pos[1],
            cz: pos[2],
        });
    }

    synapsesCache = records;
    return synapsesCache;
}

// Split a CSV row respecting "[...]" bracket groups (no inner commas, but spaces)
function splitCSVRow(line: string): string[] {
    const cols: string[] = [];
    let current = '';
    let inBracket = false;
    for (const ch of line) {
        if (ch === '[') {
            inBracket = true;
            current += ch;
        } else if (ch === ']') {
            inBracket = false;
            current += ch;
        } else if (ch === ',' && !inBracket) {
            cols.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    cols.push(current);
    return cols;
}

export async function loadBackgroundSkeletons(): Promise<Segment3D[]> {
    const ids = [
        66976, 79652, 106443, 114033, 123756, 155008, 169463, 169895, 190134, 228509, 237600, 263245, 270385, 301598,
        305418, 308200, 329982, 357235, 361787, 376367, 403258, 404114, 419728, 421031, 427392, 427685, 438567, 455140,
        488801, 516258, 536873, 553003, 559091, 561155, 564510, 608601, 614757, 619792, 622464, 769011,
    ];
    const results = await Promise.all(
        ids.map(async (id) => {
            try {
                const resp = await fetch(`${process.env.PUBLIC_URL}/bg_skeletons/${id}.json`);
                if (!resp.ok) return [];
                const { s } = (await resp.json()) as { s: number[] };
                const segs: Segment3D[] = [];
                for (let i = 0; i < s.length; i += 6) {
                    segs.push({
                        x1: s[i],
                        y1: s[i + 1],
                        z1: s[i + 2],
                        x2: s[i + 3],
                        y2: s[i + 4],
                        z2: s[i + 5],
                        tid: 3,
                    });
                }
                return segs;
            } catch {
                return [];
            }
        }),
    );
    return results.flat();
}

export async function loadSkeleton(root_id: bigint): Promise<Segment3D[]> {
    const resp = await fetch(`${process.env.PUBLIC_URL}/skeletons/${root_id}.swc`);
    if (!resp.ok) throw new Error(`SWC not found for ${root_id}`);
    const text = await resp.text();
    return parseSWC3D(text);
}

function parseSWC3D(text: string): Segment3D[] {
    const nodeMap = new Map<number, { x: number; y: number; z: number; tid: number }>();

    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 7) continue;

        const id = parseInt(parts[0]);
        const tid = parseInt(parts[1]);
        const x = parseFloat(parts[2]);
        const y = parseFloat(parts[3]);
        const z = parseFloat(parts[4]);
        nodeMap.set(id, { x, y, z, tid });
    }

    const segments: Segment3D[] = [];
    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 7) continue;

        const id = parseInt(parts[0]);
        const pid = parseInt(parts[6]);
        if (pid === -1) continue; // root node — no segment

        const node = nodeMap.get(id);
        const parent = nodeMap.get(pid);
        if (!node || !parent) continue;

        segments.push({
            x1: parent.x,
            y1: parent.y,
            z1: parent.z,
            x2: node.x,
            y2: node.y,
            z2: node.z,
            tid: node.tid,
        });
    }

    return segments;
}

export interface SkeletonTree {
    segments: Segment3D[];
    aDistFromSoma: Float32Array; // length = segments.length * 2 (one per endpoint)
    aBranchTag: Float32Array; // length = segments.length * 2
    branchTags: number[]; // unique tags assigned to branches
}

export function parseSWCWithTree(text: string): SkeletonTree {
    type Node = { x: number; y: number; z: number; tid: number; pid: number };
    const nodeMap = new Map<number, Node>();
    const childrenMap = new Map<number, number[]>();
    let somaId: number | null = null;
    let firstRootId: number | null = null;

    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 7) continue;

        const id = parseInt(parts[0]);
        const tid = parseInt(parts[1]);
        const x = parseFloat(parts[2]);
        const y = parseFloat(parts[3]);
        const z = parseFloat(parts[4]);
        const pid = parseInt(parts[6]);
        nodeMap.set(id, { x, y, z, tid, pid });
        if (pid === -1 && firstRootId === null) firstRootId = id;
        if (tid === 1 && somaId === null) somaId = id;
        if (pid !== -1) {
            const arr = childrenMap.get(pid);
            if (arr) arr.push(id);
            else childrenMap.set(pid, [id]);
        }
    }

    const root = somaId ?? firstRootId;
    if (root === null || !nodeMap.has(root)) {
        return {
            segments: [],
            aDistFromSoma: new Float32Array(0),
            aBranchTag: new Float32Array(0),
            branchTags: [],
        };
    }

    // BFS from soma: compute geodesic distance and branch tags.
    // A new branch tag is assigned at each immediate child of the soma and at
    // each child of a bifurcation (≥2 children). Within a non-branching run
    // the tag propagates from parent to child.
    const distMap = new Map<number, number>();
    const tagMap = new Map<number, number>();
    distMap.set(root, 0);
    tagMap.set(root, -1); // soma itself has no branch tag
    let nextTag = 0;
    const queue: number[] = [root];
    while (queue.length > 0) {
        const id = queue.shift() as number;
        const node = nodeMap.get(id);
        if (!node) continue;
        const children = childrenMap.get(id) ?? [];
        const parentTag = tagMap.get(id) ?? -1;
        const parentIsBifurcation = id === root || children.length >= 2;
        for (const cid of children) {
            const child = nodeMap.get(cid);
            if (!child) continue;
            const dx = child.x - node.x;
            const dy = child.y - node.y;
            const dz = child.z - node.z;
            const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
            distMap.set(cid, (distMap.get(id) ?? 0) + segLen);
            const childTag = parentIsBifurcation ? nextTag++ : parentTag;
            tagMap.set(cid, childTag);
            queue.push(cid);
        }
    }

    const segments: Segment3D[] = [];
    const distAttr: number[] = [];
    const tagAttr: number[] = [];
    for (const [id, node] of nodeMap) {
        if (node.pid === -1) continue;
        const parent = nodeMap.get(node.pid);
        if (!parent) continue;
        segments.push({
            x1: parent.x,
            y1: parent.y,
            z1: parent.z,
            x2: node.x,
            y2: node.y,
            z2: node.z,
            tid: node.tid,
        });
        // Endpoint order matches the position buffer: parent endpoint first, child endpoint second.
        const parentTag = tagMap.get(node.pid) ?? -1;
        const childTag = tagMap.get(id) ?? -1;
        // If the parent is the soma (tag -1), use the child's tag for both endpoints
        // so the soma-anchored segments still belong visually to a branch.
        const segTag = parentTag === -1 ? childTag : parentTag;
        distAttr.push(distMap.get(node.pid) ?? 0);
        tagAttr.push(segTag);
        distAttr.push(distMap.get(id) ?? 0);
        tagAttr.push(childTag);
    }

    const branchTags: number[] = [];
    for (let t = 0; t < nextTag; t++) branchTags.push(t);

    return {
        segments,
        aDistFromSoma: new Float32Array(distAttr),
        aBranchTag: new Float32Array(tagAttr),
        branchTags,
    };
}
