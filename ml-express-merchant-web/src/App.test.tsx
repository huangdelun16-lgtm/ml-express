import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app', () => {
  render(<App />);
  // 客户端应用的基本渲染测试
  expect(document.body).toBeInTheDocument();
});
