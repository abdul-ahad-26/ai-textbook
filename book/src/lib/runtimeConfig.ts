import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export type RuntimeConfig = {
  backendUrl: string;
  chatkitDomainKey: string;
  authUrl: string;
};

const DEFAULTS: RuntimeConfig = {
  backendUrl: 'http://localhost:8000',
  chatkitDomainKey: 'local-dev',
  authUrl: 'http://localhost:3001',
};

/** Read integration endpoints injected via docusaurus.config customFields. */
export function useRuntimeConfig(): RuntimeConfig {
  const {siteConfig} = useDocusaurusContext();
  const cf = (siteConfig.customFields ?? {}) as Partial<RuntimeConfig>;
  return {
    backendUrl: cf.backendUrl || DEFAULTS.backendUrl,
    chatkitDomainKey: cf.chatkitDomainKey || DEFAULTS.chatkitDomainKey,
    authUrl: cf.authUrl || DEFAULTS.authUrl,
  };
}

// Module-level mirror so non-React code (e.g. the auth client singleton) can read
// the configured auth URL. Root sets this on mount.
let _authUrl = DEFAULTS.authUrl;
export function setAuthUrl(url: string) {
  _authUrl = url || DEFAULTS.authUrl;
}
export function getAuthUrl(): string {
  return _authUrl;
}
