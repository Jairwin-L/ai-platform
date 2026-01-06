import { dirname } from 'path';
import { fileURLToPath } from 'url';
// 从 import.meta.url 获取当前模块文件的路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
