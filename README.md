# Neurons Explorer

An interactive, browser-based 3D viewer for cortical neuron connectivity.
Pick a source neuron, sample its synaptic targets, and explore their skeletons and synapse locations in real time.

Data is from the [MICrONS](https://www.microns-explorer.org/) cortical column dataset (v1718) — ~1,300 neurons and ~500,000 intrinsic synapses.

## Features

- **3D skeleton rendering** — source dendrite, source axon, and target dendrites colour-coded by role
- **Synapse dots** — red dots at the precise synapse locations between the selected neurons
- **Cell-type filters** — filter source and target pools by cell type (e.g. 23P, BC, MC)
- **Lock / randomize** — lock individual neurons across randomizations; unlock to resample
- **Inline ID editing** — click any neuron ID in the panel to type a specific root ID
- **Display settings** — per-role colour pickers and opacity sliders
- **Cortical layer lines** — L2/3, L4, L5, L6 depth guides overlaid on the 3D scene
- **EM volume box** — wireframe bounding box showing the full column extent for spatial context

## Getting Started

```bash
git clone https://github.com/deangeckt/neurons_explorer.git
cd neurons_explorer
npm install
npm start
```

The app will open at `http://localhost:3000`.

### Data setup

Place the following files in `public/` before running:

```
public/neurons_1718.csv
public/intrinsic_synapses_1718.csv
public/skeletons/<root_id>.swc   (one file per neuron)
```

## Local Development

```bash
npm start      # development server with hot reload
npm run build  # production bundle
```

## Acknowledgments

- [MICrONS Project](https://www.microns-explorer.org/) for the cortical column connectomics dataset
- [NeuroMorpho.Org](https://neuromorpho.org/) for public neuron reconstructions
