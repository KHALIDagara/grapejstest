import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TemplatesGallery from '@/components/TemplatesGallery';
import * as templatesService from '@/services/templatesService';

// Mock the templates service
jest.mock('@/services/templatesService');

// Mock TemplateCard component
jest.mock('@/components/TemplateCard', () => {
  return function MockTemplateCard({ template, onSelect }) {
    return (
      <div data-testid={`template-card-${template.id}`}>
        <span>{template.name}</span>
        <button onClick={() => onSelect(template)}>Select</button>
      </div>
    );
  };
});

describe('TemplatesGallery', () => {
  const mockTemplates = [
    {
      id: 'template-1',
      name: 'Modern Landing Page',
      description: 'A clean, modern landing page template',
      thumbnail_html: '<div>Preview 1</div>',
      tags: ['landing', 'modern'],
      category: 'business'
    },
    {
      id: 'template-2',
      name: 'Portfolio Showcase',
      description: 'Elegant portfolio template',
      thumbnail_html: '<div>Preview 2</div>',
      tags: ['portfolio', 'creative'],
      category: 'portfolio'
    },
    {
      id: 'template-3',
      name: 'E-commerce Store',
      description: 'Modern e-commerce template',
      thumbnail_html: '<div>Preview 3</div>',
      tags: ['shop', 'ecommerce'],
      category: 'ecommerce'
    }
  ];

  const mockOnSelectTemplate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial Loading', () => {
    test('should show loading state initially', () => {
      templatesService.getTemplates.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      expect(screen.getByText(/loading templates/i)).toBeInTheDocument();
    });

    test('should fetch templates on mount', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(templatesService.getTemplates).toHaveBeenCalledTimes(1);
      });
    });

    test('should display templates after loading', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.getByTestId('template-card-template-1')).toBeInTheDocument();
        expect(screen.getByTestId('template-card-template-2')).toBeInTheDocument();
        expect(screen.getByTestId('template-card-template-3')).toBeInTheDocument();
      });
    });

    test('should hide loading state after templates loaded', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading templates/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error message when fetch fails', async () => {
      const errorMessage = 'Failed to fetch templates';
      templatesService.getTemplates.mockRejectedValue(new Error(errorMessage));

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
      });
    });

    test('should hide loading state when error occurs', async () => {
      templatesService.getTemplates.mockRejectedValue(new Error('Network error'));

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading templates/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    test('should show empty state when no templates available', async () => {
      templatesService.getTemplates.mockResolvedValue([]);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
      });
    });

    test('should show no results message after search with no matches', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);
      templatesService.searchTemplates.mockResolvedValue([]);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.getByTestId('template-card-template-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      // Fast-forward debounce timer
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    test('should render search input', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      expect(screen.getByPlaceholderText(/search templates/i)).toBeInTheDocument();
    });

    test('should debounce search input (not call immediately)', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);
      templatesService.searchTemplates.mockResolvedValue([mockTemplates[0]]);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.getByTestId('template-card-template-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      fireEvent.change(searchInput, { target: { value: 'landing' } });

      // Should not call immediately
      expect(templatesService.searchTemplates).not.toHaveBeenCalled();

      // Fast-forward 500ms (not enough)
      jest.advanceTimersByTime(500);
      expect(templatesService.searchTemplates).not.toHaveBeenCalled();

      // Fast-forward remaining 500ms (total 1s)
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(templatesService.searchTemplates).toHaveBeenCalledWith('landing');
      });
    });

    test('should call searchTemplates after 1 second debounce', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);
      templatesService.searchTemplates.mockResolvedValue([mockTemplates[0]]);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.getByTestId('template-card-template-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      fireEvent.change(searchInput, { target: { value: 'modern' } });

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(templatesService.searchTemplates).toHaveBeenCalledWith('modern');
      });
    });

    test('should display search results', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);
      templatesService.searchTemplates.mockResolvedValue([mockTemplates[0]]);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.getAllByTestId(/template-card-/).length).toBe(3);
      });

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      fireEvent.change(searchInput, { target: { value: 'landing' } });

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByTestId('template-card-template-1')).toBeInTheDocument();
        expect(screen.queryByTestId('template-card-template-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('template-card-template-3')).not.toBeInTheDocument();
      });
    });

    test('should fetch all templates when search cleared', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);
      templatesService.searchTemplates.mockResolvedValue([mockTemplates[0]]);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.getAllByTestId(/template-card-/).length).toBe(3);
      });

      const searchInput = screen.getByPlaceholderText(/search templates/i);

      // Search
      fireEvent.change(searchInput, { target: { value: 'landing' } });
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getAllByTestId(/template-card-/).length).toBe(1);
      });

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(templatesService.getTemplates).toHaveBeenCalledTimes(2);
        expect(screen.getAllByTestId(/template-card-/).length).toBe(3);
      });
    });

    test('should show loading state during search', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);
      templatesService.searchTemplates.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([mockTemplates[0]]), 100))
      );

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.getByTestId('template-card-template-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText(/searching/i)).toBeInTheDocument();
      });
    });
  });

  describe('Template Selection', () => {
    test('should call onSelectTemplate when template card clicked', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);

      render(<TemplatesGallery onSelectTemplate={mockOnSelectTemplate} />);

      await waitFor(() => {
        expect(screen.getByTestId('template-card-template-1')).toBeInTheDocument();
      });

      const selectButton = screen.getAllByRole('button', { name: /select/i })[0];
      fireEvent.click(selectButton);

      expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
    });

    test('should not crash if onSelectTemplate is not provided', async () => {
      templatesService.getTemplates.mockResolvedValue(mockTemplates);

      render(<TemplatesGallery />);

      await waitFor(() => {
        expect(screen.getByTestId('template-card-template-1')).toBeInTheDocument();
      });

      expect(() => {
        const selectButton = screen.getAllByRole('button', { name: /select/i })[0];
        fireEvent.click(selectButton);
      }).not.toThrow();
    });
  });
});
