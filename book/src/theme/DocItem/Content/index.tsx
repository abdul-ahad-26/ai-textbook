import React from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type {WrapperProps} from '@docusaurus/types';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useLocation} from '@docusaurus/router';
import ChapterToolbar from '@site/src/components/ChapterToolbar';

type Props = WrapperProps<typeof ContentType>;

/**
 * Wraps every doc page: prepends the AI toolbar (Personalize + Translate to Urdu)
 * above the chapter content.
 *
 * The toolbar is keyed by pathname so it remounts on every chapter change. That
 * keeps its per-chapter state (which transform is shown, the captured original
 * text) from leaking across chapters in the single-page app; the result cache that
 * should survive navigation/reloads lives in localStorage (see lib/transformCache).
 */
export default function ContentWrapper(props: Props): React.ReactElement {
  const {pathname} = useLocation();
  return (
    <>
      <BrowserOnly>{() => <ChapterToolbar key={pathname} />}</BrowserOnly>
      <Content {...props} />
    </>
  );
}
