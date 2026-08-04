import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.debtworld.org";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: { languages: { "zh-CN": `${base}/`, en: `${base}/en` } } },
    { url: `${base}/en`, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: { languages: { "zh-CN": `${base}/`, en: `${base}/en` } } },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: .8, alternates: { languages: { "zh-CN": `${base}/about`, en: `${base}/en/about` } } },
    { url: `${base}/en/about`, lastModified: now, changeFrequency: "monthly", priority: .8, alternates: { languages: { "zh-CN": `${base}/about`, en: `${base}/en/about` } } },
    { url: `${base}/contribute`, lastModified: now, changeFrequency: "weekly", priority: .85, alternates: { languages: { "zh-CN": `${base}/contribute`, en: `${base}/en/contribute` } } },
    { url: `${base}/en/contribute`, lastModified: now, changeFrequency: "weekly", priority: .85, alternates: { languages: { "zh-CN": `${base}/contribute`, en: `${base}/en/contribute` } } },
    { url: `${base}/safety`, lastModified: now, changeFrequency: "monthly", priority: .5 },
    { url: `${base}/en/safety`, lastModified: now, changeFrequency: "monthly", priority: .5 },
  ];
}
