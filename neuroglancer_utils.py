from nglui import statebuilder
from caveclient import CAVEclient
from typing import Optional
from nglui.statebuilder import helpers
import pandas as pd
import numpy as np
from nglui.statebuilder import ViewerState
from neuron import Neuron
from plot_utils import ex_color, inh_color

def generate_neuroglancer_link(root_ids: list, version=1718, client: Optional[CAVEclient]=None):
    if client is None:
        client = CAVEclient("minnie65_public")
        client.materialize.version = version
    print(client.materialize.version)

    vs = (
        statebuilder.ViewerState(client=client)
        .add_layers_from_client(imagery=True, segmentation=True)
    )
    for idx, root_id in enumerate(root_ids): 
        vs = vs.add_segmentation_layer(
            source=vs.layers['segmentation'].source if hasattr(vs, 'layers') else None,
            name=f'neuron-{idx}',
            segments=[root_id]
        )

    return vs.to_url(shorten=True, client=client)


def generate_neuroglancer_link_with_synapses(root_id: int, exc_synapses: pd.DataFrame, inh_synapses: pd.DataFrame,
                                             client: Optional[CAVEclient]=None, version=1718,
                                             ):
    if client is None:
        client = CAVEclient("minnie65_public")
        client.materialize.version = version

    large_point_shader = """
    #uicontrol float radius slider(min=1, max=50, step=1, default=12)
    void main() {
    setColor(defaultColor());
    setPointMarkerSize(radius);
    }
    """
    vs = (
        statebuilder.ViewerState(client=client)
        .add_layers_from_client(imagery=True, segmentation=True)
    )

    vs = vs.add_segmentation_layer(
        source=vs.layers['segmentation'].source if hasattr(vs, 'layers') else None,
        name='neuron',
        segments=[root_id]
    )

    vs.add_annotation_layer(
        name='syn_exc',
        color=ex_color,
        linked_segmentation={'pre_pt_root_id': 'neuron'},
        shader=large_point_shader
    )
    vs.add_points(
        data=exc_synapses,
        name='syn_exc',
        point_column='ctr_pt_position',
    )

    vs.add_annotation_layer(
        name='syn_inh',
        color=inh_color,
        linked_segmentation={'pre_pt_root_id': 'neuron'},
        shader=large_point_shader
    )
    vs.add_points(
        data=inh_synapses,
        name='syn_inh',
        point_column='ctr_pt_position',
    )

    return vs.to_url(shorten=True, client=client)


def generate_neuroglancer_link_with_all_synapses(root_id: int,
                                                 synapses: Optional[pd.DataFrame]=None, 
                                                 client: Optional[CAVEclient]=None, version=1718,
                                                 syn_color='#00E676'
                                             ):
    
    if synapses is None:
        import os
        from connectome_types import NEURONS_PATH
        from utils import transform_coord
        import pickle

        with open(os.path.join(NEURONS_PATH, f'{root_id}.pkl'), 'rb') as f:
            full_neuron: Neuron = pickle.load(f)

        all_syn_pos = [(syn.center_position  * np.array([4, 4, 40]) / 1000) for syn in full_neuron.pre_synapses]
        all_syn_center_pos = [syn.center_position for syn in full_neuron.pre_synapses]
        all_syn_sizes = [syn.size for syn in full_neuron.pre_synapses]
        all_syn_pos_df = pd.DataFrame({'pos': all_syn_pos, 'size': all_syn_sizes, 'ctr_pt_position': all_syn_center_pos})

        all_syn_pos_df['post_pt_root_id'] = root_id
        all_syn_pos_df['cell_type'] = 'Unk'
        all_syn_pos_df['pre_pt_root_id'] = 'Unk'
        
        transform_coord(all_syn_pos_df, s3=True)
        synapses = all_syn_pos_df

    if client is None:
        client = CAVEclient("minnie65_public")
        client.materialize.version = version

    large_point_shader = """
    #uicontrol float radius slider(min=1, max=50, step=1, default=12)
    void main() {
    setColor(defaultColor());
    setPointMarkerSize(radius);
    }
    """
    vs = (
        statebuilder.ViewerState(client=client)
        .add_layers_from_client(imagery=True, segmentation=True)
    )

    vs = vs.add_segmentation_layer(
        source=vs.layers['segmentation'].source if hasattr(vs, 'layers') else None,
        name='neuron',
        segments=[root_id]
    )

    vs.add_annotation_layer(
        name='syn',
        color=syn_color,
        # linked_segmentation={'pre_pt_root_id': 'neuron'},
        shader=large_point_shader
    )
    vs.add_points(
        data=synapses,
        name='syn',
        point_column='ctr_pt_position',
    )

    return vs.to_url(shorten=True, client=client)

