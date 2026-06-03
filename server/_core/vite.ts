import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const appRoot =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..")
      : path.resolve(import.meta.dirname, "..");
  const distPath = path.resolve(appRoot, "dist", "public");
  const uploadsPath = path.resolve(appRoot, "uploads");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  const setStaticCacheHeaders = (res: any, filePath: string) => {
    const normalized = filePath.toLowerCase();
    const baseName = path.basename(normalized);

    if (normalized.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
      return;
    }

    if (/\.[a-z0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|webp|avif|ico|mp3|wav|ogg)$/.test(baseName)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return;
    }

    if (/\.(png|jpg|jpeg|gif|svg|webp|avif|ico|mp3|wav|ogg)$/.test(baseName)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=14400');
  };

  if (fs.existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath, {
      fallthrough: true,
      etag: true,
      lastModified: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      setHeaders: setStaticCacheHeaders,
    }));
  }

  app.use(express.static(distPath, {
    fallthrough: true,
    etag: true,
    lastModified: true,
    maxAge: 4 * 60 * 60 * 1000,
    setHeaders: setStaticCacheHeaders,
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"), {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  });
}
