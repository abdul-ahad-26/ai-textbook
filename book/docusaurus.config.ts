import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// ---------------------------------------------------------------------------
// Deployment / integration configuration (env-driven so dev vs prod is a
// config change, not a code change).
//
//  - DEPLOY_URL / BASE_URL        : GitHub Pages location of the book
//  - GH_ORG / GH_REPO             : used by `docusaurus deploy` + edit links
//  - BACKEND_URL                  : FastAPI backend (ChatKit + personalize + translate)
//  - CHATKIT_DOMAIN_KEY           : 'local-dev' locally; real domain key in prod
//  - AUTH_URL                     : Better-Auth Node server base URL
// ---------------------------------------------------------------------------
const GH_ORG = process.env.GH_ORG || 'your-github-username';
const GH_REPO = process.env.GH_REPO || 'ai-textbook';
const DEPLOY_URL = process.env.DEPLOY_URL || `https://${GH_ORG}.github.io`;
const BASE_URL = process.env.BASE_URL || `/${GH_REPO}/`;

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const CHATKIT_DOMAIN_KEY = process.env.CHATKIT_DOMAIN_KEY || 'local-dev';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3001';

const config: Config = {
  title: 'Physical AI & Humanoid Robotics',
  tagline: 'An AI-Native Textbook — Embodied Intelligence with ROS 2, Gazebo, NVIDIA Isaac & VLA',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: DEPLOY_URL,
  baseUrl: BASE_URL,

  organizationName: GH_ORG,
  projectName: GH_REPO,
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  // Don't fail the build on a stray relative link while authoring.
  onBrokenLinks: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Exposed to the browser via useDocusaurusContext().siteConfig.customFields
  customFields: {
    backendUrl: BACKEND_URL,
    chatkitDomainKey: CHATKIT_DOMAIN_KEY,
    authUrl: AUTH_URL,
  },

  // Load the OpenAI ChatKit web component from the official CDN.
  scripts: [
    {
      src: 'https://cdn.platform.openai.com/deployments/chatkit/chatkit.js',
      async: true,
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // serve the book at the site root
          editUrl: `https://github.com/${GH_ORG}/${GH_REPO}/tree/main/book/`,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Physical AI',
      logo: {
        alt: 'Physical AI & Humanoid Robotics',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'bookSidebar',
          position: 'left',
          label: 'Textbook',
        },
        {
          href: `https://github.com/${GH_ORG}/${GH_REPO}`,
          label: 'GitHub',
          position: 'right',
        },
        {
          type: 'custom-authNavbarItem',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Textbook',
          items: [
            {label: 'Introduction', to: '/intro'},
            {label: 'Module 1 — ROS 2', to: '/module-1-ros2/overview'},
            {label: 'Module 4 — VLA', to: '/module-4-vla/overview'},
          ],
        },
        {
          title: 'Built with',
          items: [
            {label: 'OpenAI Agents & ChatKit', href: 'https://openai.github.io/chatkit-js/'},
            {label: 'Qdrant', href: 'https://qdrant.tech/'},
            {label: 'Neon Postgres', href: 'https://neon.tech/'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Panaversity', href: 'https://panaversity.org'},
            {label: 'AI-Native Book', href: 'https://ai-native.panaversity.org'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Physical AI & Humanoid Robotics. An AI-Native Textbook.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'python', 'yaml', 'json', 'cpp'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;