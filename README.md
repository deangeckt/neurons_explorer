# <img src="https://github.com/user-attachments/assets/02590b93-04b6-4685-8db7-34be9a607554" alt="logo192" width="45" />  Neuron SWC Editor

[![Online Editor](https://github.com/deangeckt/swc_editor/actions/workflows/pages/pages-build-deployment/badge.svg)](https://deangeckt.github.io/swc_editor/)
[![GitHub stars](https://img.shields.io/github/stars/deangeckt/swc_editor?style=social)](https://github.com/deangeckt/swc_editor/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/deangeckt/swc_editor)](https://github.com/deangeckt/swc_editor/issues)

A free, browser-based [**online tool**](https://deangeckt.github.io/swc_editor/) for visualizing and editing morphological neuron `.swc` files — no installation required.

## Features

- 📊 **Dual Visualization**: View, edit, import, and export `.swc` files in both **2D** and **3D** interactive canvases
- 🖼️ **Export Options**: Generate transparent **PNG** images perfect for figures or presentations
- 🔬 **Simulation Ready**: Edited `.swc` files are compatible with simulation tools like [**NEURON**](https://www.neuron.yale.edu/neuron/) and [**BRIAN**](https://briansimulator.org/)
- 🔍 **NeuroMorpho Integration**: Search and load neurons directly from [NeuroMorpho.Org](https://neuromorpho.org/) using their public API
- ✂️ **Branch Editing**: Remove or modify specific branches in the neuronal tree structure
- 🎨 **Color Customization**: Change segment colors for better visualization and analysis
- 💻 **No Installation**: Works entirely in your browser with modern Chrome, Firefox, Safari, or Edge

## Getting Started

### Quick Start (Online)
1. Visit [**deangeckt.github.io/swc_editor**](https://deangeckt.github.io/swc_editor/)
2. Upload your `.swc` file or search for neurons from NeuroMorpho.Org
3. Edit your neuron using the 2D or 3D canvas
4. Export your modified `.swc` file or save as PNG


## Demos

### Browse for online neurons available at [NeuroMorpho.Org](https://neuromorpho.org/)

https://github.com/user-attachments/assets/fbde380e-cc2e-4c61-91e1-3276277f3979

### Remove a specific branch in the tree via the 2D editor, save for later analysis

https://github.com/user-attachments/assets/4985c768-71b2-4c51-9297-23d91ad5c168

### Upload your own neuron and change segments color

https://github.com/user-attachments/assets/30049385-c528-46bb-af4b-6a7990700c2b


## MICrONS Skeletons Example
To use a skeleton from [MICrONS](https://www.microns-explorer.org/cortical-mm3), which can be loaded via [skeleton_plot](https://github.com/AllenInstitute/skeleton_plot/tree/main) or [Meshparty](https://github.com/CAVEconnectome/MeshParty) run:

Loading the skeleton:
```python
import skeleton_plot.skel_io as skel_io
skel_path = "s3://bossdb-open-data/iarpa_microns/minnie/minnie65/skeletons/v661/skeletons/"
nucleus_id = 256609
segment_id = 864691135404231406
skel_filename = f"{segment_id}_{nucleus_id}.swc"
sk = skel_io.read_skeleton(skel_path, skel_filename)
```
Exporting the skeleton to SWC:
```python
import numpy as np
sk.export_to_swc(
    f'{nucleus_id}.swc',
    node_labels=sk.vertex_properties["compartment"],
    radius=np.array(sk.vertex_properties["radius"]),
    xyz_scaling=1
)
```

## Local Development
To run the editor locally:

```bash
# Clone the repository
git clone https://github.com/deangeckt/swc_editor.git
cd swc_editor

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

### Build for Production
```bash
npm run build
```


## Citation

If you use the Neuron SWC Editor in your research, please cite it as:

```bibtex
@software{swc_editor,
  author = {Dean Geckt},
  title = {Neuron SWC Editor: A Browser-Based Tool for Visualizing and Editing Neuronal Morphology},
  year = {2024},
  url = {https://github.com/deangeckt/swc_editor},
  note = {Available at: https://deangeckt.github.io/swc_editor/}
}
```

## Contributing

Contributions are welcome! Feel free to fork the repository, make your improvements, and submit a pull request. Whether it's bug fixes, new features, or documentation improvements, all contributions help make this tool better for the neuroscience community.


## Acknowledgments

- [NeuroMorpho.Org](https://neuromorpho.org/) for providing public access to neuronal reconstructions
- [MICrONS Project](https://www.microns-explorer.org/) for cortical neuron data

---
