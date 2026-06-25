import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import KinematicFigure from '@site/src/components/KinematicFigure';

import styles from './index.module.css';

const MODULES = [
  {
    n: '01',
    side: 'digital',
    title: 'The Robotic Nervous System',
    sub: 'ROS 2',
    desc: 'Nodes, topics, services & actions — the middleware that carries messages from sensors to motors.',
    to: '/module-1-ros2/overview',
  },
  {
    n: '02',
    side: 'physical',
    title: 'The Digital Twin',
    sub: 'Gazebo & Unity',
    desc: 'Physics, gravity, collisions and simulated sensors — prove the robot in simulation before hardware.',
    to: '/module-2-simulation/overview',
  },
  {
    n: '03',
    side: 'digital',
    title: 'The AI-Robot Brain',
    sub: 'NVIDIA Isaac',
    desc: 'Photorealistic sim, synthetic data, hardware-accelerated VSLAM and Nav2 path planning.',
    to: '/module-3-isaac/overview',
  },
  {
    n: '04',
    side: 'physical',
    title: 'Vision-Language-Action',
    sub: 'VLA + Capstone',
    desc: 'Whisper voice commands and LLM planning, ending in an autonomous humanoid that hears, sees & acts.',
    to: '/module-4-vla/overview',
  },
];

const AI_NATIVE = [
  {
    accent: 'digital',
    label: 'ASK THE BOOK',
    title: 'A RAG agent that knows the text',
    desc: 'Highlight any passage and the assistant answers from this book’s actual content — grounded, with sources.',
  },
  {
    accent: 'physical',
    label: 'PERSONALIZE',
    title: 'Tuned to your background',
    desc: 'Tell us your software & hardware experience at sign-up; rewrite any chapter for your exact level with one click.',
  },
  {
    accent: 'digital',
    label: 'TRANSLATE',
    title: 'Read any chapter in Urdu',
    desc: 'اردو میں پڑھیں — one button translates the chapter you’re reading into Urdu.',
  },
];

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>
            <span className={styles.dot} /> PHYSICAL AI &middot; EMBODIED INTELLIGENCE
          </p>
          <Heading as="h1" className={styles.heroTitle}>
            Bridging the <span className={styles.digital}>digital brain</span> and the{' '}
            <span className={styles.physical}>physical body</span>.
          </Heading>
          <p className={styles.heroSub}>{siteConfig.tagline}</p>
          <div className={styles.heroActions}>
            <Link className={styles.btnPrimary} to="/intro">
              Start the course &rarr;
            </Link>
            <Link className={styles.btnGhost} to="/module-4-vla/capstone-autonomous-humanoid">
              Jump to the capstone
            </Link>
          </div>
          <dl className={styles.heroStats}>
            <div>
              <dt>4</dt>
              <dd>Modules</dd>
            </div>
            <div>
              <dt>ROS 2 &middot; Isaac</dt>
              <dd>Industry stack</dd>
            </div>
            <div>
              <dt>AI-native</dt>
              <dd>Ask &middot; Personalize &middot; Translate</dd>
            </div>
          </dl>
        </div>
        <div className={styles.heroFigure}>
          <KinematicFigure />
          <div className={styles.figureLegend}>
            <span><i className={styles.swatchDigital} /> sim &middot; sensing</span>
            <span><i className={styles.swatchPhysical} /> real &middot; actuation</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Modules() {
  return (
    <section className={styles.section}>
      <p className="pai-eyebrow">SYSTEM ARCHITECTURE &mdash; DIGITAL BRAIN TO PHYSICAL BODY</p>
      <h2 className={styles.sectionTitle}>The course, end to end</h2>
      <div className={styles.moduleList}>
        {MODULES.map((m) => (
          <Link key={m.n} to={m.to} className={`${styles.moduleRow} ${styles[m.side]}`}>
            <span className={styles.moduleNum}>{m.n}</span>
            <span className={styles.moduleBody}>
              <span className={styles.moduleHead}>
                <strong>{m.title}</strong>
                <em>{m.sub}</em>
              </span>
              <span className={styles.moduleDesc}>{m.desc}</span>
            </span>
            <span className={styles.moduleArrow}>&rarr;</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AiNative() {
  return (
    <section className={`${styles.section} ${styles.aiNative}`}>
      <p className="pai-eyebrow">NOT A STATIC PDF</p>
      <h2 className={styles.sectionTitle}>An AI-native textbook</h2>
      <div className={styles.cards}>
        {AI_NATIVE.map((c) => (
          <div key={c.label} className={`${styles.card} ${styles[c.accent]}`}>
            <span className={styles.cardLabel}>{c.label}</span>
            <h3 className={styles.cardTitle}>{c.title}</h3>
            <p className={styles.cardDesc}>{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="An AI-Native Textbook"
      description="Physical AI & Humanoid Robotics — learn embodied intelligence with ROS 2, Gazebo, NVIDIA Isaac and Vision-Language-Action models, with a built-in RAG assistant.">
      <Hero />
      <main>
        <Modules />
        <AiNative />
      </main>
    </Layout>
  );
}
