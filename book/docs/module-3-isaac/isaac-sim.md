---
id: isaac-sim
title: "Isaac Sim — Photorealistic Simulation & Synthetic Data"
sidebar_label: Isaac Sim
description: Photorealistic simulation and synthetic data generation with NVIDIA Isaac Sim and Omniverse.
keywords: [isaac sim, omniverse, usd, synthetic data, domain randomization, replicator]
---

# Isaac Sim — Photorealistic Simulation & Synthetic Data

Isaac Sim is NVIDIA's robotics simulator built on the Omniverse platform. Where Gazebo prioritizes
physics and Unity prioritizes rendering, Isaac Sim delivers **both at once** — RTX ray-traced
photorealism *and* GPU-accelerated PhysX — purpose-built for generating the data that trains embodied AI.

## Why it needs an RTX GPU

Isaac Sim renders scenes with real **ray tracing**: light bounces, soft shadows, accurate reflections.
To do this it loads the full **USD** scene (robot + environment assets) into GPU memory and runs the AI
models alongside. That is why the course specifies an **RTX 4070 Ti (12 GB) minimum**, with 24 GB
(RTX 3090/4090) ideal — you are holding the scene, the renderer, and the neural networks in VRAM
simultaneously. A non-RTX machine simply cannot run it.

## The killer feature: synthetic data generation

Supervised perception models need labeled images — thousands of them, with bounding boxes and
segmentation masks. Hand-labeling real photos is slow and expensive. Isaac Sim's **Replicator** generates
**perfectly labeled** data automatically, because the simulator already knows where every object is.

```python
# Isaac Sim Replicator: generate randomized, auto-labeled training images
import omni.replicator.core as rep

camera = rep.create.camera(position=(0, 0, 1.5))
render = rep.create.render_product(camera, (1280, 720))

with rep.trigger.on_frame(num_frames=5000):
    # Domain randomization: vary pose, lighting, and textures each frame
    with rep.get.prims(semantics=[("class", "cup")]):
        rep.modify.pose(
            position=rep.distribution.uniform((-1, -1, 0), (1, 1, 0)),
            rotation=rep.distribution.uniform((0, 0, 0), (0, 0, 360)),
        )
    rep.modify.attribute("intensity", rep.distribution.uniform(300, 3000))  # lights

# Writer emits images + bounding boxes + segmentation masks automatically
writer = rep.WriterRegistry.get("BasicWriter")
writer.initialize(output_dir="/data/cups", rgb=True, bounding_box_2d_tight=True, semantic_segmentation=True)
writer.attach([render])
```

In minutes you produce a labeled dataset that would take weeks to collect and annotate by hand.

## Domain randomization: bridging sim-to-real

A model trained on one perfect virtual scene overfits to that scene. **Domain randomization** is the
antidote: deliberately randomize everything *irrelevant* to the task — lighting, textures, camera angle,
distractor objects, even physics parameters. Forced to ignore this variation, the model latches onto the
*invariant* structure of the task and generalizes to the real world, whose appearance becomes "just
another randomization."

```
 reality  ─┐
           ├─► if reality looks like one more random variant,
 sim+DR  ──┘    the model already knows how to handle it
```

## Reinforcement learning at scale

Isaac Sim (via **Isaac Lab**) can run **thousands of robot instances in parallel** on a single GPU. This
is what makes deep **reinforcement learning** practical for locomotion: a bipedal walking policy that
would need years of real-world falls can be trained in hours across thousands of simultaneous simulated
robots, then transferred to hardware.

:::info Where this leads
The synthetic datasets and trained policies you build here feed directly into the next two sections:
perception models power **Isaac ROS VSLAM**, and the navigation goals they enable are executed by
**Nav2**.
:::

Next: [Isaac ROS — Hardware-Accelerated VSLAM →](./isaac-ros-vslam).
