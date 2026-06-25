---
id: capstone-autonomous-humanoid
title: "Capstone — The Autonomous Humanoid"
sidebar_label: Capstone Project
description: Integrate voice, planning, perception, navigation, and manipulation into one autonomous humanoid behavior.
keywords: [capstone, autonomous humanoid, integration, project, vla, demo]
---

# Capstone — The Autonomous Humanoid

> **The Project:** A simulated robot receives a voice command, plans a path, navigates obstacles,
> identifies an object using computer vision, and manipulates it.

This is the synthesis of the entire course. Every module contributes one capability, and the capstone
wires them into a single autonomous behavior. If you can build this, you have built a Physical AI system.

## The end-to-end behavior

```
🗣 "Bring me the red cup from the kitchen table"
        │
        ▼
[ Whisper ASR ]  ── Module 4 ──►  text
        │
        ▼
[ LLM cognitive planner ]  ── Module 4 ──►  grounded plan (navigate → detect → pick → return → place)
        │
        ▼
[ Nav2 + footstep planner ]  ── Module 3 ──►  walk to the kitchen, avoiding obstacles
        │
        ▼
[ Isaac-trained perception ]  ── Module 3 ──►  locate the red cup in the camera frame
        │
        ▼
[ Manipulation controller ]  ── Module 1 + 2 ──►  grasp the cup
        │
        ▼
[ Nav2 return + place + TTS ]  ──►  "Here is your red cup." 🤖
```

Every arrow is a ROS 2 topic or action. Every box is something you built in an earlier module. The
**digital twin** (Module 2) lets you run the whole thing safely in Gazebo/Isaac Sim before any hardware.

## Reference architecture

```
                         ┌──────────────────────────────────────────┐
   voice ─► [Whisper] ─► │            Cognitive Agent (LLM)          │
                         │   tools: navigate_to, detect, pick, place │
                         └───────────────┬──────────────────────────┘
                                         │ ROS 2 actions/topics
        ┌────────────────────────────────┼─────────────────────────────────┐
        ▼                                ▼                                  ▼
 [ Nav2 + footsteps ]          [ Perception (Isaac) ]            [ Manipulation ]
        │                                │                                  │
        └──────── /tf, /cmd_vel ─────────┴──── /detections ───────┬─────────┘
                                                                  ▼
                                                    [ Safety / reflex layer ]  ◄─ always-on e-stop
                                                                  │
                                          [ Gazebo / Isaac Sim digital twin ]  ◄─ runs the whole demo
```

## Milestones (build it incrementally)

1. **Navigation only.** Type a goal pose; the simulated humanoid walks there with Nav2. *(Modules 1 & 3)*
2. **Add perception.** Place a red cup in the scene; the robot detects and reports its location. *(Module 3)*
3. **Add manipulation.** The robot navigates to the cup and grasps it. *(Modules 1 & 2)*
4. **Add language.** Replace the typed goal with an LLM that turns *"go to the table"* into the Nav2 goal. *(Module 4)*
5. **Add voice.** Replace typed text with Whisper. Speak the command. *(Module 4)*
6. **Close the loop.** Full re-planning when a grasp fails or the path is blocked; spoken confirmation. *(Module 4)*

Ship each milestone working before adding the next. A robot that reliably does step 1 beats one that
half-does step 6.

## Assessment criteria

| Criterion | What we look for |
|-----------|------------------|
| **Integration** | All five capabilities working together, not in isolation |
| **Grounding** | The robot re-plans from real perception, not a fixed script |
| **Robustness** | Recovers from a blocked path or a failed grasp |
| **Safety** | An always-on reflex layer can interrupt the agent |
| **Interaction** | Natural voice in, spoken confirmation out |

## Where to go next

You have bridged the digital brain and the physical body. From here:

- **Sim-to-real:** deploy the trained policies and perception models to the **Jetson Orin** edge kit and a
  real robot (Unitree Go2/G1), following the *train-in-cloud, infer-on-edge* pattern from Module 3.
- **Better manipulation:** explore learned grasping and full VLA models (e.g. open-source policies) that
  output actions directly from pixels and language.
- **Richer interaction:** multi-turn dialogue, gesture, and gaze — the full HRI agenda from Module 2.

Congratulations — you've completed **Physical AI & Humanoid Robotics**. Ask the assistant anything about
the material, and personalize or translate any chapter as you review.
