// Generates an inline Neuroglancer state URL for the minnie65_public CAVE dataset.
//
// Hard-won lessons from porting the Python nglui/CAVEclient implementation:
//
//   Viewer:   spelunker.cave-explorer.org — ngl.cave-explorer.org parses the state
//             correctly but silently fails to render neuron meshes.
//
//   Sources:  need `middleauth+` prefix even though client.info.segmentation_source()
//             returns the URL without it.
//
//   Layers:   each neuron must go in its own segmentation layer ("neuron-<root_id>")
//             rather than in the shared "segmentation" layer — that's how nglui does
//             it and is required for the mesh to render.
//
//   Colors:   segmentColors keys are root ID strings, values are hex without '#'.
//
// Why dendrite/axon color split is not possible in the browser:
//
//   The app splits neurons by SWC `tid` (2=axon, 3/4=dendrite) for its own 3-D
//   canvas, but SWC node IDs are sequential skeleton graph indices — not CAVE
//   supervoxel IDs. Neuroglancer's graphene layer only understands root IDs (whole
//   neuron) or supervoxel IDs (mesh chunks). To color compartments separately you'd
//   need supervoxel IDs per compartment, which requires a middleauth-authenticated
//   call to the CAVE materialization API. The browser cannot make that call without
//   either a backend proxy (server-side CAVE token) or pre-exported
//   supervoxel→compartment tables shipped alongside the SWC files.

const VIEWER_BASE = 'https://spelunker.cave-explorer.org';

const DIMS = { x: [4e-9, 'm'], y: [4e-9, 'm'], z: [4e-8, 'm'] };

const SOURCE_TRANSFORM = {
    transform: { outputDimensions: DIMS },
    subsources: {},
    enableDefaultSubsources: true,
};

const SEG_SOURCES = [
    {
        url: 'graphene://middleauth+https://minnie.microns-daf.com/segmentation/table/minnie65_public',
        ...SOURCE_TRANSFORM,
    },
    {
        url: 'precomputed://middleauth+https://minnie.microns-daf.com/skeletoncache/api/v1/minnie65_public/precomputed/skeleton/',
        ...SOURCE_TRANSFORM,
    },
];

export function buildNeuroglancerUrl(neurons: Array<{ id: string; color: string }>): string {
    const neuronLayers = neurons.map(({ id, color }) => ({
        type: 'segmentation',
        source: SEG_SOURCES,
        segments: [id],
        selectedAlpha: 0.2,
        notSelectedAlpha: 0.0,
        objectAlpha: 0.9,
        segmentColors: { [id]: color },
        meshSilhouetteRendering: 0.0,
        pick: true,
        name: `neuron-${id}`,
    }));

    const state = {
        position: [245194.0, 191667.0, 21354.0],
        layout: 'xy-3d',
        dimensions: DIMS,
        crossSectionScale: 1.0,
        projectionScale: 50000.0,
        showSlices: false,
        layers: [
            {
                type: 'image',
                source: [
                    {
                        url: 'precomputed://https://bossdb-open-data.s3.amazonaws.com/iarpa_microns/minnie/minnie65/em',
                        ...SOURCE_TRANSFORM,
                    },
                ],
                name: 'imagery',
            },
            {
                type: 'segmentation',
                source: SEG_SOURCES,
                segments: [],
                selectedAlpha: 0.5,
                notSelectedAlpha: 0.0,
                objectAlpha: 1.0,
                segmentColors: {},
                meshSilhouetteRendering: 0,
                pick: true,
                name: 'segmentation',
            },
            ...neuronLayers,
        ],
    };
    return `${VIEWER_BASE}/#!${encodeURIComponent(JSON.stringify(state))}`;
}
