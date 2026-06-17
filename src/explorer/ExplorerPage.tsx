import React, { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

import {
    NeuronRecord,
    NeuronRole,
    RenderStyle,
    SynapseRecord,
    RenderedNeuron,
    SynapsePoint,
    InfoData,
    AffineXY,
} from './types';
import {
    loadNeurons,
    loadSynapses,
    loadSkeleton,
    voxelToMicron,
    computeAlignTransform,
    applyAlignTransform,
} from './dataLoader';
import { getUniqueCellTypes, computeValidSrcIds, sample } from './explorerState';
import ExplorerCanvas3D from './ExplorerCanvas3D';
import CellTypeToggles from './CellTypeToggles';
import IntroDialog from './IntroDialog';

const EXCLUDED_CELL_TYPES = new Set(['Unsure E', 'Unsure I']);

const DEFAULT_SRC_ID: bigint = BigInt('864691135617152361');
const DEFAULT_DST_IDS: bigint[] = [BigInt('864691135920800688'), BigInt('864691135469753426')];

const DEFAULT_DST_COUNT = 2;

const DEFAULT_STYLES: Record<NeuronRole, RenderStyle> = {
    srcDendrite: { color: '#FF8C00', opacity: 1.0 },
    srcAxon: { color: '#006400', opacity: 0.9 },
    dstDendrite: { color: '#4169E1', opacity: 0.8 },
};

const ROLE_LABELS: Record<NeuronRole, string> = {
    srcDendrite: 'source dendrite',
    srcAxon: 'source axon',
    dstDendrite: 'target dendrites',
};

interface NeuronRowProps {
    label: string;
    labelColor: string;
    id: string;
    subtitle: string;
    synCount?: number;
    visible: boolean;
    locked: boolean;
    editing: boolean;
    editValue: string;
    editError: string;
    onToggleVisible: () => void;
    onToggleLock: () => void;
    onStartEdit: () => void;
    onEditChange: (v: string) => void;
    onEditConfirm: () => void;
    onEditCancel: () => void;
}

const NeuronRow: React.FC<NeuronRowProps> = ({
    label,
    labelColor,
    id,
    subtitle,
    synCount,
    visible,
    locked,
    editing,
    editValue,
    editError,
    onToggleVisible,
    onToggleLock,
    onStartEdit,
    onEditChange,
    onEditConfirm,
    onEditCancel,
}) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Switch size="small" checked={visible} onChange={onToggleVisible} />
        <Typography sx={{ color: labelColor, fontWeight: 700, minWidth: 56, fontFamily: 'monospace', fontSize: 15 }}>
            {label}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
            {editing ? (
                <TextField
                    size="small"
                    autoFocus
                    fullWidth
                    value={editValue}
                    onChange={(e) => onEditChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditConfirm();
                        }
                        if (e.key === 'Escape') onEditCancel();
                    }}
                    onBlur={onEditCancel}
                    error={!!editError}
                    helperText={editError || undefined}
                    inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
                />
            ) : (
                <>
                    <Typography
                        onClick={onStartEdit}
                        title="Click to edit"
                        sx={{
                            fontFamily: 'monospace',
                            fontSize: 14,
                            color: '#1f2328',
                            cursor: 'text',
                            '&:hover': { color: '#0969da' },
                        }}
                    >
                        {id}
                    </Typography>
                    <Typography sx={{ color: '#57606a', fontSize: 13 }}>
                        {subtitle}
                        {synCount !== undefined && (
                            <>
                                {' · '}
                                <span style={{ color: '#cf222e' }}>{synCount} syn</span>
                            </>
                        )}
                    </Typography>
                </>
            )}
        </Box>
        <IconButton
            size="small"
            onClick={onToggleLock}
            title={locked ? 'Locked — stays on Randomize' : 'Unlocked — will be randomized'}
            sx={{ color: locked ? '#0969da' : '#d0d7de' }}
        >
            {locked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
        </IconButton>
    </Box>
);

