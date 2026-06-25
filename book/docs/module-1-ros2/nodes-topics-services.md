---
id: nodes-topics-services
title: "Nodes, Topics, Services & Actions"
sidebar_label: Nodes, Topics & Services
description: The four core ROS 2 communication patterns and when to use each.
keywords: [ros2, node, topic, publisher, subscriber, service, action, qos]
---

# Nodes, Topics, Services & Actions

ROS 2 gives you four communication primitives. Choosing the right one is most of the skill.

## Nodes

A **node** is a single-purpose process. One node reads the camera; another estimates balance; another
drives the legs. A node is created in Python by subclassing `rclpy.node.Node`:

```python
import rclpy
from rclpy.node import Node

class HeartbeatNode(Node):
    def __init__(self):
        super().__init__('heartbeat')
        self.get_logger().info('Heartbeat node is alive')

def main():
    rclpy.init()
    node = HeartbeatNode()
    rclpy.spin(node)        # process callbacks until Ctrl-C
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

Nodes discover one another automatically over DDS — there is **no central master** as in ROS 1.

## Topics — streaming, many-to-many, fire-and-forget

A **topic** is a named bus carrying a stream of messages of one type. Publishers write; subscribers
read; neither knows how many of the other exist. Use topics for continuous data: sensor readings,
velocity commands, joint states.

```python
from geometry_msgs.msg import Twist

class Driver(Node):
    def __init__(self):
        super().__init__('driver')
        self.pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.create_timer(0.1, self.tick)        # 10 Hz

    def tick(self):
        msg = Twist()
        msg.linear.x = 0.2      # drive forward 0.2 m/s
        msg.angular.z = 0.0
        self.pub.publish(msg)
```

A subscriber to the same topic:

```python
class Odom(Node):
    def __init__(self):
        super().__init__('odom_printer')
        self.create_subscription(Twist, '/cmd_vel', self.on_cmd, 10)

    def on_cmd(self, msg: Twist):
        self.get_logger().info(f'commanded v={msg.linear.x} m/s')
```

### Quality of Service (QoS)

Because ROS 2 runs on DDS, every topic has a **QoS profile**. The two policies you will tune most:

- **Reliability:** `RELIABLE` (retransmit until delivered, e.g. commands) vs. `BEST_EFFORT` (drop if late, e.g. high-rate camera frames).
- **Durability:** `TRANSIENT_LOCAL` lets late-joining subscribers receive the last message (useful for a map or a robot description that's published once).

A subscriber's QoS must be **compatible** with the publisher's or no messages flow — the #1 cause of "my topic is silent."

## Services — request/response, one-to-one

A **service** is a synchronous call: send a request, block for a response. Use it for quick queries or
commands with a result: "reset odometry", "is the gripper open?".

```python
from example_interfaces.srv import AddTwoInts

class Adder(Node):
    def __init__(self):
        super().__init__('adder')
        self.create_service(AddTwoInts, 'add', self.handle)

    def handle(self, request, response):
        response.sum = request.a + request.b
        return response
```

Services should return **quickly**. Don't use a service to "walk to the kitchen" — that takes minutes
and can fail halfway. That is what actions are for.

## Actions — long-running goals with feedback

An **action** is the right tool for goals that take time, stream progress, and can be canceled:
navigate to a pose, follow a trajectory, pick up an object. An action bundles three things: a **goal**,
periodic **feedback**, and a final **result**.

```python
from rclpy.action import ActionClient
from nav2_msgs.action import NavigateToPose

class Commander(Node):
    def __init__(self):
        super().__init__('commander')
        self.client = ActionClient(self, NavigateToPose, 'navigate_to_pose')

    def go(self, goal_pose):
        self.client.wait_for_server()
        goal = NavigateToPose.Goal()
        goal.pose = goal_pose
        # feedback streams progress; the future resolves when done
        return self.client.send_goal_async(goal, feedback_callback=self.on_feedback)

    def on_feedback(self, fb):
        self.get_logger().info(f'distance remaining: {fb.feedback.distance_remaining:.2f} m')
```

## Choosing the right primitive

| You need to… | Use |
|--------------|-----|
| Stream sensor data or velocity commands | **Topic** |
| Ask a quick question / trigger an instant action | **Service** |
| Command a goal that takes time and may be canceled | **Action** |
| Share a value many nodes read at startup | **Parameter** |

:::tip Inspect everything from the CLI
`ros2 topic list`, `ros2 topic echo /cmd_vel`, `ros2 service list`, `ros2 action list`, and
`ros2 node info /driver` are your debugging lifeline. If two nodes won't talk, check the topic name
**and** the QoS first.
:::

Next: [Bridging Python AI Agents to ROS with `rclpy` →](./rclpy-agents).
