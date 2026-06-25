---
id: overview
title: "Module 4 — Vision-Language-Action (VLA)"
sidebar_label: Overview
description: The convergence of LLMs and robotics — voice commands, cognitive planning, and the autonomous humanoid capstone.
keywords: [vla, vision language action, llm, whisper, robotics, capstone]
---

# Module 4 — Vision-Language-Action (VLA)

> **Focus:** The convergence of LLMs and robotics.

This is where everything comes together. The robot has a nervous system (ROS 2), a body and world
(simulation), and a perception-and-navigation brain (Isaac). Module 4 adds the **mind** — the ability to
understand a spoken human request, reason about how to fulfill it, and act in the physical world.

## What "Vision-Language-Action" means

A **VLA** model is one that takes in **vision** (what the robot sees) and **language** (what the human
said) and produces **action** (what the robot does). It is the embodied descendant of the LLM: instead of
predicting the next word, it predicts the next *action* in the world.

```
   👁  Vision  (camera, depth, detections) ┐
                                            ├──► [  VLA reasoning  ] ──► 🤖 Action (ROS 2 goals)
   🗣  Language (transcribed voice command) ┘
```

## What you will learn

- **Voice-to-Action:** using **OpenAI Whisper** to turn spoken commands into text the agent can reason about.
- **Cognitive Planning:** using **LLMs** to translate natural language — *"Clean the room"* — into a
  sequence of grounded **ROS 2 actions**.
- **Capstone Project — The Autonomous Humanoid:** a final project where a simulated robot receives a voice
  command, plans a path, navigates obstacles, identifies an object with computer vision, and manipulates it.

## The grounding problem

The central challenge of VLA is **grounding**: connecting abstract language to concrete robot
capabilities. An LLM knows what "clean the room" *means* in the abstract, but the robot can only execute
a finite set of skills — `navigate_to(pose)`, `detect(object)`, `pick(object)`, `place(location)`. The
agent's job is to **decompose** the request into those primitives, in the right order, while respecting
the physical state of the world.

This is exactly the agent-bridge pattern from [Module 1](/module-1-ros2/rclpy-agents) scaled up: the LLM
is the planner; ROS 2 actions are the skills; perception keeps the plan grounded in reality.

## Why this is the frontier

For decades robots were programmed task-by-task in code. VLA flips that: you *tell* the robot what you
want in plain language, and it figures out the steps — generalizing to requests it was never explicitly
programmed for. Combined with the embodiment from the previous modules, this is the essence of **Physical
AI**: intelligence that perceives, reasons, and acts in the physical world.

## How the module flows

1. **Voice-to-Action** — get the human's intent into the system reliably (Whisper).
2. **Cognitive Planning** — turn intent into a grounded, executable plan (LLM + tools).
3. **Capstone** — integrate perception, navigation, manipulation, and language into one autonomous
   humanoid behavior.

Start with [Voice-to-Action with OpenAI Whisper →](./voice-to-action).
