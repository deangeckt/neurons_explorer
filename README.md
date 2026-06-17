# Neurons Explorer

**Live demo:** https://deangeckt.github.io/neurons_explorer

An interactive, browser-based 3D viewer for cortical neuron connectivity.
Pick a source neuron, sample its synaptic targets, and explore their skeletons and synapse locations in real time.

Data is from the [MICrONS](https://www.microns-explorer.org/) cortical column dataset (v1718) — ~1,300 neurons and ~146K intrinsic synapses.

## TODO add image here


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
