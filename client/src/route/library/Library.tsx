import * as React from 'react';

import Layout from 'page/Layout';
import LibComponents from './Components';

function LibraryContent() {
  return (
    <Layout>
      <LibComponents />
    </Layout>
  );
}

export default function Library() {
  return <LibraryContent />;
}
