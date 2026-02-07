// Minimal 16x16 PNG favicon (cyan square)
// Base64 encoded: iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKUlEQVR4nGNkYPj/n4GBgYGBgYGBkYHh/38GhgcMDAz//zMwMDAwMACkTQsLTuMKPAAAAABJRU5ErkJggg==
const FAVICON_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKUlEQVR4nGNkYPj/n4GBgYGBgYGBkYHh/38GhgcMDAz//zMwMDAwMACkTQsLTuMKPAAAAABJRU5ErkJggg==";

export const GET = () => {
  const buffer = Buffer.from(FAVICON_BASE64, "base64");
  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000",
    },
  });
};
