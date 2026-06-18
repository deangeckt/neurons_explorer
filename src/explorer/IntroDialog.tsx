import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';

interface Props {
    open: boolean;
    onClose: () => void;
    showBackground: boolean;
    onToggleBackground: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: 'primary.main', mb: 0.75 }}>{title}</Typography>
        {children}
    </Box>
);

const Row: React.FC<{ label: string; desc: string }> = ({ label, desc }) => (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5, alignItems: 'baseline' }}>
        <Typography
            sx={{
                fontFamily: 'monospace',
                fontSize: 13,
                bgcolor: 'action.hover',
                color: 'text.primary',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                whiteSpace: 'nowrap',
                minWidth: 110,
                textAlign: 'center',
            }}
        >
            {label}
        </Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{desc}</Typography>
    </Box>
);

const IntroDialog: React.FC<Props> = ({ open, onClose, showBackground, onToggleBackground }) => (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle
            sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 2 }}
        >
            <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/logo192.png`}
                alt="logo"
                sx={{ width: 64, height: 64 }}
            />
            Neurons Explorer
        </DialogTitle>

        <DialogContent dividers>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2 }}>
                Explore synaptic connectivity in the{' '}
                <Link href="https://www.microns-explorer.org/" target="_blank" rel="noreferrer">
                    MICrONS
                </Link>{' '}
                cortical column (v1718). Pick a source neuron and visualise its outgoing connections to target neurons
                in 3D.
            </Typography>

            <Section title="UI Controls">
                <Row
                    label="click ID"
                    desc="Click any neuron ID in the Selected neurons panel to edit it inline. Press Enter to load the new ID, Escape to cancel."
                />
                <Row
                    label="Randomize"
                    desc="Pick a new random source and targets within the selected types. Lock individual neurons (🔒) to keep them across randomisations."
                />
                <Row
                    label="Source type"
                    desc="Filter which cell type the source neuron is picked from. Leave empty to allow all types. Hidden when the source is pinned."
                />
                <Row
                    label="Target types"
                    desc="Filter which cell types the target neurons are picked from. Leave empty to allow all types."
                />
                <Row
                    label="Target count"
                    desc="How many target neurons to sample (1–10). Locked targets always count toward this total."
                />
            </Section>

            <Divider sx={{ my: 1.5 }} />

            <Section title="Background Neurons">
                <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 1 }}>
                    The faint gray skeletons visible in the background are neurons from the 1 mm³ volume{' '}
                    <em>outside</em> the column. They are shown for spatial context only and cannot be selected or
                    edited.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch size="small" checked={showBackground} onChange={onToggleBackground} />
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Show background skeletons</Typography>
                </Box>
            </Section>

            <Divider sx={{ my: 1.5 }} />

            <Section title="3D Navigation">
                <Row label="Left drag" desc="Rotate / orbit around the neurons." />
                <Row label="Right drag" desc="Pan (translate) the view." />
                <Row label="Scroll wheel" desc="Zoom in and out." />
            </Section>
        </DialogContent>

        <DialogActions>
            <Button onClick={onClose} variant="contained">
                Got it
            </Button>
        </DialogActions>
    </Dialog>
);

export default IntroDialog;
