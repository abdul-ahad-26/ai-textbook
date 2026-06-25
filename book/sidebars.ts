import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * The textbook table of contents.
 * Mirrors the course: Intro → 4 Modules → Capstone.
 */
const sidebars: SidebarsConfig = {
  bookSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Module 1 · The Robotic Nervous System (ROS 2)',
      link: {type: 'doc', id: 'module-1-ros2/overview'},
      items: [
        'module-1-ros2/nodes-topics-services',
        'module-1-ros2/rclpy-agents',
        'module-1-ros2/urdf-humanoids',
      ],
    },
    {
      type: 'category',
      label: 'Module 2 · The Digital Twin (Gazebo & Unity)',
      link: {type: 'doc', id: 'module-2-simulation/overview'},
      items: [
        'module-2-simulation/gazebo-physics',
        'module-2-simulation/unity-hri',
        'module-2-simulation/simulating-sensors',
      ],
    },
    {
      type: 'category',
      label: 'Module 3 · The AI-Robot Brain (NVIDIA Isaac)',
      link: {type: 'doc', id: 'module-3-isaac/overview'},
      items: [
        'module-3-isaac/isaac-sim',
        'module-3-isaac/isaac-ros-vslam',
        'module-3-isaac/nav2-bipedal',
      ],
    },
    {
      type: 'category',
      label: 'Module 4 · Vision-Language-Action (VLA)',
      link: {type: 'doc', id: 'module-4-vla/overview'},
      items: [
        'module-4-vla/voice-to-action',
        'module-4-vla/cognitive-planning',
        'module-4-vla/capstone-autonomous-humanoid',
      ],
    },
  ],
};

export default sidebars;
