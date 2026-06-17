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
    pinnedDstIds?: bigint[],
): SampleResult | { error: string } {
    const srcPool = [...filterByTypes(allNeurons, srcTypes)].filter((id) => validSrcIds.has(id));
    const dstPool = filterByTypes(allNeurons, dstTypes);

    if (srcPool.length === 0) return { error: 'No source neurons match the selected cell types.' };

    const pinned = pinnedDstIds ?? [];
    const slotsLeft = Math.max(0, dstCount - pinned.length);

    // If all slots are filled by pinned neurons, just compute their synapses with any valid src
    if (slotsLeft === 0) {
        const srcId =
            forceSrcId && srcPool.includes(forceSrcId)
                ? forceSrcId
                : srcPool[Math.floor(Math.random() * srcPool.length)];
        const dstIds = pinned.slice(0, dstCount);
        const dstSet = new Set(dstIds);
        const connectedSynapses = synapses.filter((s) => s.pre_id === srcId && dstSet.has(s.post_id));
        return { srcId, dstIds, connectedSynapses };
    }

    const pinnedSet = new Set(pinned.map(String));

    // If the source is forced, attempt once with that source.
    // Otherwise retry up to min(srcPool.length, 20) times to find a source
    // that has at least one available target in the dst pool.
    const maxTries = forceSrcId ? 1 : Math.min(srcPool.length, 20);

    for (let attempt = 0; attempt < maxTries; attempt++) {
        const srcId =
            forceSrcId && srcPool.includes(forceSrcId)
                ? forceSrcId
                : srcPool[Math.floor(Math.random() * srcPool.length)];

        const outSynapses = synapses.filter((s) => s.pre_id === srcId && dstPool.has(s.post_id));
        const available = [...new Set(outSynapses.map((s) => s.post_id))].filter((id) => !pinnedSet.has(String(id)));

        if (available.length === 0 && pinned.length === 0) continue; // try another source

        const shuffled = available.sort(() => Math.random() - 0.5);
        const dstIds = [...pinned, ...shuffled.slice(0, slotsLeft)];
        const dstSet = new Set(dstIds);
        const connectedSynapses = synapses.filter((s) => s.pre_id === srcId && dstSet.has(s.post_id));
        return { srcId, dstIds, connectedSynapses };
    }

    return { error: 'No source with targets matching the selected types. Try clearing the target type filter.' };
}
