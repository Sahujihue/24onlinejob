import { Helmet } from 'react-helmet-async';
import { useSettings } from '../hooks/useSettings';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export default function SEO({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website' 
}: SEOProps) {
  const { settings } = useSettings();

  const seo = {
    title: title ? `${title} | ${settings.siteName}` : (settings.seoTitle || settings.siteName),
    description: description || settings.seoDescription || settings.siteDescription,
    keywords: keywords || settings.seoKeywords,
    image: image || settings.seoImage || settings.siteIcon,
    url: url || window.location.href,
  };

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={seo.url} />
      {seo.image && <meta property="og:image" content={seo.image} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      {seo.image && <meta name="twitter:image" content={seo.image} />}

      {/* Canonical Link */}
      <link rel="canonical" href={seo.url} />
    </Helmet>
  );
}
