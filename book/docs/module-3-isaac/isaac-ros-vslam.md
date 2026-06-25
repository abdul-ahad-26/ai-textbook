---
id: isaac-ros-vslam
title: "Isaac ROS — Hardware-Accelerated VSLAM"
sidebar_label: Isaac ROS & VSLAM
description: Real-time Visual SLAM on the Jetson edge with NVIDIA Isaac ROS.
keywords: [isaac ros, vslam, slam, localization, mapping, jetson, nitros]
---

# Isaac ROS — Hardware-Accelerated VSLAM

A robot moving through the world must constantly answer two questions: *"What does the world around me
look like?"* (mapping) and *"Where am I in it?"* (localization). Solving both at once, while moving, is
**SLAM — Simultaneous Localization and Mapping**. When the primary sensor is a camera, it's **Visual
SLAM (VSLAM)**.

## Why "hardware-accelerated" is the whole point

VSLAM is computationally brutal: track hundreds of visual features across frames, estimate camera motion,
build and correct a map — at camera frame rate. On a CPU this is too slow for a moving humanoid. **Isaac
ROS** provides VSLAM (and other algorithms) as **GEMs** — GPU-accelerated ROS 2 packages — that run in
real time on the **Jetson Orin** edge brain from the course kit.

The acceleration comes from **NITROS** (NVIDIA Isaac Transport for ROS): a zero-copy transport that keeps
image data on the GPU and passes it between nodes by *handle* instead of copying it through CPU memory.
Eliminating those copies is what makes the pipeline real-time.

```
[RealSense D435i] ─/image,/depth─► [ isaac_ros_visual_slam (GPU) ] ─► /visual_slam/tracking/odometry
                                                                   └─► /tf (camera pose in map frame)
```

## Running VSLAM

Isaac ROS VSLAM consumes a stereo or depth camera stream and produces a continuous pose estimate plus a
map, published as standard ROS 2 topics and TF transforms:

```bash
ros2 launch isaac_ros_visual_slam isaac_ros_visual_slam.launch.py
# Inputs:  /stereo_camera/left/image, /stereo_camera/right/image (or RealSense depth)
# Outputs: /visual_slam/tracking/odometry  (nav_msgs/Odometry)
#          /tf  (map -> base_link transform — "where am I")
```

Because the output is a normal `map -> base_link` transform, **Nav2 consumes it without knowing or caring
that a GPU produced it** — the twin/interface principle once more.

## VSLAM vs. wheel odometry vs. LiDAR SLAM

| Method | Pros | Cons |
|--------|------|------|
| Wheel/joint odometry | Cheap, high-rate | Drifts badly; useless for a slipping/walking biped |
| LiDAR SLAM | Accurate geometry, robust | Heavier sensor; sparse texture info |
| **VSLAM** | Rich visual info, lightweight sensor, relocalization | Struggles in texture-less or dark scenes |

For a humanoid that walks (no wheels to count) and carries a camera anyway, **VSLAM is the natural
backbone**, often fused with the IMU (visual-inertial odometry) for robustness during fast motion.

## Loop closure: fixing drift

All odometry drifts — small errors accumulate, so the estimated path slowly diverges from the true one.
VSLAM's superpower is **loop closure**: when the robot *recognizes a previously seen place*, it snaps the
map back into consistency, erasing the accumulated drift. This is what lets a robot explore a building and
return with a coherent map.

:::tip On the edge, measure everything
On a Jetson, thermal and power limits are real. Use `jtop` (jetson-stats) to watch GPU load, memory, and
temperature while VSLAM runs. If you exceed the power budget, frame rate drops and tracking gets lost —
exactly the "resource constraints vs. your powerful workstation" lesson the course kit is meant to teach.
:::

With reliable localization and a map, the robot can finally plan where to go. Next:
[Nav2 — Path Planning for Bipedal Movement →](./nav2-bipedal).
