import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapeOptions {
  timeout?: number;
  userAgent?: string;
  followRedirects?: boolean;
  extractImages?: boolean;
  extractLinks?: boolean;
  maxContentLength?: number;
  selectors?: Record<string, string>;
}

export interface Link {
  href: string;
  text: string;
  isExternal: boolean;
}

export interface Image {
  src: string;
  alt: string;
  title: string;
}

export interface Heading {
  level: number;
  text: string;
}

export interface TableCell {
  text: string;
}

export interface Table {
  headers: string[];
  rows: TableCell[][];
}

export interface ScrapeResult {
  url: string;
  statusCode: number;
  title: string;
  description: string;
  text: string;
  links: Link[];
  images: Image[];
  headings: Heading[];
  tables: Table[];
  meta: Record<string, string>;
  structuredData: Record<string, string[]>;
  scrapedAt: string;
  responseTime: number;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36',
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

export class ScraperService {
  async scrapeUrl(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const {
      timeout = 10000,
      userAgent = randomUserAgent(),
      followRedirects = true,
      extractImages = true,
      extractLinks = true,
      maxContentLength = 5 * 1024 * 1024,
      selectors = {},
    } = options;

    const startTime = Date.now();

    const axiosConfig: AxiosRequestConfig = {
      timeout,
      maxRedirects: followRedirects ? 5 : 0,
      maxContentLength,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      validateStatus: () => true,
    };

    const response = await axios.get<string>(url, axiosConfig);
    const responseTime = Date.now() - startTime;
    const html = typeof response.data === 'string' ? response.data : String(response.data);

    const $ = cheerio.load(html);

    // Title
    const title = $('title').first().text().trim() || $('h1').first().text().trim() || '';

    // Meta tags
    const meta: Record<string, string> = {};
    $('meta').each((_, el) => {
      const name =
        $(el).attr('name') ??
        $(el).attr('property') ??
        $(el).attr('http-equiv') ??
        '';
      const content = $(el).attr('content') ?? '';
      if (name && content) {
        meta[name] = content;
      }
    });

    const description =
      meta['description'] ??
      meta['og:description'] ??
      meta['twitter:description'] ??
      '';

    // Remove script/style before extracting text
    $('script, style, noscript').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    // Links
    const links: Link[] = [];
    if (extractLinks) {
      const baseHost = new URL(url).hostname;
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        const resolvedHref = href.startsWith('http') ? href : new URL(href, url).href;
        links.push({
          href: resolvedHref,
          text: $(el).text().trim(),
          isExternal: !resolvedHref.includes(baseHost),
        });
      });
    }

    // Images
    const images: Image[] = [];
    if (extractImages) {
      $('img').each((_, el) => {
        const src = $(el).attr('src') ?? '';
        if (!src) return;
        images.push({
          src: src.startsWith('http') ? src : new URL(src, url).href,
          alt: $(el).attr('alt') ?? '',
          title: $(el).attr('title') ?? '',
        });
      });
    }

    // Headings
    const headings: Heading[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const tag = (el as { tagName?: string }).tagName ?? '';
      const level = parseInt(tag.replace('h', ''), 10);
      const headingText = $(el).text().trim();
      if (headingText && level >= 1 && level <= 6) {
        headings.push({ level, text: headingText });
      }
    });

    // Tables
    const tables: Table[] = [];
    $('table').each((_, tableEl) => {
      const headers: string[] = [];
      $(tableEl)
        .find('thead th, thead td')
        .each((_, th) => {
          headers.push($(th).text().trim());
        });

      const rows: TableCell[][] = [];
      $(tableEl)
        .find('tbody tr')
        .each((_, tr) => {
          const cells: TableCell[] = [];
          $(tr)
            .find('td, th')
            .each((_, td) => {
              cells.push({ text: $(td).text().trim() });
            });
          if (cells.length > 0) rows.push(cells);
        });

      tables.push({ headers, rows });
    });

    // Custom selectors
    const structuredData =
      Object.keys(selectors).length > 0
        ? this.extractStructuredData(html, selectors)
        : {};

    return {
      url,
      statusCode: response.status,
      title,
      description,
      text,
      links,
      images,
      headings,
      tables,
      meta,
      structuredData,
      scrapedAt: new Date().toISOString(),
      responseTime,
    };
  }

  async scrapeMultiple(
    urls: string[],
    options: ScrapeOptions = {},
  ): Promise<ScrapeResult[]> {
    const results = await Promise.allSettled(
      urls.map((url) => this.scrapeUrl(url, options)),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<ScrapeResult> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  extractStructuredData(
    html: string,
    selectors: Record<string, string>,
  ): Record<string, string[]> {
    const $ = cheerio.load(html);
    const result: Record<string, string[]> = {};

    for (const [key, selector] of Object.entries(selectors)) {
      const values: string[] = [];
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text) values.push(text);
      });
      result[key] = values;
    }

    return result;
  }
}

export const scraperService = new ScraperService();
