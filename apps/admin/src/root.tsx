import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import 'antd/dist/reset.css';
// 放在 antd 重置样式之后，保证项目内的全局定制能覆盖组件库默认样式
import './styles/global.scss';

const container = document.getElementById('admin');
if (!container) throw new Error('未找到挂载节点 #admin');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
