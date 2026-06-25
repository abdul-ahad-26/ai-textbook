---
id: urdf-humanoids
title: "Describing a Humanoid with URDF"
sidebar_label: URDF for Humanoids
description: How URDF describes a humanoid's links, joints, and kinematics for simulators and controllers.
keywords: [urdf, links, joints, kinematics, tf, humanoid, xacro]
---

# Describing a Humanoid with URDF

Before a robot can be simulated, visualized, or controlled, every tool in the stack needs to agree on
one thing: **what the robot's body actually is.** How many joints? Where is the elbow relative to the
shoulder? Which way does the knee bend? The **Unified Robot Description Format (URDF)** is the XML
language that answers these questions.

## Links and joints: the two nouns

A URDF describes a robot as a tree of **links** connected by **joints**.

- A **link** is a rigid body — a thigh, a forearm, the torso. It has *visual* geometry (what you see),
  *collision* geometry (what physics uses), and *inertial* properties (mass, center of mass, inertia tensor).
- A **joint** connects a parent link to a child link and defines how they move relative to each other.

```xml
<?xml version="1.0"?>
<robot name="mini_humanoid">

  <!-- A link: the torso -->
  <link name="torso">
    <visual>
      <geometry><box size="0.20 0.15 0.30"/></geometry>
    </visual>
    <collision>
      <geometry><box size="0.20 0.15 0.30"/></geometry>
    </collision>
    <inertial>
      <mass value="4.0"/>
      <inertia ixx="0.05" iyy="0.05" izz="0.02" ixy="0" ixz="0" iyz="0"/>
    </inertial>
  </link>

  <link name="upper_arm_right"><!-- visual/collision/inertial omitted --></link>

  <!-- A joint: the right shoulder, a revolute (hinge) joint -->
  <joint name="shoulder_right" type="revolute">
    <parent link="torso"/>
    <child  link="upper_arm_right"/>
    <origin xyz="0.0 -0.12 0.12" rpy="0 0 0"/>   <!-- where the joint sits on the torso -->
    <axis   xyz="0 1 0"/>                          <!-- rotates about the Y axis -->
    <limit lower="-1.57" upper="1.57" effort="20" velocity="2.0"/>
  </joint>

</robot>
```

## Joint types you will use on a humanoid

| Type | Motion | Humanoid example |
|------|--------|------------------|
| `revolute` | Rotation with limits | Knee, elbow, shoulder pitch |
| `continuous` | Unlimited rotation | Wheels (on a wheeled base) |
| `prismatic` | Linear sliding with limits | A linear actuator / telescoping joint |
| `fixed` | No motion | Rigidly attaching a sensor to a link |
| `floating` | 6-DOF free | The robot's root relative to the world |

A humanoid is mostly `revolute` joints arranged in **kinematic chains**: torso → upper arm → forearm →
hand; pelvis → thigh → shin → foot. The order of links in these chains *is* information — it defines
how transforms compose.

## TF: the coordinate-frame triad

Every link carries a **coordinate frame** (the red/green/blue XYZ triad you see in RViz: X-red, Y-green,
Z-blue). ROS 2's **TF2** library continuously computes the transform between any two frames from the joint
angles. This is how the robot answers *"where is my right hand in the world right now?"* — a question
the perception and manipulation stacks ask constantly.

```bash
# Publish the robot's frames from its URDF + live joint states
ros2 run robot_state_publisher robot_state_publisher --ros-args -p robot_description:="$(cat humanoid.urdf)"

# Then query a transform
ros2 run tf2_ros tf2_echo torso right_hand
```

## Xacro: URDF without the copy-paste

A full humanoid URDF has left/right symmetry and dozens of near-identical joints. Writing raw XML is
error-prone, so we use **Xacro** (XML macros) to parameterize and reuse definitions:

```xml
<xacro:macro name="leg" params="side reflect">
  <joint name="hip_${side}" type="revolute">
    <origin xyz="0 ${reflect * 0.10} -0.15"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.0" upper="1.0" effort="40" velocity="3.0"/>
    <parent link="pelvis"/><child link="thigh_${side}"/>
  </joint>
  <!-- ...thigh, knee, shin, ankle, foot... -->
</xacro:macro>

<xacro:leg side="left"  reflect="1"/>
<xacro:leg side="right" reflect="-1"/>
```

## Why this matters for the rest of the course

The same URDF feeds **everything** downstream:

- **Gazebo** (Module 2) reads the collision + inertial data to simulate physics.
- **Unity / RViz** read the visual data to render the robot.
- **MoveIt / Nav2** read the kinematic chain to plan motion.
- **Isaac** (Module 3) imports the description to generate synthetic training data.

Get the URDF right and the whole stack agrees on your robot's body. Get a joint axis or a mass wrong,
and your robot will mysteriously drift, tip over in simulation, or plan impossible motions.

:::tip Validate before you simulate
Run `check_urdf humanoid.urdf` and visualize with `ros2 launch urdf_tutorial display.launch.py` before
loading into a physics engine. Most "the robot exploded in Gazebo" bugs are bad inertials or
overlapping collision geometry in the URDF.
:::

That completes the robot's nervous system. Next, give it a world to live in:
[Module 2 — The Digital Twin →](/module-2-simulation/overview).
