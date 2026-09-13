import { fireEvent, render, screen } from '@testing-library/react';
import { MapAddressSearchDropdown } from './MapAddressSearchDropdown';

const labels = {
  loading: '搜索中...',
  empty: '未找到相关位置',
  failed: '搜索失败，请稍后重试',
  retry: '重试',
};

describe('MapAddressSearchDropdown', () => {
  it('shows loading, empty, and failed states', () => {
    const { rerender } = render(
      <MapAddressSearchDropdown
        open
        status="loading"
        suggestions={[]}
        labels={labels}
        onSelect={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.getByText('搜索中...')).toBeInTheDocument();

    rerender(
      <MapAddressSearchDropdown
        open
        status="empty"
        suggestions={[]}
        labels={labels}
        onSelect={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.getByText('未找到相关位置')).toBeInTheDocument();

    const onRetry = jest.fn();
    rerender(
      <MapAddressSearchDropdown
        open
        status="error"
        suggestions={[]}
        labels={labels}
        onSelect={jest.fn()}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('搜索失败，请稍后重试')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
