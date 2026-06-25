import React from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type {WrapperProps} from '@docusaurus/types';
import BrowserOnly from '@docusaurus/BrowserOnly';
import ChapterToolbar from '@site/src/components/ChapterToolbar';

type Props = WrapperProps<typeof ContentType>;

/**
 * Wraps every doc page: prepends the AI toolbar (Personalize + Translate to Urdu)
 * above the chapter content.
 */
export default function ContentWrapper(props: Props): React.ReactElement {
  return (
    <>
      <BrowserOnly>{() => <ChapterToolbar />}</BrowserOnly>
      <Content {...props} />
    </>
  );
}
