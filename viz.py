# %%
import os
from notebook_config import init_
init_(data_path='data_1718', network_name='micro_column_network')

# %%
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import pickle
from tqdm import tqdm
from matplotlib.lines import Line2D
from mpl_toolkits.axes_grid1.anchored_artists import AnchoredSizeBar
import matplotlib.font_manager as fm
import ipywidgets as widgets
from IPython.display import display

from plot_utils import plot_skeleton_continuous, ei_palette, ex_color, inh_color
from utils import load_neurons_table, load_synapses_position_transformed, transform_sk
from sk_load_utils import filter_skeleton, load_col_skeleton_only

# adding here

def transform_coord(df, s3=True, is_scale=True):
    if s3:
        df['pos'] = df['pos'].apply(lambda x: x * 1000)
    if is_scale:
        df['pos'] = df['pos'].apply(lambda x: x / np.array([4, 4, 40]))
    X_transformed = minnie_ds.transform_vx.apply_dataframe('pos', df)  # read online here: https://tutorial.microns-explorer.org/quickstart_notebooks/08-standard-transform.html#standard-transform
    X_transformed = np.array(X_transformed)
    df['pos'] = list(X_transformed)


def transform_sk(sk, s3=True):
    sk_pos_df = pd.DataFrame({'pos': list(sk.vertices)})
    transform_coord(sk_pos_df, s3=s3, is_scale=True)
    sk.vertices = list(sk_pos_df.pos)


def plot_3d_box(ax_top, layer_fontsize=10):
    # 3D BOX around panel — solid block feel

    dx, dy = 0.05, 0.06  # depth offset — increase for more perspective

    front = [(0,0), (1,0), (1,1), (0,1)]  # BL, BR, TR, TL
    back  = [(0+dx, 0-dy), (1+dx, 0-dy), (1+dx, 1-dy), (0+dx, 1-dy)]

    box_color_front = '#4a4a4a'
    box_color_back  = '#888888'
    face_fill_color = '#c8c8c8'
    box_lw_front = 1.2
    box_lw_back  = 0.7
    box_alpha = 0.6
    face_alpha = 0.13  # subtle fill — adjust to taste

    trans = ax_top.transAxes

    # ---- Filled side faces (drawn BEFORE edges so edges appear on top) ----

    # Right face: front-BR, back-BR, back-TR, front-TR
    right_face = MplPolygon(
        [front[1], back[1], back[2], front[2]],
        closed=True, transform=trans, clip_on=False,
        facecolor=face_fill_color, edgecolor='none', alpha=face_alpha, zorder=0
    )
    ax_top.add_patch(right_face)

    # Top face: front-TL, front-TR, back-TR, back-TL
    top_face = MplPolygon(
        [front[3], front[2], back[2], back[3]],
        closed=True, transform=trans, clip_on=False,
        facecolor=face_fill_color, edgecolor='none', alpha=face_alpha * 1.4, zorder=0
    )
    ax_top.add_patch(top_face)

    # Bottom face: front-BL, front-BR, back-BR, back-BL
    bottom_face = MplPolygon(
        [front[0], front[1], back[1], back[0]],
        closed=True, transform=trans, clip_on=False,
        facecolor=face_fill_color, edgecolor='none', alpha=face_alpha, zorder=0
    )
    ax_top.add_patch(bottom_face)

    # ---- Back face edges (dashed, lighter) ----
    back_loop = back + [back[0]]
    bx, by = zip(*back_loop)
    ax_top.plot(bx, by, transform=trans, clip_on=False,
                color=box_color_back, lw=box_lw_back, alpha=0.4,
                linestyle='--', zorder=1)

    # ---- Depth lines (back corners to front corners) ----
    for (fx, fy), (bkx, bky) in zip(front, back):
        ax_top.plot([fx, bkx], [fy, bky], transform=trans, clip_on=False,
                    color=box_color_back, lw=box_lw_back, alpha=0.45,
                    linestyle='-', zorder=1)

    # ---- Front face edges (solid, darker — drawn last so they're on top) ----
    front_loop = front + [front[0]]
    fx_list, fy_list = zip(*front_loop)
    ax_top.plot(fx_list, fy_list, transform=trans, clip_on=False,
                color=box_color_front, lw=box_lw_front, alpha=box_alpha,
                linestyle='-', zorder=2)


    # ==========================================
    # LAYER DEPTH LINES — right face of 3D box only
    # ==========================================
    microns_ex_depths = {'L2/3': 250, 'L4': 350, 'L5': 510, 'L6': 750}
    y_data_bottom = 750  # matches ax_top.set_ylim(750, 0)

    prev_depth = 0
    depths_items = list(microns_ex_depths.items())

    for i, (layer_label, depth_um) in enumerate(depths_items):
        y_ax = 1.0 - depth_um / y_data_bottom

        # --- boundary line across the right face ---
        x_f, y_f = 1.0,      y_ax
        x_b, y_b = 1.0 + dx, y_ax - dy

        ax_top.plot([x_f, x_b], [y_f, y_b],
                    transform=trans, clip_on=False,
                    color=box_color_front, lw=0.9, alpha=0.65,
                    linestyle='--', zorder=3)

        # --- label at vertical midpoint of this layer ---
        # next boundary is either the next layer's depth or the bottom of the panel
        next_depth = depths_items[i + 1][1] if i + 1 < len(depths_items) else y_data_bottom
        mid_depth  = (prev_depth + depth_um) / 2
        y_mid_ax   = 1.0 - mid_depth / y_data_bottom

        ax_top.text(x_b + 0.012, y_mid_ax - dy * (mid_depth / depth_um if depth_um else 0),
                    layer_label,
                    transform=trans, clip_on=False,
                    fontsize=layer_fontsize, family='Arial',
                    ha='left', va='center',
                    color=box_color_front, alpha=0.9)

        prev_depth = depth_um


