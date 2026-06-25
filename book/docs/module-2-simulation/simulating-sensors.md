---
id: simulating-sensors
title: "Simulating Sensors — LiDAR, Depth Cameras & IMUs"
sidebar_label: Simulating Sensors
description: How LiDAR, depth cameras, and IMUs are modeled in simulation and published as ROS 2 topics.
keywords: [lidar, depth camera, imu, sensors, pointcloud, noise]
---

# Simulating Sensors — LiDAR, Depth Cameras & IMUs

A robot is only as smart as its perception, and perception starts with sensors. The course's edge kit
pairs a RealSense depth camera, an IMU, and (optionally) a LiDAR — so the simulation must reproduce all
three faithfully, including their **imperfections**.

## LiDAR — measuring distance with light

A LiDAR sweeps laser beams and times their reflections to produce a ring (2D) or cloud (3D) of distance
measurements. In simulation it is modeled by **ray casting**: the engine shoots rays into the scene and
returns the distance to the first surface each ray hits.

```xml
<!-- A 2D lidar sensor attached to a link in SDF/Gazebo -->
<sensor name="lidar" type="gpu_lidar">
  <update_rate>10</update_rate>
  <ray>
    <scan><horizontal>
      <samples>360</samples><min_angle>-3.14159</min_angle><max_angle>3.14159</max_angle>
    </horizontal></scan>
    <range><min>0.1</min><max>12.0</max></range>
    <noise><type>gaussian</type><stddev>0.01</stddev></noise>  <!-- realistic noise -->
  </ray>
</sensor>
```

This publishes `sensor_msgs/LaserScan` (2D) or `sensor_msgs/PointCloud2` (3D) — the input to the **VSLAM**
and navigation stacks in Module 3.

## Depth cameras — RGB + distance per pixel

A depth camera (like the **Intel RealSense D435i** in the course kit) returns, for every pixel, both
color and distance. It publishes three coordinated streams:

- `/camera/color/image_raw` — the RGB image
- `/camera/depth/image_rect_raw` — per-pixel depth
- `/camera/depth/points` — a registered 3D `PointCloud2`

Depth cameras are the workhorse of indoor robotics: close range, dense, and cheap. Their weaknesses —
which good simulation reproduces — are noise at edges, holes on shiny or transparent surfaces, and a
limited range.

## IMUs — sensing motion and gravity

An **Inertial Measurement Unit** combines a gyroscope (angular velocity) and an accelerometer (linear
acceleration, including gravity). It is the robot's **inner ear** — essential for a humanoid to know
which way is up and to stay balanced. It publishes `sensor_msgs/Imu` at high rate (100–1000 Hz).

```python
from sensor_msgs.msg import Imu

def on_imu(self, msg: Imu):
    # orientation (quaternion), angular_velocity, linear_acceleration
    az = msg.linear_acceleration.z   # ~ +9.81 when upright and still
    if az < 4.0:
        self.get_logger().warn('Possible fall detected!')
```

## The most important detail: noise

A simulated sensor that returns perfect data trains a model that fails in reality. **Realistic sensors
are noisy**, and good simulation injects that noise deliberately:

| Sensor | Real-world imperfection to simulate |
|--------|-------------------------------------|
| LiDAR | Gaussian range noise; missing returns on dark/specular surfaces |
| Depth camera | Edge noise, holes on glass/metal, quantization with distance |
| IMU | Bias drift, Gaussian noise, scale error |

Modeling these — and randomizing them (**domain randomization**) — is what lets a model trained in
simulation survive contact with the real world. Sensor fusion (combining IMU + LiDAR + camera, e.g. with
an Extended Kalman Filter) then turns several noisy estimates into one reliable state estimate.

:::tip Sensor frames matter
Every sensor message carries a `frame_id`. It must match a TF frame from your URDF (Module 1) so the rest
of the system knows *where on the robot* the data came from. A depth point cloud in the wrong frame will
place obstacles in the wrong place — and the robot will plan right into them.
:::

With a physics-accurate, sensor-rich digital twin in hand, you are ready to put a real AI brain on top:
[Module 3 — The AI-Robot Brain (NVIDIA Isaac) →](/module-3-isaac/overview).
