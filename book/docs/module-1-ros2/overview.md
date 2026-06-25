---
id: overview
title: "Module 1 — The Robotic Nervous System (ROS 2)"
sidebar_label: Overview
description: Middleware for robot control — ROS 2 nodes, topics, services, actions, and bridging Python AI agents to controllers.
keywords: [ros2, middleware, nodes, topics, dds, rclpy, urdf]
---

# Module 1 — The Robotic Nervous System (ROS 2)

> **Focus:** Middleware for robot control.

A humanoid robot is a distributed system: dozens of sensors and motors, each producing or consuming
data at different rates, often on different computers. Something has to carry messages between the
camera and the planner, between the planner and the leg controllers, reliably and in real time.
That "something" is the **Robot Operating System 2 (ROS 2)** — the *nervous system* of the robot.

ROS 2 is not an operating system in the Linux sense. It is **middleware**: a set of libraries and
conventions for writing modular programs (*nodes*) that discover each other and exchange data over a
network, built on top of the industrial **DDS (Data Distribution Service)** standard.

## What you will learn

- **Nodes, Topics, and Services** — the three core communication patterns, plus **Actions** for long-running goals.
- **Bridging Python agents to ROS controllers** using `rclpy`, so an LLM-driven planner can command real motors.
- **URDF (Unified Robot Description Format)** — how to describe a humanoid's links, joints, and kinematics so simulators and controllers understand its body.

## Why ROS 2 (and not ROS 1)?

| Concern | ROS 1 | ROS 2 |
|---------|-------|-------|
| Transport | Custom TCPROS, central master | **DDS**, fully decentralized (no single point of failure) |
| Real-time | Not designed for it | Real-time friendly (QoS policies) |
| Multi-robot | Painful | First-class |
| Security | None | DDS-Security (auth + encryption) |
| Platforms | Linux only | Linux, Windows, macOS, microcontrollers (micro-ROS) |

For Physical AI we use ROS 2 (the **Humble** or **Iron** LTS distributions) because humanoids are
multi-process, safety-critical, and real-time.

## The mental model

Picture every capability of the robot as an independent program:

```
[camera_node] --/image_raw--> [perception_node] --/detections--> [planner_node]
                                                                      |
                                                            /cmd_vel  v
[imu_node] --/imu/data--> [balance_node] <--/joint_states-- [leg_controller_node]
```

Nodes don't know about each other directly — they publish and subscribe to **named channels**
(topics) and call **named services**. This decoupling is what lets you swap a real camera for a
simulated one, or a scripted planner for an LLM-driven one, **without changing any other node**.

## How this module connects to the rest of the book

Everything downstream rides on ROS 2. In **Module 2** your Gazebo simulation publishes the very same
topics a real robot would. In **Module 3**, Isaac ROS provides hardware-accelerated nodes for VSLAM
and navigation. In **Module 4**, your VLA agent ultimately produces a stream of ROS 2 action goals.
Master the nervous system here, and the brain in later modules has something to command.

Begin with [Nodes, Topics, and Services →](./nodes-topics-services).
