# Neurons Explorer

[![Live Demo](https://github.com/deangeckt/neurons_explorer/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/deangeckt/neurons_explorer/actions)
[![GitHub stars](https://img.shields.io/github/stars/deangeckt/neurons_explorer?style=social)](https://github.com/deangeckt/neurons_explorer/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/deangeckt/neurons_explorer)](https://github.com/deangeckt/neurons_explorer/issues)

A free, browser-based [**interactive 3D viewer**](https://deangeckt.github.io/neurons_explorer) for cortical neuron connectivity - no installation required.
Pick a source neuron, sample its synaptic targets, and explore their skeletons and synapse locations in real time.

Data is from the [MICrONS](https://www.microns-explorer.org/) cortical column dataset (v1718): ~1,300 neurons and ~146K intrinsic synapses.
Faint gray skeletons in the background are neurons from the 1 mm³ volume outside the column, shown for spatial context.

![alt text](image.png)

## Getting Started

```bash
git clone https://github.com/deangeckt/neurons_explorer.git
cd neurons_explorer
npm install
npm start
```

The app will open at `http://localhost:3000`.


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

- Data provided by the [MICrONS Project](https://www.microns-explorer.org/) - a large-scale electron-microscopy reconstruction of a cortical column from mouse visual cortex.


- This is a fork of my previous open-source online-tool: the [SWC Editor](https://github.com/deangeckt/swc_editor), turned, with the help of Claude to this Explorer.