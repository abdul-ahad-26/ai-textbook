import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {useThemeConfig} from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type {Footer as FooterType} from '@docusaurus/theme-common';
import styles from './styles.module.css';

type LinkItem = {label: string; to?: string; href?: string};

function FooterLink({item}: {item: LinkItem}) {
  const toUrl = useBaseUrl(item.to ?? '');
  const href = item.href ?? toUrl;
  const external = Boolean(item.href);
  return (
    <Link
      className={styles.link}
      href={external ? href : undefined}
      to={external ? undefined : href}
      {...(external ? {target: '_blank', rel: 'noopener noreferrer'} : {})}>
      {item.label}
    </Link>
  );
}

/**
 * Custom footer — the "control room" sign-off for the book.
 * A cyan→amber seam (the sim⇄real motif) caps a brand block + link columns,
 * closing with a monospace telemetry status line.
 */
export default function Footer(): ReactNode {
  const {footer} = useThemeConfig();
  const {siteConfig} = useDocusaurusContext();
  const logoUrl = useBaseUrl('/img/logo.svg');

  if (!footer) return null;
  const {links = [], copyright} = footer as FooterType & {
    links: {title?: string; items: LinkItem[]}[];
  };
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      {/* the seam: digital → physical */}
      <div className={styles.seam} aria-hidden="true" />

      <div className={styles.inner}>
        {/* Brand block */}
        <div className={styles.brand}>
          <div className={styles.brandTop}>
            <img src={logoUrl} alt="" className={styles.logo} width={34} height={34} />
            <span className={styles.brandName}>Physical AI</span>
          </div>
          <p className={styles.brandTagline}>{siteConfig.tagline}</p>
          <div className={styles.legend}>
            <span><i className={styles.swatchD} /> sim · sensing</span>
            <span><i className={styles.swatchP} /> real · actuation</span>
          </div>
        </div>

        {/* Link columns */}
        <div className={styles.columns}>
          {links.map((col, i) => (
            <nav key={i} className={styles.column} aria-label={col.title}>
              {col.title && <div className={styles.colTitle}>{col.title}</div>}
              {col.items.map((item, j) => (
                <FooterLink key={j} item={item} />
              ))}
            </nav>
          ))}
        </div>
      </div>

      {/* Telemetry sign-off bar */}
      <div className={styles.bottom}>
        <span className={styles.status}>
          <i className={styles.pulse} aria-hidden="true" />
          SYSTEM&nbsp;NOMINAL · {year}
        </span>
        <span className={styles.copyright}>
          {copyright ?? `Physical AI & Humanoid Robotics — An AI-Native Textbook.`}
        </span>
        <span className={styles.eof}>{'// EOF'}</span>
      </div>
    </footer>
  );
}
