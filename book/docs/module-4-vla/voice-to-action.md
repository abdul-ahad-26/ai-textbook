---
id: voice-to-action
title: "Voice-to-Action with OpenAI Whisper"
sidebar_label: Voice-to-Action
description: Turn spoken commands into text for the robot agent using OpenAI Whisper.
keywords: [whisper, speech to text, voice, asr, respeaker, voice command]
---

# Voice-to-Action with OpenAI Whisper

The most natural interface to a humanoid is speech. Before the robot can reason about *"bring me the red
cup,"* it must first reliably turn the sound of your voice into text. That is **Automatic Speech
Recognition (ASR)**, and **OpenAI Whisper** is the model the course uses for it.

## The voice pipeline

```
🎤 ReSpeaker mic array ─► [ VAD ] ─► [ Whisper ASR ] ─► text ─► [ LLM planner ] ─► ROS 2 actions
   (far-field audio)      detect      transcribe                 (next section)
                          speech
```

The course kit's **ReSpeaker USB mic array** is a *far-field* microphone: it uses multiple capsules and
beamforming to pick out a voice across a room, which is what a real humanoid needs.

## Transcribing with Whisper

Whisper is robust to accents, background noise, and even multiple languages. You can run it locally
(the open-source model on the Jetson/workstation) or via the OpenAI API:

```python
from openai import OpenAI

client = OpenAI()

with open("command.wav", "rb") as audio:
    result = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio,
        language="en",          # omit to auto-detect; Whisper is multilingual
    )
print(result.text)             # -> "bring me the red cup from the kitchen table"
```

For a responsive robot you stream audio in short windows rather than recording a whole file.

## Wrapping ASR in a ROS 2 node

The transcribed text becomes a message on a topic the planner subscribes to — keeping voice decoupled
from cognition, exactly like every other capability in this book:

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class VoiceCommandNode(Node):
    def __init__(self):
        super().__init__('voice_command')
        self.pub = self.create_publisher(String, '/voice/command', 10)
        # a timer reads the mic, runs VAD, and calls Whisper when speech ends

    def on_utterance_transcribed(self, text: str):
        self.get_logger().info(f'heard: "{text}"')
        self.pub.publish(String(data=text))   # hand off to the LLM planner
```

## Voice Activity Detection (VAD): don't transcribe silence

Running Whisper continuously is wasteful and produces garbage from background noise. A lightweight
**Voice Activity Detection** step gates the pipeline: only when speech is detected do you buffer audio and,
when the speaker pauses, send that segment to Whisper. This both saves compute and sharply improves
transcription quality.

## Closing the loop with speech *output*

Interaction is two-way. The same pipeline runs in reverse for the robot to *speak* — a **Text-to-Speech
(TTS)** model turns the agent's response into audio through the kit's speaker, so the robot can confirm
*"Okay, getting the red cup"* before it moves. Confirmation before action is also a **safety** feature: it
gives a human the chance to intervene if the robot misheard.

:::warning Mishearing is a safety event
"Bring the cup" vs. "bring the **cat**" matters when a robot is involved. Confirm intent (by voice or a
visible action) before executing anything physical, and keep the reflex/e-stop layer from Module 1 always
active.
:::

Now that the robot can *hear*, it needs to *think*. Next:
[Cognitive Planning — From Language to ROS 2 Actions →](./cognitive-planning).