# %%
neurons_df = load_neurons_table()
syn_df = load_synapses_position_transformed()
print(f'Loaded {len(neurons_df)} neurons and {len(syn_df)} intrinsic synapses')

# %%
# neurons_df.to_csv('neurons_1718.csv', index=False)

# %%
v661_sk_dir = 'data/all_network/skeletons_s3'
all_skeletons_files = os.listdir(v661_sk_dir)

def _load_sk(nucleus_id):
    path = f'{v661_sk_dir}/{nucleus_id}.pkl'
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return None
    with open(path, 'rb') as f:
        sk = pickle.load(f)
    transform_sk(sk, s3=True)
    return filter_skeleton(sk, target_compartments=[3, 4])

all_skeletons = []
for sk_file in tqdm(np.random.choice(all_skeletons_files, size=10)):
    sk = _load_sk(int(sk_file.split('.')[0]))
    if sk is None:
        continue
    if 600 < sk.root_position[0] < 735:
        continue
    all_skeletons.append(sk)

# %%
neurons_col_data = [
    (864691135277186789, '23P', ex_color),
    (864691135875777166, 'BC',  inh_color),
]
top_two_neurons = [nid for nid, _, _ in neurons_col_data]
top_two_neurons_pos = [
    neurons_df[neurons_df.root_id == n][['pt_position_xt', 'pt_position_yt']].iloc[0]
    for n in top_two_neurons
]
column_neurons_ids = [nid for nid, _, _ in neurons_col_data]
column_colors      = [c   for _, _, c in neurons_col_data]
column_skeletons   = [load_col_skeleton_only(nid, reset_axon=True, old=True)
                      for nid in tqdm(column_neurons_ids)]

# %%
fig, ax_top = plt.subplots(figsize=(13, 6), dpi=600)

for sk in all_skeletons:
    plot_skeleton_continuous(ax=ax_top, sk=sk, lw=0.5, alpha=0.5, color="#3E3C3C")

sns.scatterplot(data=neurons_df, x='pt_position_xt', y='pt_position_yt',
                hue='clf_type', palette=ei_palette, ax=ax_top, s=7, alpha=0.25)

for neuron_id, sk, color in zip(column_neurons_ids, column_skeletons, column_colors):
    in_top = neuron_id in top_two_neurons
    lw = 3 if in_top else (1.4 if color == inh_color else 1)
    plot_skeleton_continuous(ax=ax_top, sk=sk, lw=lw, alpha=1,
                             color=color, ignore_vertex_zero=not in_top)

