---
id: rclpy-agents
title: "Bridging Python AI Agents to ROS with rclpy"
sidebar_label: Bridging Agents with rclpy
description: Connect an LLM-driven Python agent to ROS 2 controllers using rclpy.
keywords: [rclpy, python, ai agent, llm, ros2 bridge, executor]
---

# Bridging Python AI Agents to ROS with `rclpy`

The promise of Physical AI is to let a **reasoning agent** — often an LLM — decide *what* the robot
should do, while ROS 2 handles *how* to make the motors move. `rclpy` is the Python client library
that connects these two worlds.

## The two-loop problem

An AI agent and a robot run on very different clocks:

- The **control loop** runs fast and forever: balance must be corrected at 100–1000 Hz.
- The **cognitive loop** runs slowly and on demand: an LLM call takes hundreds of milliseconds to seconds.

If you call an LLM inside a control callback, the robot falls over while waiting for the response.
The architectural rule is therefore: **never block the executor.** The agent produces *goals*; fast
ROS controllers execute them.

```
 ┌─────────────────┐    goal (action)     ┌────────────────────┐
 │  Cognitive node │ ───────────────────► │  Fast controllers   │
 │  (LLM / planner)│ ◄─────────────────── │  (balance, legs)    │
 └─────────────────┘   state (topics)     └────────────────────┘
   slow, ~1 Hz                              fast, 100–1000 Hz
```

## A minimal agent bridge node

This node subscribes to robot state, asks a planner for a decision, and publishes a velocity command.
The LLM call is pushed off the executor thread so callbacks never block.

```python
import rclpy
from rclpy.node import Node
from rclpy.executors import MultiThreadedExecutor
from rclpy.callback_groups import ReentrantCallbackGroup
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Twist

class AgentBridge(Node):
    def __init__(self, planner):
        super().__init__('agent_bridge')
        self.planner = planner                  # any object with .decide(observation)
        cb = ReentrantCallbackGroup()
        self.cmd_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.create_subscription(LaserScan, '/scan', self.on_scan, 10, callback_group=cb)
        self.latest_scan = None
        # Cognitive loop runs at 1 Hz, independent of sensor rate
        self.create_timer(1.0, self.think, callback_group=cb)

    def on_scan(self, msg: LaserScan):
        self.latest_scan = msg                  # just cache; never block here

    def think(self):
        if self.latest_scan is None:
            return
        obs = {'min_range': min(self.latest_scan.ranges)}
        action = self.planner.decide(obs)       # may call an LLM/tool internally
        cmd = Twist()
        cmd.linear.x = action['linear_x']
        cmd.angular.z = action['angular_z']
        self.cmd_pub.publish(cmd)

def main():
    rclpy.init()
    node = AgentBridge(planner=SafeReactivePlanner())
    executor = MultiThreadedExecutor()          # parallel callbacks
    executor.add_node(node)
    executor.spin()
```

## A simple reactive planner (stand-in for an LLM)

```python
class SafeReactivePlanner:
    """Stop and turn if an obstacle is close; otherwise go forward."""
    def decide(self, obs):
        if obs['min_range'] < 0.5:
            return {'linear_x': 0.0, 'angular_z': 0.6}   # turn in place
        return {'linear_x': 0.25, 'angular_z': 0.0}      # cruise
```

In [Module 4](/module-4-vla/cognitive-planning) you will replace `decide()` with an LLM that turns a
natural-language command like *"clean the room"* into a sequence of ROS 2 action goals.

## Five rules for agent ↔ ROS bridges

1. **Cache, don't compute, in sensor callbacks.** Heavy work belongs in a separate timer or thread.
2. **Use a `MultiThreadedExecutor`** with reentrant callback groups so slow cognition can't starve fast control.
3. **Prefer actions over services** for anything the agent commands that takes time — you get feedback and cancellation for free.
4. **Always have a reflex.** A fast safety node should override the agent (e-stop on collision) regardless of what the LLM "wants".
5. **Make the agent's output typed and bounded.** Validate `linear_x`/`angular_z` ranges before publishing; never trust raw model output near a motor.

:::warning Safety is not optional
An LLM can hallucinate a command that drives a 40 kg humanoid into a wall. The reflex/safety layer is
a hard requirement of every Physical AI system, not a nice-to-have.
:::

Next: [Describing a Humanoid with URDF →](./urdf-humanoids).
