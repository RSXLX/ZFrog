import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Example Test Suite', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should render a basic component', () => {
    const TestComponent = () => <div data-testid="test-component">Hello ZFrog</div>;
    render(<TestComponent />);
    
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Hello ZFrog')).toBeInTheDocument();
  });
});