ax_top.set_ylim(750, 0)
ax_top.set_xlim(250, 1500)
ax_top.set_aspect('equal')
ax_top.set_title('')
for spine in ax_top.spines.values():
    spine.set_visible(False)
ax_top.tick_params(left=False, right=False, labelleft=False, labelbottom=False, bottom=False)
ax_top.set_xlabel('')
ax_top.set_ylabel('')
ax_top.get_legend().remove()

plot_3d_box(ax_top, layer_fontsize=10)

fig.canvas.draw()

fontprops = fm.FontProperties(size=14, family='Arial')
bbox = ax_top.get_window_extent(renderer=fig.canvas.get_renderer())
sv = (abs(np.diff(ax_top.get_ylim()))[0] / bbox.height) * (1 / (72 / fig.dpi)) * 1.5
ax_top.add_artist(AnchoredSizeBar(
    transform=ax_top.transData, size=100, label='100 µm', sep=5,
    loc='lower right', pad=0.5, color='black', frameon=False,
    size_vertical=sv, fontproperties=fontprops,
))

plt.show()

# %% [markdown]
# ## Interactive: random src neuron + outgoing targets

# %%
# Pre-compute valid src neurons: in column and have >= 1 target also in the column
column_ids_set = set(neurons_df['root_id'].values)
valid_src_ids = [
    src for src in syn_df['pre_id'].unique()
    if src in column_ids_set
    and syn_df[(syn_df.pre_id == src) & (syn_df.post_id.isin(column_ids_set))]['post_id'].nunique() >= 1
]
print(f'{len(valid_src_ids)} neurons have outgoing within-column synapses')

# %%
import ipywidgets as widgets
from IPython.display import display

# ── Cell-type toggle buttons ──────────────────────────────────────────────────
cell_types = sorted(neurons_df['cell_type'].dropna().unique())

def make_toggles():
    btns = {}
    for ct in cell_types:
        b = widgets.ToggleButton(
            value=True, description=ct, button_style='success',
            layout=widgets.Layout(width='72px', height='26px', margin='2px'),
        )
        def _on_toggle(change, _b=b):
            _b.button_style = 'success' if change['new'] else ''
        b.observe(_on_toggle, names='value')
        btns[ct] = b
    return btns

src_btns = make_toggles()
dst_btns = make_toggles()

lbl = widgets.Layout(width='80px', margin='3px 6px 0 0')
src_row = widgets.HBox([widgets.Label('Src types:', layout=lbl)] + list(src_btns.values()))
dst_row = widgets.HBox([widgets.Label('Dst types:', layout=lbl)] + list(dst_btns.values()))

out      = widgets.Output()
info_out = widgets.Output()

def selected_ids(btns):
    types = {ct for ct, b in btns.items() if b.value}
    if not types:
        types = set(cell_types)   # fallback: treat all as selected
    return set(neurons_df[neurons_df.cell_type.isin(types)]['root_id'].values)

