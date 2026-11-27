// Máy chủ tĩnh nhỏ để chạy thử trên máy (bản online dùng Vercel + Supabase Realtime).
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = process.env.PORT || 3000;
express()
  .use(express.static(root))
  .listen(PORT, () => console.log(`🐷 Tiến Lên Cute: http://localhost:${PORT}  (thử nhiều tab: http://localhost:${PORT}/?local=1)`));