const ExplorerPage: React.FC = () => {
    const [neurons, setNeurons] = useState<NeuronRecord[]>([]);
    const [cellTypes, setCellTypes] = useState<string[]>([]);
    const [srcTypes, setSrcTypes] = useState<Set<string>>(new Set());
    const [dstTypes, setDstTypes] = useState<Set<string>>(new Set());

    const [renderedNeurons, setRenderedNeurons] = useState<RenderedNeuron[]>([]);
    const [renderedSynapses, setRenderedSynapses] = useState<SynapsePoint[]>([]);
    const [info, setInfo] = useState<InfoData | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [renderLoading, setRenderLoading] = useState(false);
    const [neuronCount, setNeuronCount] = useState(0);
    const [synapseCount, setSynapseCount] = useState(0);
    const [introOpen, setIntroOpen] = useState(false);
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
    const [dstCount, setDstCount] = useState(DEFAULT_DST_COUNT);
    const [renderStyles, setRenderStyles] = useState<Record<NeuronRole, RenderStyle>>(DEFAULT_STYLES);

    // inline row editing state — rowKey is 'src' or the target's root_id string
    const [editingRow, setEditingRow] = useState<string | null>(null);
    const [editRowValue, setEditRowValue] = useState('');
    const [editRowError, setEditRowError] = useState('');

    const synapsesRef = useRef<SynapseRecord[] | null>(null);
    const validSrcRef = useRef<Set<bigint> | null>(null);
    const neuronMapRef = useRef<Map<bigint, NeuronRecord>>(new Map());
    const alignTransformRef = useRef<AffineXY | null>(null);

    const toggleHidden = useCallback((id: string) => {
        setHiddenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleLock = useCallback((id: string) => {
        setLockedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const startEditRow = useCallback((rowKey: string, currentId: string) => {
        setEditingRow(rowKey);
        setEditRowValue(currentId);
        setEditRowError('');
    }, []);

    const cancelEditRow = useCallback(() => {
        setEditingRow(null);
        setEditRowValue('');
        setEditRowError('');
    }, []);

    const doRender = useCallback(
        async (
            ns: NeuronRecord[],
            syns: SynapseRecord[],
            validSrcIds: Set<bigint>,
            srcTypesSet: Set<string>,
            dstTypesSet: Set<string>,
            dstCountVal: number,
            forceSrcId?: bigint,
            pinnedDstIds?: bigint[],
            onComplete?: (srcId: bigint, dstIds: bigint[]) => void,
        ) => {
            setRenderLoading(true);
            try {
                const result = sample(
                    ns,
                    syns,
                    validSrcIds,
                    srcTypesSet,
                    dstTypesSet,
                    dstCountVal,
                    forceSrcId,
                    pinnedDstIds,
                );
                if ('error' in result) return;

                const { srcId, dstIds, connectedSynapses } = result;

                const [srcSegsRaw, ...dstSegsRawArr] = await Promise.all([
                    loadSkeleton(srcId).catch(() => []),
                    ...dstIds.map((id) => loadSkeleton(id).catch(() => [])),
                ]);

                const t = alignTransformRef.current;
                const transformSeg = t
                    ? (segs: typeof srcSegsRaw) =>
                          segs.map((s) => {
                              const p1 = applyAlignTransform(s.x1, s.y1, s.z1, t);
                              const p2 = applyAlignTransform(s.x2, s.y2, s.z2, t);
                              return { ...s, x1: p1.x, y1: p1.y, z1: p1.z, x2: p2.x, y2: p2.y, z2: p2.z };
                          })
                    : (segs: typeof srcSegsRaw) => segs;

                const srcSegs = transformSeg(srcSegsRaw);
                const dstSegsArr = dstSegsRawArr.map(transformSeg);

                const newNeurons: RenderedNeuron[] = [];
                const srcStr = String(srcId);

                const srcDendrites = srcSegs.filter((s) => s.tid === 3 || s.tid === 4);
                if (srcDendrites.length > 0)
                    newNeurons.push({
                        id: srcStr,
                        role: 'srcDendrite',
                        segments: srcDendrites,
                        color: DEFAULT_STYLES.srcDendrite.color,
                        opacity: DEFAULT_STYLES.srcDendrite.opacity,
                    });

                const srcAxon = srcSegs.filter((s) => s.tid === 2);
                if (srcAxon.length > 0)
                    newNeurons.push({
                        id: srcStr,
                        role: 'srcAxon',
                        segments: srcAxon,
                        color: DEFAULT_STYLES.srcAxon.color,
                        opacity: DEFAULT_STYLES.srcAxon.opacity,
                    });

                dstIds.forEach((dstId, i) => {
                    const dendrites = dstSegsArr[i].filter((s) => s.tid === 3 || s.tid === 4);
                    if (dendrites.length > 0)
                        newNeurons.push({
                            id: String(dstId),
                            role: 'dstDendrite',
                            segments: dendrites,
                            color: DEFAULT_STYLES.dstDendrite.color,
                            opacity: DEFAULT_STYLES.dstDendrite.opacity,
                        });
                });

                const synPoints: SynapsePoint[] = connectedSynapses.map((s) => {
                    const raw = voxelToMicron(s.cx, s.cy, s.cz);
                    const pos = t ? applyAlignTransform(raw.x, raw.y, raw.z, t) : raw;
                    return { ...pos, targetId: String(s.post_id) };
                });

                setRenderedNeurons(newNeurons);
                setRenderedSynapses(synPoints);
                setHiddenIds(new Set());

                const srcNeuron = neuronMapRef.current.get(srcId);
                const dstInfo = dstIds.map((id) => {
                    const n = neuronMapRef.current.get(id);
                    const synCount = connectedSynapses.filter((s) => s.post_id === id).length;
                    return { id, clfType: n?.clf_type ?? '?', cellType: n?.cell_type ?? '?', synCount };
                });

                setInfo({
                    srcId,
                    srcClfType: srcNeuron?.clf_type ?? '?',
                    srcCellType: srcNeuron?.cell_type ?? '?',
                    dsts: dstInfo,
                });
                if (onComplete) onComplete(srcId, dstIds);
            } catch {
                // errors are silent; loading spinner stops regardless
            } finally {
                setRenderLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        Promise.all([loadNeurons(), loadSynapses()])
            .then(([ns, syns]) => {
                const nm = new Map(ns.map((n) => [n.root_id, n]));
                const validSrc = computeValidSrcIds(ns, syns);

                neuronMapRef.current = nm;
                synapsesRef.current = syns;
                validSrcRef.current = validSrc;
                alignTransformRef.current = computeAlignTransform(ns);

                setNeurons(ns);
                setCellTypes(getUniqueCellTypes(ns).filter((t) => !EXCLUDED_CELL_TYPES.has(t)));
                setNeuronCount(ns.length);
                setSynapseCount(syns.length);
                setInitialLoading(false);
                setIntroOpen(true);

                doRender(
                    ns,
                    syns,
                    validSrc,
                    new Set(),
                    new Set(),
                    DEFAULT_DST_COUNT,
                    DEFAULT_SRC_ID,
                    DEFAULT_DST_IDS,
                    (srcId, dstIds) => {
                        const srcN = nm.get(srcId);
                        if (srcN?.cell_type) setSrcTypes(new Set([srcN.cell_type]));
                        const dstCellTypes = new Set(
                            dstIds.map((id) => nm.get(id)?.cell_type).filter(Boolean) as string[],
                        );
                        if (dstCellTypes.size > 0) setDstTypes(dstCellTypes);
                    },
                );
            })
            .catch(() => {
                setInitialLoading(false);
            });
    }, [doRender]);

    const handleRandomize = () => {
        if (!synapsesRef.current || !validSrcRef.current || neurons.length === 0) return;
        const forceSrcId = info && lockedIds.has(String(info.srcId)) ? info.srcId : undefined;
        const pinnedDsts = info?.dsts.filter((d) => lockedIds.has(String(d.id))).map((d) => d.id) ?? [];
        doRender(
            neurons,
            synapsesRef.current,
            validSrcRef.current,
            srcTypes,
            dstTypes,
            dstCount,
            forceSrcId,
            pinnedDsts.length > 0 ? pinnedDsts : undefined,
            (srcId) => {
                const n = neuronMapRef.current.get(srcId);
                if (n?.cell_type && !forceSrcId) setSrcTypes(new Set([n.cell_type]));
            },
        );
    };

    const confirmEditRow = (rowKey: string) => {
        if (!synapsesRef.current || !validSrcRef.current || !info) return;
        let newId: bigint;
        try {
            newId = BigInt(editRowValue.trim());
        } catch {
            setEditRowError('Invalid ID format');
            return;
        }
        if (!neuronMapRef.current.has(newId)) {
            setEditRowError('ID not found in column');
            return;
        }
        if (rowKey === 'src') {
            const pinnedDsts = info.dsts.map((d) => d.id);
            doRender(
                neurons,
                synapsesRef.current,
                validSrcRef.current,
                srcTypes,
                dstTypes,
                Math.max(pinnedDsts.length, 1),
                newId,
                pinnedDsts.length > 0 ? pinnedDsts : undefined,
                undefined,
            );
        } else {
            const newDstIds = info.dsts.map((d) => (String(d.id) === rowKey ? newId : d.id));
            doRender(
                neurons,
                synapsesRef.current,
                validSrcRef.current,
                srcTypes,
                dstTypes,
                newDstIds.length,
                info.srcId,
                newDstIds,
                undefined,
            );
        }
        setEditingRow(null);
        setEditRowValue('');
        setEditRowError('');
    };

    const isLoading = initialLoading || renderLoading;

    const visibleNeurons = renderedNeurons
        .filter((n) => !hiddenIds.has(n.id))
        .map((n) => ({ ...n, color: renderStyles[n.role].color, opacity: renderStyles[n.role].opacity }));

    const visibleSynapses = renderedSynapses.filter((s) => !hiddenIds.has(s.targetId));

    const srcIsFixed = !!(info && lockedIds.has(String(info.srcId)));

    return (
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f6f8fa' }}>
            {/* 3D canvas */}
            <Box sx={{ flex: 1, position: 'relative' }}>
                <ExplorerCanvas3D neurons={visibleNeurons} synapses={visibleSynapses} />

                {/* Loading overlay */}
                {isLoading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(246,248,250,0.92)',
                            gap: 2,
                        }}
                    >
                        <CircularProgress size={52} sx={{ color: '#0969da' }} />
                        <Typography sx={{ color: '#57606a', fontSize: 16 }}>
                            {initialLoading ? 'Loading data…' : 'Loading skeletons…'}
                        </Typography>
                    </Box>
                )}

                {/* Legend overlay */}
                {renderedNeurons.length > 0 && !isLoading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 16,
                            left: 16,
                            bgcolor: 'rgba(255,255,255,0.92)',
                            border: '1px solid #d0d7de',
                            borderRadius: 1,
                            p: 1.25,
                        }}
                    >
                        {(Object.entries(ROLE_LABELS) as [NeuronRole, string][]).map(([role, label]) => (
                            <Box key={role} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                                <Box
                                    sx={{ width: 18, height: 4, bgcolor: renderStyles[role].color, borderRadius: 1 }}
                                />
                                <Typography sx={{ color: '#57606a', fontSize: 13 }}>{label}</Typography>
                            </Box>
                        ))}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 18, height: 4, bgcolor: 'red', borderRadius: 1 }} />
                            <Typography sx={{ color: '#57606a', fontSize: 13 }}>synapses</Typography>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Control panel */}
            <Box
                sx={{
                    width: 460,
                    borderLeft: '1px solid #d0d7de',
                    bgcolor: '#ffffff',
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    overflowY: 'auto',
                }}
            >
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#0969da', fontWeight: 700, fontSize: 22 }}>
                        MICrONS Column Explorer
                    </Typography>
                    <IconButton size="small" onClick={() => setIntroOpen(true)} sx={{ color: '#57606a' }}>
                        <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Stats */}
                {!initialLoading && (
                    <Typography sx={{ color: '#6e7781', fontSize: 16 }}>
                        v1718 · {neuronCount.toLocaleString()} neurons · {synapseCount.toLocaleString()} synapses
                    </Typography>
                )}

                <Divider />

                {/* ── Selected neurons ── */}
                {info && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#57606a' }}>
                            Selected neurons
                            <Typography component="span" sx={{ fontSize: 12, color: '#8c959f', ml: 1 }}>
                                click ID to edit
                            </Typography>
                        </Typography>
                        <NeuronRow
                            label="source"
                            labelColor={renderStyles.srcDendrite.color}
                            id={String(info.srcId)}
                            subtitle={`${info.srcClfType} / ${info.srcCellType}`}
                            visible={!hiddenIds.has(String(info.srcId))}
                            locked={lockedIds.has(String(info.srcId))}
                            editing={editingRow === 'src'}
                            editValue={editRowValue}
                            editError={editRowError}
                            onToggleVisible={() => toggleHidden(String(info.srcId))}
                            onToggleLock={() => toggleLock(String(info.srcId))}
                            onStartEdit={() => startEditRow('src', String(info.srcId))}
                            onEditChange={setEditRowValue}
                            onEditConfirm={() => confirmEditRow('src')}
                            onEditCancel={cancelEditRow}
                        />
                        {info.dsts.map((d) => (
                            <NeuronRow
                                key={String(d.id)}
                                label="target"
                                labelColor={renderStyles.dstDendrite.color}
                                id={String(d.id)}
                                subtitle={`${d.clfType} / ${d.cellType}`}
                                synCount={d.synCount}
                                visible={!hiddenIds.has(String(d.id))}
                                locked={lockedIds.has(String(d.id))}
                                editing={editingRow === String(d.id)}
                                editValue={editRowValue}
                                editError={editRowError}
                                onToggleVisible={() => toggleHidden(String(d.id))}
                                onToggleLock={() => toggleLock(String(d.id))}
                                onStartEdit={() => startEditRow(String(d.id), String(d.id))}
                                onEditChange={setEditRowValue}
                                onEditConfirm={() => confirmEditRow(String(d.id))}
                                onEditCancel={cancelEditRow}
                            />
                        ))}
                    </Box>
                )}

                <Divider />

                {/* ── Display settings ── */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#57606a' }}>Display settings</Typography>
                    {(Object.entries(ROLE_LABELS) as [NeuronRole, string][]).map(([role, label]) => {
                        const style = renderStyles[role];
                        return (
                            <Box key={role} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Typography sx={{ minWidth: 100, fontSize: 14, color: style.color, fontWeight: 600 }}>
                                    {label}
                                </Typography>
                                <input
                                    type="color"
                                    value={style.color}
                                    onChange={(e) =>
                                        setRenderStyles((prev) => ({
                                            ...prev,
                                            [role]: { ...prev[role], color: e.target.value },
                                        }))
                                    }
                                    style={{
                                        width: 32,
                                        height: 28,
                                        border: 'none',
                                        padding: 2,
                                        cursor: 'pointer',
                                        borderRadius: 4,
                                        background: 'none',
                                    }}
                                />
                                <Slider
                                    size="small"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={style.opacity}
                                    onChange={(_, v) =>
                                        setRenderStyles((prev) => ({
                                            ...prev,
                                            [role]: { ...prev[role], opacity: v as number },
                                        }))
                                    }
                                    sx={{ flex: 1, color: style.color }}
                                />
                                <Typography sx={{ fontSize: 13, minWidth: 34, color: '#57606a', textAlign: 'right' }}>
                                    {Math.round(style.opacity * 100)}%
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>

                <Divider />

                {/* ── Add neurons ── */}
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#57606a' }}>Add neurons</Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: 15, color: '#57606a', minWidth: 100 }}>Target count</Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setDstCount((c) => Math.max(1, c - 1))}
                        sx={{ minWidth: 32, px: 0, borderColor: '#d0d7de', color: '#57606a' }}
                    >
                        −
                    </Button>
                    <Typography sx={{ fontSize: 17, minWidth: 24, textAlign: 'center', fontWeight: 700 }}>
                        {dstCount}
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setDstCount((c) => c + 1)}
                        sx={{ minWidth: 32, px: 0, borderColor: '#d0d7de', color: '#57606a' }}
                    >
                        +
                    </Button>
                </Box>

                {!srcIsFixed && (
                    <CellTypeToggles
                        label="Source type"
                        cellTypes={cellTypes}
                        selected={srcTypes}
                        onChange={setSrcTypes}
                    />
                )}
                <CellTypeToggles
                    label="Target types"
                    cellTypes={cellTypes}
                    selected={dstTypes}
                    onChange={setDstTypes}
                />

                <Button
                    variant="contained"
                    onClick={handleRandomize}
                    disabled={isLoading}
                    startIcon={renderLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                    sx={{ bgcolor: '#0969da', '&:hover': { bgcolor: '#0550ae' }, fontSize: 17, py: 1.2 }}
                >
                    {renderLoading ? 'Loading…' : 'Randomize'}
                </Button>
            </Box>

            <IntroDialog open={introOpen} onClose={() => setIntroOpen(false)} />
        </Box>
    );
};

export default ExplorerPage;