def randomize(_=None):
    src_pool = selected_ids(src_btns) & set(valid_src_ids)
    dst_pool = selected_ids(dst_btns) & column_ids_set

    # ── Validate pools ────────────────────────────────────────────────────────
    if not src_pool:
        with out:
            out.clear_output(wait=True)
            print("No src neurons match the selected cell types.")
        return

    # ── Sample src ────────────────────────────────────────────────────────────
    src_id     = np.random.choice(list(src_pool))
    src_neuron = neurons_df[neurons_df.root_id == src_id].iloc[0]

    out_syns       = syn_df[(syn_df.pre_id == src_id) & (syn_df.post_id.isin(dst_pool))]
    unique_targets = out_syns['post_id'].unique()

    if len(unique_targets) == 0:
        with out:
            out.clear_output(wait=True)
            print(f"src {src_id} ({src_neuron.cell_type}) has no targets in the selected dst types — try randomizing again.")
        return

    # ── Sample dst ────────────────────────────────────────────────────────────
    dst_ids = np.random.choice(unique_targets, size=min(3, len(unique_targets)), replace=False)

    # ── Load skeletons ────────────────────────────────────────────────────────
    with out:
        out.clear_output(wait=True)
        print("Loading skeletons…")

    src_dendrite_sk = load_col_skeleton_only(src_id, reset_axon=True,      old=True)
    src_axon_sk     = load_col_skeleton_only(src_id, reset_dentrites=True,  old=True)

    dst_sks = []
    for dst_id in dst_ids:
        try:
            dst_sks.append((dst_id, load_col_skeleton_only(dst_id, reset_axon=True, old=True)))
        except Exception:
            pass

    loaded_dst_ids = [d for d, _ in dst_sks]
    conn_syns      = out_syns[out_syns.post_id.isin(loaded_dst_ids)]

    # ── Plot ──────────────────────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(13, 6), dpi=150)

    for sk in all_skeletons:
        plot_skeleton_continuous(ax=ax, sk=sk, lw=0.5, alpha=0.2, color='#3E3C3C')

    for _, sk in dst_sks:
        plot_skeleton_continuous(ax=ax, sk=sk, lw=2, alpha=0.8, color='royalblue')

    plot_skeleton_continuous(ax=ax, sk=src_dendrite_sk, lw=2.25, alpha=1, color='darkorange')

    if len(src_axon_sk.vertices) > 1:
        plot_skeleton_continuous(ax=ax, sk=src_axon_sk, lw=1.75, alpha=0.9, color='darkgreen')

    if len(conn_syns) > 0:
        ax.scatter(conn_syns['pt_position_xt'], conn_syns['pt_position_yt'],
                   c='red', s=20, zorder=10, alpha=0.9)

    ax.set_ylim(750, 0)
    ax.set_xlim(250, 1500)
    ax.set_aspect('equal')
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.tick_params(left=False, right=False, labelleft=False, labelbottom=False, bottom=False)
    ax.set_xlabel('')
    ax.set_ylabel('')

    plot_3d_box(ax, layer_fontsize=10)

    ax.legend(handles=[
        Line2D([0], [0], color='darkorange', lw=2,
               label=f'src dendrite  ({src_neuron.clf_type}, {src_neuron.cell_type})'),
        Line2D([0], [0], color='darkgreen',  lw=2, label='src axon'),
        Line2D([0], [0], color='royalblue',  lw=2, label=f'dst dendrites  (n={len(dst_sks)})'),
        Line2D([0], [0], marker='o', linestyle='none', color='red', markersize=6,
               label=f'synapses onto dst  (n={len(conn_syns)})'),
    ], frameon=False, loc='lower left', fontsize=9)

    # ── Scale bar ─────────────────────────────────────────────────────────────
    fig.canvas.draw()
    fontprops = fm.FontProperties(size=12, family='Arial')
    bbox_ax = ax.get_window_extent(renderer=fig.canvas.get_renderer())
    sv = (abs(np.diff(ax.get_ylim()))[0] / bbox_ax.height) * (1 / (72 / fig.dpi)) * 1.5
    ax.add_artist(AnchoredSizeBar(
        transform=ax.transData, size=100, label='100 µm', sep=5,
        loc='lower right', pad=0.5, color='black', frameon=False,
        size_vertical=sv, fontproperties=fontprops,
    ))

    with out:
        out.clear_output(wait=True)
        plt.show()
    plt.close(fig)

    # ── Neuron ID details ─────────────────────────────────────────────────────
    with info_out:
        info_out.clear_output(wait=True)
        sep = '─' * 64
        print(sep)
        print(f"  src   {src_id}   {src_neuron.clf_type} / {src_neuron.cell_type}")
        for dst_id, _ in dst_sks:
            dst_r  = neurons_df[neurons_df.root_id == dst_id].iloc[0]
            n_syns = len(conn_syns[conn_syns.post_id == dst_id])
            print(f"  dst   {dst_id}   {dst_r.clf_type} / {dst_r.cell_type}   ({n_syns} syn)")
        print(sep)

# ── Assemble UI ───────────────────────────────────────────────────────────────
btn = widgets.Button(description='Randomize', button_style='primary',
                     layout=widgets.Layout(width='140px', height='36px'))
btn.on_click(randomize)

display(widgets.VBox([src_row, dst_row, btn, out, info_out]))
randomize()


