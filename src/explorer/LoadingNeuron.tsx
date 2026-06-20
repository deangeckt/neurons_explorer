import React, { useEffect, useRef } from 'react';

interface Branch {
    id: string;
    d: string;
    width: number;
}

const VIEW_SIZE = 400;
const CENTER = 200;
const COLORS_SEQ = '#4169E1;#FF8C00;#FF1744;#4169E1';

function buildTree(): Branch[] {
    const branches: Branch[] = [];
    let seed = 7;
    const rand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    const grow = (
        startX: number,
        startY: number,
        angle: number,
        length: number,
        depth: number,
        width: number,
        idPrefix: string,
    ) => {
        if (depth === 0 || length < 4) return;
        const segments = 4;
        let x = startX;
        let y = startY;
        let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        const segLen = length / segments;
        let currentAngle = angle;
        for (let i = 0; i < segments; i++) {
            const a = currentAngle + (rand() - 0.5) * 0.35;
            const nx = x + Math.cos(a) * segLen;
            const ny = y + Math.sin(a) * segLen;
            const cx1 = (x + nx) / 2 + (rand() - 0.5) * segLen * 0.5;
            const cy1 = (y + ny) / 2 + (rand() - 0.5) * segLen * 0.5;
            d += ` Q ${cx1.toFixed(1)} ${cy1.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
            x = nx;
            y = ny;
            currentAngle = a;
        }
        branches.push({ id: idPrefix, d, width });

        if (depth > 1) {
            const nChildren = 1 + Math.floor(rand() * 2.5);
            for (let c = 0; c < nChildren; c++) {
                const branchAngle = currentAngle + (rand() - 0.5) * 1.4;
                const branchLen = length * (0.55 + rand() * 0.25);
                grow(x, y, branchAngle, branchLen, depth - 1, width * 0.72, `${idPrefix}-${c}`);
            }
        }
    };

    const N_PRIMARY = 12;
    for (let i = 0; i < N_PRIMARY; i++) {
        const angle = (i / N_PRIMARY) * Math.PI * 2 + (rand() - 0.5) * 0.25;
        const length = 55 + rand() * 30;
        grow(CENTER, CENTER, angle, length, 4, 3.2, `b${i}`);
    }
    return branches;
}

const BRANCHES = buildTree();

interface Props {
    onReady?: () => void;
}

const LoadingNeuron: React.FC<Props> = ({ onReady }) => {
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    useEffect(() => {
        onReadyRef.current?.();
    }, []);

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <style>{`
                @keyframes loadingNeuronSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <div
                style={{
                    width: 'min(70vw, 70vh)',
                    height: 'min(70vw, 70vh)',
                    animation: 'loadingNeuronSpin 28s linear infinite',
                }}
            >
                <svg
                    viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
                    width="100%"
                    height="100%"
                    style={{ overflow: 'visible' }}
                >
                    {BRANCHES.map((b, i) => (
                        <path
                            key={b.id}
                            d={b.d}
                            fill="none"
                            stroke="#4169E1"
                            strokeWidth={b.width}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.88}
                        >
                            <animate
                                attributeName="stroke"
                                values={COLORS_SEQ}
                                dur="1.6s"
                                begin={`-${((i * 0.04) % 1.6).toFixed(2)}s`}
                                repeatCount="indefinite"
                            />
                        </path>
                    ))}

                    <circle cx={CENTER} cy={CENTER} r="14" fill="#FF8C00">
                        <animate
                            attributeName="fill"
                            values="#FF8C00;#FF1744;#4169E1;#FF8C00"
                            dur="1.6s"
                            repeatCount="indefinite"
                        />
                        <animate attributeName="r" values="13;16;13" dur="2s" repeatCount="indefinite" />
                    </circle>
                </svg>
            </div>
        </div>
    );
};

export default LoadingNeuron;
