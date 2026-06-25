---
id: unity-hri
title: "High-Fidelity Rendering & HRI in Unity"
sidebar_label: Unity & HRI
description: Use Unity for photorealistic rendering and human-robot interaction with the ROS-TCP-Connector.
keywords: [unity, rendering, hri, ros-tcp-connector, perception, synthetic data]
---

# High-Fidelity Rendering & Human-Robot Interaction in Unity

Gazebo gets the physics right but its rendering is functional, not beautiful. For **perception** — the
camera images a vision model will learn from — and for **human-robot interaction (HRI)**, we want
photorealism, rich materials, animated people, and complex indoor scenes. That is Unity's strength.

## Why a second simulator for perception

A vision model trained on Gazebo's flat-shaded boxes will fail on real camera images. The closer the
training imagery is to reality — accurate lighting, shadows, reflections, textures, motion blur — the
smaller the **domain gap**. Unity's PhysX + High Definition Render Pipeline produces images close enough
to real cameras that models trained on them transfer far better.

## Connecting Unity to ROS 2

Unity talks to ROS 2 through the **Unity Robotics Hub**, specifically the **ROS-TCP-Connector** package
and a companion **ROS-TCP-Endpoint** node running on the ROS side.

```
[ Unity scene ]  ⇄  ROS-TCP-Connector  ⇄  (TCP)  ⇄  ROS-TCP-Endpoint  ⇄  [ ROS 2 graph ]
```

A C# script in Unity publishes and subscribes just like a ROS node:

```csharp
using Unity.Robotics.ROSTCPConnector;
using RosImage = RosMessageTypes.Sensor.ImageMsg;

public class CameraPublisher : MonoBehaviour
{
    ROSConnection ros;
    public string topicName = "/unity_camera/image_raw";

    void Start()
    {
        ros = ROSConnection.GetOrCreateInstance();
        ros.RegisterPublisher<RosImage>(topicName);
    }

    void PublishFrame(byte[] rgb, uint width, uint height)
    {
        var msg = new RosImage { width = width, height = height, encoding = "rgb8", data = rgb };
        ros.Publish(topicName, msg);   // a ROS 2 perception node now receives Unity's camera
    }
}
```

Now a perception node cannot tell whether `/camera/image_raw` came from Gazebo, Unity, or a real
RealSense — the twin principle again.

## Human-Robot Interaction (HRI)

HRI is the study of how robots and people share space and communicate. Unity lets you put **animated
humans** in the scene to test the behaviors Module 4 needs:

- **Social navigation:** does the robot keep a comfortable distance and yield in a hallway?
- **Legible motion:** can a person predict where the robot is going from how it moves?
- **Multi-modal interaction:** combining speech, gesture, and gaze — the inputs your VLA agent will fuse.

Because Unity also drives VR headsets, you can step *into* the scene and interact with the robot in first
person — invaluable for designing the "natural human interaction" this course is ultimately about.

## Synthetic data generation

The deepest reason to use Unity is **synthetic data**. You can render thousands of labeled images —
automatically annotated with bounding boxes, segmentation masks, and depth — by scripting the scene:
randomize object positions, lighting, and textures (**domain randomization**) so the perception model
learns to ignore irrelevant variation.

:::info A preview of Module 3
NVIDIA Isaac Sim pushes this even further with Omniverse's ray-traced **photorealism** and built-in
synthetic-data tooling. Unity and Isaac are complementary: Unity is approachable and game-engine-native;
Isaac is purpose-built for robotics AI at scale.
:::

Next: [Simulating Sensors — LiDAR, Depth Cameras & IMUs →](./simulating-sensors).
