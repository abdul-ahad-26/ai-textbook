---
id: overview
title: "Module 2 — The Digital Twin (Gazebo & Unity)"
sidebar_label: Overview
description: Physics simulation and environment building with Gazebo and Unity for humanoid robots.
keywords: [gazebo, unity, simulation, digital twin, physics, sensors]
---

# Module 2 — The Digital Twin (Gazebo & Unity)

> **Focus:** Physics simulation and environment building.

You should never debug a balance controller on a real $16,000 humanoid. If the code is wrong, the robot
falls, and you have a repair bill. The professional workflow is **simulation first**: build a *digital
twin* — a physics-accurate virtual copy of the robot and its world — and prove the software there before
it ever touches hardware. This is also how you generate the vast training data embodied AI needs.

## What you will learn

- **Simulating physics, gravity, and collisions in Gazebo** — the open-source workhorse tightly integrated with ROS 2.
- **High-fidelity rendering and human-robot interaction in Unity** — photorealism and interactive environments.
- **Simulating sensors** — LiDAR, depth cameras, and IMUs that publish the *same ROS 2 topics* a real sensor would.

## Two simulators, two jobs

Gazebo and Unity are not competitors here — they play different roles.

| | **Gazebo** | **Unity** |
|---|---|---|
| Strength | Accurate rigid-body physics, native ROS 2 | Photorealistic rendering, rich interaction |
| Best for | Control, locomotion, sensor physics | Perception data, human-robot interaction, VR |
| Physics engine | ODE / Bullet / DART | PhysX |
| ROS 2 link | `ros_gz_bridge` (built in) | Unity Robotics Hub / ROS-TCP-Connector |

A common pipeline: tune locomotion and control in **Gazebo**, then drop the robot into a
**Unity** scene to generate photorealistic camera data for training perception models.

## The "twin" principle: identical interfaces

The reason simulation works is that the simulated robot exposes the **exact same ROS 2 interface** as
the real one. The same `/cmd_vel` topic drives it; the same `/scan` and `/camera/image_raw` topics come
out. Your control and perception nodes cannot tell the difference — which means code that works in sim
has a real chance of working on hardware.

```
        ┌──────────────── identical ROS 2 interface ────────────────┐
        │                                                            │
   /cmd_vel ─►  [ Gazebo digital twin ]  ─► /scan /imu /camera     ≡  /cmd_vel ─► [ Real robot ] ─► /scan /imu /camera
```

This is also where the famous **sim-to-real gap** lives: friction, sensor noise, and contact dynamics
are never perfectly modeled. Module 3 attacks that gap with photorealistic simulation and domain
randomization in NVIDIA Isaac.

## How this module fits

Module 1 gave the robot a body (URDF) and a nervous system (ROS 2). This module gives it a **world** and
the **physics** that make that world real. With a working digital twin, Module 3 can train AI perception
and navigation at scale, and Module 4 can safely test an LLM commanding the whole system.

Start with [Simulating Physics in Gazebo →](./gazebo-physics).
