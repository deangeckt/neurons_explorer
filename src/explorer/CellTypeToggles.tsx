import React from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface Props {
    label: string;
    cellTypes: string[];
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
}

const CellTypeToggles: React.FC<Props> = ({ label, cellTypes, selected, onChange }) => {
    const handleChange = (_: React.MouseEvent<HTMLElement>, newValues: string[]) => {
        onChange(new Set(newValues));
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography sx={{ color: 'text.secondary', minWidth: 80, pt: '6px', fontSize: 13, fontWeight: 600 }}>
                {label}
            </Typography>
            <ToggleButtonGroup
                value={[...selected]}
                onChange={handleChange}
                size="small"
                sx={{ flexWrap: 'wrap', gap: '3px' }}
            >
                {cellTypes.map((ct) => (
                    <ToggleButton
                        key={ct}
                        value={ct}
                        sx={{
                            fontSize: 15,
                            py: '4px',
                            px: '10px',
                            color: 'text.secondary',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                            '&.Mui-selected': {
                                bgcolor: '#2e7d32',
                                color: '#fff',
                                borderColor: '#2e7d32',
                                '&:hover': { bgcolor: '#388e3c' },
                            },
                        }}
                    >
                        {ct}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
        </Box>
    );
};

export default CellTypeToggles;
