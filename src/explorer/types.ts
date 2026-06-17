export interface NeuronRecord {
    root_id: bigint;
    cell_type: string;
    clf_type: string;
    // raw voxel coords (4 nm/voxel for x,y; 40 nm/voxel for z)
    pt_position_x: number;
    pt_position_y: number;
    pt_position_z: number;
    // MICrONS-aligned coords in µm (yt = cortical depth)
    pt_position_xt: number;
    pt_position_yt: number;
}

// Affine XY mapping: (x_raw_µm, y_raw_µm) → (xt, yt); z is identity
export interface AffineXY {
    ax: number;
    bx: number;
    cx: number; // xt = ax·x + bx·y + cx
    ay: number;
    by: number;
    cy: number; // yt = ay·x + by·y + cy
}

export interface SynapseRecord {
    pre_id: bigint;
    post_id: bigint;
    // raw voxel coords parsed from center_position "[x y z]"
    cx: number;
    cy: number;
    cz: number;
}

export interface Segment3D {
    x1: number;
    y1: number;
    z1: number;
    x2: number;
    y2: number;
    z2: number;
    tid: number;
}

export type NeuronRole = 'srcDendrite' | 'srcAxon' | 'dstDendrite';

export interface RenderStyle {
    color: string;
    opacity: number;
}

export interface RenderedNeuron {
    id: string;
    role: NeuronRole;
    segments: Segment3D[];
    color: string;
    opacity: number;
}

export interface SynapsePoint {
    x: number;
    y: number;
    z: number;
    targetId: string;
}

export interface InfoData {
    srcId: bigint;
    srcClfType: string;
    srcCellType: string;
    dsts: { id: bigint; clfType: string; cellType: string; synCount: number }[];
}
