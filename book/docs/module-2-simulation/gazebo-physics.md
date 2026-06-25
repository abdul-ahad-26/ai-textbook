---
id: gazebo-physics
title: "Simulating Physics, Gravity & Collisions in Gazebo"
sidebar_label: Gazebo Physics
description: Set up a Gazebo world, spawn a URDF robot, and bridge it to ROS 2.
keywords: [gazebo, sdf, physics, collision, ros_gz_bridge, spawn]
---

# Simulating Physics, Gravity & Collisions in Gazebo

Gazebo (the modern "Gz" / Ignition generation) is a physics engine wrapped in a simulator. It takes your
robot's mass, inertia, and collision shapes and integrates the equations of rigid-body motion forward in
time — gravity pulls, joints constrain, and contacts push back.

## Worlds are described in SDF

Where robots are described in URDF, *worlds* use **SDF (Simulation Description Format)** — a superset that
also describes lighting, physics parameters, and the ground.

```xml
<?xml version="1.0"?>
<sdf version="1.10">
  <world name="lab">
    <physics name="default" type="ode">
      <max_step_size>0.001</max_step_size>      <!-- 1 ms steps = 1000 Hz physics -->
      <real_time_factor>1.0</real_time_factor>  <!-- aim for real time -->
    </physics>
    <gravity>0 0 -9.81</gravity>

    <include><uri>model://ground_plane</uri></include>
    <include><uri>model://sun</uri></include>
  </world>
</sdf>
```

The `max_step_size` is the single most important knob: smaller steps are more accurate and more stable
but slower. Stiff contacts (a foot striking the floor) need small steps or the robot jitters and
"explodes."

## Spawning your robot and bridging to ROS 2

```bash
# 1. Launch the world
gz sim lab.sdf

# 2. Spawn the URDF robot into it
ros2 run ros_gz_sim create -name humanoid -file humanoid.urdf -z 0.9

# 3. Bridge Gazebo topics <-> ROS 2 topics so your nodes can talk to the sim
ros2 run ros_gz_bridge parameter_bridge \
  /cmd_vel@geometry_msgs/msg/Twist@gz.msgs.Twist \
  /scan@sensor_msgs/msg/LaserScan@gz.msgs.LaserScan \
  /imu@sensor_msgs/msg/Imu@gz.msgs.IMU
```

The `parameter_bridge` is the heart of the integration: the `@` syntax maps a topic between the ROS 2
type (left) and the Gazebo type (right). After this, the `AgentBridge` node from Module 1 controls the
*simulated* humanoid with zero changes.

## Why robots "explode" — and how to stop it

The most common beginner experience is a robot that violently flies apart on spawn. The physics engine
is telling you the model is inconsistent. The usual culprits:

1. **Bad inertials.** Zero or wildly wrong mass/inertia makes the solver unstable. Every link needs
   physically plausible `<inertial>` values.
2. **Overlapping collisions.** Two collision shapes intersecting at spawn create enormous repulsive
   forces. Check joint origins.
3. **Step size too large** for stiff contacts. Lower `max_step_size`.
4. **Self-collision** between adjacent links that should be allowed to touch. Disable it selectively.

:::tip Real-time factor (RTF) is your performance gauge
Gazebo reports an RTF. `RTF = 1.0` means simulation runs at wall-clock speed. If a complex humanoid scene
drops to `0.2`, every real second takes five sim seconds — training and testing crawl. This is exactly
why the course recommends a strong CPU: rigid-body dynamics is CPU-bound.
:::

## Controllers: ros2_control

To actually move joints, Gazebo robots use **`ros2_control`** — a hardware-abstraction framework that
exposes joint command and state interfaces. The same controller configuration (`JointTrajectoryController`,
`DiffDriveController`, etc.) drives a simulated robot in Gazebo and a real robot, again preserving the
twin's identical interface.

Next: [Rendering & Human-Robot Interaction in Unity →](./unity-hri).
