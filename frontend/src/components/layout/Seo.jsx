import { Helmet } from 'react-helmet-async';

const SITE = 'CCMS';
export function Seo({ title, description, noindex = false, path = '' }) {
  const full = title ? `${title} | ${SITE}` : `${SITE} - Construction Cost Estimator`;
  const desc = description || 'Know your construction cost before you build. Standards-based estimates with AI suggestions for houses in Maharashtra.';
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <link rel="canonical" href={`${window.location.origin}${path || window.location.pathname}`} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
    </Helmet>
  );
}
