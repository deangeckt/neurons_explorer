import { NeuronRecord, SynapseRecord } from './types';

export function getUniqueCellTypes(neurons: NeuronRecord[]): string[] {
    return [...new Set(neurons.map((n) => n.cell_type).filter(Boolean))].sort();
}

export function filterByTypes(neurons: NeuronRecord[], types: Set<string>): Set<bigint> {
    const pool = types.size === 0 ? neurons : neurons.filter((n) => types.has(n.cell_type));
    return new Set(pool.map((n) => n.root_id));
}

export function computeValidSrcIds(neurons: NeuronRecord[], synapses: SynapseRecord[]): Set<bigint> {
    const columnIds = new Set(neurons.map((n) => n.root_id));
    const validSet = new Set<bigint>();

    const targetsByPre = new Map<bigint, Set<bigint>>();
    for (const s of synapses) {
        if (!columnIds.has(s.pre_id) || !columnIds.has(s.post_id)) continue;
        if (!targetsByPre.has(s.pre_id)) targetsByPre.set(s.pre_id, new Set());
        targetsByPre.get(s.pre_id)!.add(s.post_id);
    }

    for (const [pre_id, targets] of targetsByPre) {
        if (targets.size >= 1) validSet.add(pre_id);
    }
    return validSet;
}

export interface SampleResult {
    srcId: bigint;
    dstIds: bigint[];
    connectedSynapses: SynapseRecord[];
}

export function sample(
    allNeurons: NeuronRecord[],
    synapses: SynapseRecord[],
    validSrcIds: Set<bigint>,
    srcTypes: Set<string>,
    dstTypes: Set<string>,
    dstCount: number,
    forceSrcId?: bigint,
    // Pinned dsts are always kept; remaining slots up to dstCount are filled randomly.
    // If pinnedDstIds.length >= dstCount, no random sampling happens.
    pinnedDstIds?: bigint[],
): SampleResult | { error: string } {
    const srcPool = [...filterByTypes(allNeurons, srcTypes)].filter((id) => validSrcIds.has(id));
    const dstPool = filterByTypes(allNeurons, dstTypes);

    if (srcPool.length === 0) return { error: 'No src neurons match the selected cell types.' };

    const srcId =
        forceSrcId && srcPool.includes(forceSrcId) ? forceSrcId : srcPool[Math.floor(Math.random() * srcPool.length)];

    const pinned = pinnedDstIds ?? [];
    const slotsLeft = Math.max(0, dstCount - pinned.length);

    let dstIds: bigint[];
    if (slotsLeft === 0) {
        dstIds = pinned.slice(0, dstCount);
    } else {
        const outSynapses = synapses.filter((s) => s.pre_id === srcId && dstPool.has(s.post_id));
        const pinnedSet = new Set(pinned.map(String));
        const available = [...new Set(outSynapses.map((s) => s.post_id))].filter((id) => !pinnedSet.has(String(id)));
        if (available.length === 0 && pinned.length === 0) {
            return { error: `src ${srcId} has no targets in the selected dst types — try again.` };
        }
        const shuffled = available.sort(() => Math.random() - 0.5);
        dstIds = [...pinned, ...shuffled.slice(0, slotsLeft)];
    }

    const dstSet = new Set(dstIds);
    const connectedSynapses = synapses.filter((s) => s.pre_id === srcId && dstSet.has(s.post_id));

    return { srcId, dstIds, connectedSynapses };
}
