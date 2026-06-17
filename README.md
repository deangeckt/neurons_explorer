# Neurons Explorer

[![Live Demo](https://github.com/deangeckt/neurons_explorer/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/deangeckt/neurons_explorer/actions)
[![GitHub stars](https://img.shields.io/github/stars/deangeckt/neurons_explorer?style=social)](https://github.com/deangeckt/neurons_explorer/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/deangeckt/neurons_explorer)](https://github.com/deangeckt/neurons_explorer/issues)

A free, browser-based [**interactive 3D viewer**](https://deangeckt.github.io/neurons_explorer) for cortical neuron connectivity — no installation required.
Pick a source neuron, sample its synaptic targets, and explore their skeletons and synapse locations in real time.

Data is from the [MICrONS](https://www.microns-explorer.org/) cortical column dataset (v1718) — ~1,300 neurons and ~146K intrinsic synapses.

![alt text](image.png)

## Getting Started

```bash
git clone https://github.com/deangeckt/neurons_explorer.git
cd neurons_explorer
npm install
npm start
```

The app will open at `http://localhost:3000`.

### Data Setup

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

## Citation

If you use Neurons Explorer in your work, please cite:

```bibtex
@software{geckt2026neurons,
  author  = {Geckt, Dean},
  title   = {Neurons Explorer: Interactive 3D Browser for Cortical Neuron Connectivity},
  year    = {2026},
  url     = {https://github.com/deangeckt/neurons_explorer}
}
```

## Acknowledgments

Data provided by the [MICrONS Project](https://www.microns-explorer.org/) — a large-scale electron-microscopy reconstruction of a cortical column from mouse visual cortex.
