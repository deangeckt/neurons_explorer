"""Convert background_skeletons/*.pkl to *.json for the web app.

Run whenever new .pkl files are added to public/background_skeletons/.

Each JSON file contains a flat array "s" of [x1,y1,z1,x2,y2,z2,...] segment
coordinates in um.  Only compartments 3 (basal dendrite) and 4 (apical
dendrite) are kept.
"""

import json
import os
import pickle
import warnings

import numpy as np

SRC_DIR = os.path.join(os.path.dirname(__file__), "public", "background_skeletons")
KEEP_COMPARTMENTS = {3, 4}


def convert(pkl_path: str) -> list[float]:
    with open(pkl_path, "rb") as f:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            sk = pickle.load(f)

    vertices: np.ndarray = sk.vertices
    edges: np.ndarray = sk.edges
    compartments: np.ndarray = sk.vertex_properties["compartment"]

    keep_mask = np.isin(compartments, list(KEEP_COMPARTMENTS))

    flat: list[float] = []
    for i, j in edges:
        if keep_mask[i] and keep_mask[j]:
            v1 = vertices[i]
            v2 = vertices[j]
            flat.extend([
                round(float(v1[0]), 3), round(float(v1[1]), 3), round(float(v1[2]), 3),
                round(float(v2[0]), 3), round(float(v2[1]), 3), round(float(v2[2]), 3),
            ])
    return flat


def main():
    converted = 0
    for fname in sorted(os.listdir(SRC_DIR)):
        if not fname.endswith(".pkl"):
            continue
        pkl_path = os.path.join(SRC_DIR, fname)
        out_path = os.path.join(SRC_DIR, fname.replace(".pkl", ".json"))
        segs = convert(pkl_path)
        with open(out_path, "w") as f:
            json.dump({"s": segs}, f, separators=(",", ":"))
        print(f"{fname} -> {os.path.basename(out_path)}  ({len(segs) // 6} segments)")
        converted += 1

    if converted == 0:
        print("No .pkl files found in", SRC_DIR)
    else:
        print(f"\nDone. {converted} file(s) converted.")
        print("Remember to update the ids list in src/explorer/dataLoader.ts.")


if __name__ == "__main__":
    main()
