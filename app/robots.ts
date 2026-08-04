import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/en", "/about", "/en/about", "/contribute", "/en/contribute", "/safety", "/en/safety"], disallow: ["/admin", "/api/"] },
    sitemap: "https://www.debtworld.org/sitemap.xml",
    host: "https://www.debtworld.org",
  };
}
