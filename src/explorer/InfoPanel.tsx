import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { InfoData } from './types';

const ROW_COLORS = { src: 'darkorange', dst: 'royalblue' };

interface Props {
    info: InfoData | null;
}

const InfoPanel: React.FC<Props> = ({ info }) => {
    if (!info) return null;

    return (
        <Box
            sx={{
                fontFamily: 'monospace',
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                mt: 1,
            }}
        >
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                <Typography
                    sx={{ color: ROW_COLORS.src, fontFamily: 'monospace', fontSize: 16, minWidth: 36, fontWeight: 700 }}
                >
                    src
                </Typography>
                <Typography sx={{ color: 'text.primary', fontFamily: 'monospace', fontSize: 16 }}>
                    {String(info.srcId)}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: 16 }}>
                    {info.srcClfType} / {info.srcCellType}
                </Typography>
            </Box>
            {info.dsts.map((d) => (
                <Box key={String(d.id)} sx={{ display: 'flex', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                    <Typography
                        sx={{
                            color: ROW_COLORS.dst,
                            fontFamily: 'monospace',
                            fontSize: 16,
                            minWidth: 36,
                            fontWeight: 700,
                        }}
                    >
                        dst
                    </Typography>
                    <Typography sx={{ color: 'text.primary', fontFamily: 'monospace', fontSize: 16 }}>
                        {String(d.id)}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: 16 }}>
                        {d.clfType} / {d.cellType}
                    </Typography>
                    <Typography sx={{ color: 'error.main', fontFamily: 'monospace', fontSize: 16 }}>
                        ({d.synCount} syn)
                    </Typography>
                </Box>
            ))}
            <Divider sx={{ mt: 1 }} />
        </Box>
    );
};

export default InfoPanel;
