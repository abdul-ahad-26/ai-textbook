---
id: cognitive-planning
title: "Cognitive Planning — From Language to ROS 2 Actions"
sidebar_label: Cognitive Planning
description: Use an LLM to translate natural language into a grounded sequence of ROS 2 actions.
keywords: [llm planning, task planning, tool use, function calling, grounding, agent]
---

# Cognitive Planning — From Language to ROS 2 Actions

The robot has heard *"clean the room."* Now it must **plan**: break that vague human goal into a concrete,
ordered sequence of skills it can actually execute, and adapt when reality doesn't match the plan. This is
**cognitive planning** — the LLM acting as the robot's reasoning layer.

## Skills as tools

The bridge between language and action is **tool use** (function calling). You expose the robot's ROS 2
capabilities to the LLM as a typed set of tools, and the model chooses which to call, with what arguments:

```python
TOOLS = [
    {"name": "navigate_to",  "args": {"location": "str"}},   # wraps Nav2 goToPose
    {"name": "detect_object","args": {"label": "str"}},      # wraps the perception model
    {"name": "pick",         "args": {"object_id": "str"}},  # wraps the manipulation action
    {"name": "place",        "args": {"location": "str"}},
    {"name": "say",          "args": {"text": "str"}},       # TTS confirmation
]
```

Each tool is a thin wrapper over a ROS 2 **action** from the earlier modules. `navigate_to` is the
`goToPose` from Nav2; `detect_object` queries the Isaac-trained perception model; `pick`/`place` call the
manipulation controllers.

## From command to plan

Given the tools and the command, the LLM produces a plan. *"Clean the room"* might decompose to:

```json
[
  {"tool": "detect_object", "args": {"label": "trash"}},
  {"tool": "navigate_to",   "args": {"location": "detected:trash#1"}},
  {"tool": "pick",          "args": {"object_id": "trash#1"}},
  {"tool": "navigate_to",   "args": {"location": "trash_bin"}},
  {"tool": "place",         "args": {"location": "trash_bin"}},
  {"tool": "say",           "args": {"text": "Room is tidy."}}
]
```

## Grounding: plans must respect reality

A plan generated in the abstract will fail the moment it meets the physical world — the cup isn't where
the model assumed, navigation gets blocked, a grasp slips. **Grounded** planning closes the loop:
*perceive → plan → act → observe the result → re-plan*. The agent executes one step, checks the world
state, and decides the next step from what actually happened — never blindly running a fixed script.

```python
def run_command(agent, command: str, world):
    plan = agent.plan(command, tools=TOOLS, world_state=world.snapshot())
    for step in plan:
        result = world.execute(step)             # calls the ROS 2 action, waits for result
        if not result.ok:
            # Reality diverged — re-plan from the new state instead of failing
            plan = agent.replan(command, world.snapshot(), failure=result)
```

This **ReAct-style** loop (reason + act, interleaved) is the workhorse pattern of embodied agents: every
action's real outcome feeds the next decision.

## Safety: the LLM proposes, the system disposes

The LLM is a planner, not a final authority. Three guardrails are mandatory:

1. **Validate tool calls** against a strict schema before execution — reject malformed or out-of-range arguments.
2. **A reflex/safety layer** (Module 1) can veto or interrupt any action — e-stop on collision, refuse to move with a person too close.
3. **Confirm high-stakes actions** by voice before executing, giving a human a chance to intervene.

The LLM *proposes*; the deterministic safety system *disposes*.

## This is the same agent you already built

Notice the symmetry with the **RAG chat assistant in this very book**: a model reasons over a request,
calls tools to gather grounded information (here: retrieve book passages; there: detect objects and
navigate), and produces an answer or action. The OpenAI Agents SDK pattern — an agent with tools, run in a
loop — is identical. The only difference is that the robot's "tools" move motors instead of querying a
vector database.

:::tip Keep the skill set small and reliable
A planner is only as good as its skills. Ten rock-solid primitives the LLM can compose beat fifty flaky
ones. Make each tool idempotent where possible, return clear success/failure, and let the LLM handle
sequencing.
:::

Time to integrate it all into one robot. Next:
[Capstone — The Autonomous Humanoid →](./capstone-autonomous-humanoid).
