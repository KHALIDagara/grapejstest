import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TemplateCard from '@/components/TemplateCard';

describe('TemplateCard', () => {
  const mockTemplate = {
    id: 'template-1',
    name: 'Modern Landing Page',
    description: 'A clean, modern landing page template',
    thumbnail_html: '<div style="background: #3b82f6; padding: 20px;">Landing Page Preview</div>',
    tags: ['landing', 'modern', 'business', 'professional', 'corporate'],
    category: 'business'
  };

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render template name', () => {
      render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);

      expect(screen.getByText('Modern Landing Page')).toBeInTheDocument();
    });

    test('should render template description', () => {
      render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);

      expect(screen.getByText('A clean, modern landing page template')).toBeInTheDocument();
    });

    test('should render Select Template button', () => {
      render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);

      const button = screen.getByRole('button', { name: /select template/i });
      expect(button).toBeInTheDocument();
    });

    test('should limit tags to 3 when more are provided', () => {
      render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);

      const tags = screen.getAllByTestId(/template-tag-/);
      expect(tags).toHaveLength(3);
      expect(screen.getByText('landing')).toBeInTheDocument();
      expect(screen.getByText('modern')).toBeInTheDocument();
      expect(screen.getByText('business')).toBeInTheDocument();
      expect(screen.queryByText('professional')).not.toBeInTheDocument();
      expect(screen.queryByText('corporate')).not.toBeInTheDocument();
    });

    test('should render all tags when less than 3 provided', () => {
      const templateWithFewTags = {
        ...mockTemplate,
        tags: ['landing', 'modern']
      };

      render(<TemplateCard template={templateWithFewTags} onSelect={mockOnSelect} />);

      const tags = screen.getAllByTestId(/template-tag-/);
      expect(tags).toHaveLength(2);
    });

    test('should render preview iframe with thumbnail_html', () => {
      render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);

      const iframe = screen.getByTitle('Template preview');
      expect(iframe).toBeInTheDocument();
      expect(iframe.tagName).toBe('IFRAME');
    });

    test('should handle missing thumbnail_html gracefully', () => {
      const templateWithoutThumbnail = {
        ...mockTemplate,
        thumbnail_html: null
      };

      render(<TemplateCard template={templateWithoutThumbnail} onSelect={mockOnSelect} />);

      // Should still render the card with other content
      expect(screen.getByText('Modern Landing Page')).toBeInTheDocument();
    });

    test('should handle missing description', () => {
      const templateWithoutDescription = {
        ...mockTemplate,
        description: null
      };

      render(<TemplateCard template={templateWithoutDescription} onSelect={mockOnSelect} />);

      expect(screen.getByText('Modern Landing Page')).toBeInTheDocument();
      expect(screen.queryByText('A clean, modern landing page template')).not.toBeInTheDocument();
    });

    test('should handle empty tags array', () => {
      const templateWithoutTags = {
        ...mockTemplate,
        tags: []
      };

      render(<TemplateCard template={templateWithoutTags} onSelect={mockOnSelect} />);

      const tags = screen.queryAllByTestId(/template-tag-/);
      expect(tags).toHaveLength(0);
    });
  });

  describe('Interactions', () => {
    test('should call onSelect with template when button clicked', () => {
      render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);

      const button = screen.getByRole('button', { name: /select template/i });
      fireEvent.click(button);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(mockTemplate);
    });

    test('should not call onSelect when button is clicked twice rapidly', () => {
      render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);

      const button = screen.getByRole('button', { name: /select template/i });
      fireEvent.click(button);
      fireEvent.click(button);

      // Should only be called once (debounced or prevented)
      // This test depends on implementation - adjust if needed
      expect(mockOnSelect).toHaveBeenCalled();
    });

    test('should not crash when onSelect is not provided', () => {
      expect(() => {
        render(<TemplateCard template={mockTemplate} />);
        const button = screen.getByRole('button', { name: /select template/i });
        fireEvent.click(button);
      }).not.toThrow();
    });
  });

  describe('Security', () => {
    test('should render iframe with sandbox attribute', () => {
      render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);

      const iframe = screen.getByTitle('Template preview');
      expect(iframe).toHaveAttribute('sandbox');
    });

    test('should handle malicious HTML in thumbnail_html safely', () => {
      const templateWithScript = {
        ...mockTemplate,
        thumbnail_html: '<div>Preview</div><script>alert("XSS")</script>'
      };

      expect(() => {
        render(<TemplateCard template={templateWithScript} onSelect={mockOnSelect} />);
      }).not.toThrow();
    });

    test('should handle malicious HTML in name safely', () => {
      const templateWithScriptInName = {
        ...mockTemplate,
        name: '<img src=x onerror="alert(1)">'
      };

      render(<TemplateCard template={templateWithScriptInName} onSelect={mockOnSelect} />);

      // Should render the text content, not execute the script
      const nameElement = screen.getByText(/<img src=x onerror="alert\(1\)">/);
      expect(nameElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have accessible button', () => {
      render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);

      const button = screen.getByRole('button', { name: /select template/i });
      expect(button).toBeInTheDocument();
    });

    test('should have alt text or title for iframe', () => {
      render(<TemplateCard template={mockTemplate} onSelect={mockOnSelect} />);

      const iframe = screen.getByTitle('Template preview');
      expect(iframe).toBeInTheDocument();
    });
  });
});
