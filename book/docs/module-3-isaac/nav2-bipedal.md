---
id: nav2-bipedal
title: "Nav2 — Path Planning for Bipedal Movement"
sidebar_label: Nav2 & Path Planning
description: Plan and follow paths for a bipedal humanoid using the ROS 2 Nav2 stack.
keywords: [nav2, path planning, costmap, behavior tree, navigation, bipedal]
---

# Nav2 — Path Planning for Bipedal Movement

Localization tells the robot *where it is*. **Navigation** decides *how to get somewhere else* without
hitting anything. **Nav2** is the ROS 2 navigation stack: given a goal pose and a map, it plans a path and
drives the robot along it, replanning as the world changes.

## The navigation pipeline

Nav2 is organized as a **behavior tree** orchestrating a set of servers:

```
 goal ─► [ Planner server ]  ──global path──►  [ Controller server ] ──/cmd_vel──► robot
            (e.g. A*, NavFn)                       (e.g. DWB, MPPI)
              ▲                                        ▲
              │  global costmap                        │  local costmap
              └──────────────  map + VSLAM + sensors ──┘
         [ Behavior tree navigator ] coordinates recovery when stuck
```

- **Costmaps** turn the map and live sensor data into a grid of "how dangerous is it to be here," inflating
  obstacles by the robot's radius.
- The **global planner** finds a route across the global costmap (A\*, Dijkstra/NavFn, Smac).
- The **controller** (local planner) follows that route while dodging newly-seen obstacles, emitting
  `/cmd_vel`.
- The **behavior tree** runs recovery behaviors (back up, spin, re-plan) when progress stalls.

## Sending a navigation goal

Navigation is a long-running **action** (recall Module 1) — exactly the right primitive:

```python
from nav2_simple_commander.robot_navigator import BasicNavigator
from geometry_msgs.msg import PoseStamped

nav = BasicNavigator()
nav.waitUntilNav2Active()

goal = PoseStamped()
goal.header.frame_id = 'map'
goal.pose.position.x = 3.0
goal.pose.position.y = 1.5
goal.pose.orientation.w = 1.0

nav.goToPose(goal)
while not nav.isTaskComplete():
    feedback = nav.getFeedback()      # distance remaining, ETA — stream progress
print(nav.getResult())                # SUCCEEDED / CANCELED / FAILED
```

In Module 4, the **LLM planner emits exactly these goals** — turning *"go to the kitchen"* into a
`goToPose` call.

## What's special about a biped

Nav2 was born for wheeled robots, where `/cmd_vel` (a body-frame velocity) maps cleanly to wheel speeds.
A **bipedal humanoid** adds hard constraints Nav2 alone doesn't solve:

1. **Footstep planning.** A biped can't follow an arbitrary smooth curve — it must place discrete,
   stable footsteps. A footstep planner sits *below* Nav2, converting the desired body path into a
   sequence of stable foot placements.
2. **Balance during motion.** Every step shifts the center of mass; a whole-body controller keeps the
   **Zero Moment Point** inside the support polygon so the robot doesn't tip.
3. **Non-holonomic-ish gait limits.** Humans can't side-step or spin arbitrarily fast; the controller's
   velocity limits must respect the gait.

The clean architecture: **Nav2 plans the *body path*; a footstep planner + balance controller turn that
path into stable walking.** Nav2's `/cmd_vel` becomes the *desired* body velocity that the locomotion
layer realizes one step at a time.

## Tuning that actually matters

| Parameter | Effect |
|-----------|--------|
| `robot_radius` / footprint | Too small → clips corners; too large → can't fit through doors |
| `inflation_radius` | How far obstacles "push" the path away |
| `controller_frequency` | Higher → smoother dodging, more CPU |
| `xy_goal_tolerance` | How close counts as "arrived" |

:::tip Visualize in RViz before trusting it
Always watch the global path, local costmap, and footprint in RViz. Most "the robot drives into the wall"
bugs are a costmap not seeing an obstacle — usually a sensor `frame_id` or TF problem traced straight back
to Module 1.
:::

The robot can now perceive, localize, and navigate on its own. The final step is to let a person simply
*talk* to it: [Module 4 — Vision-Language-Action (VLA) →](/module-4-vla/overview).
