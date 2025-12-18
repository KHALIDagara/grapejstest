// Mock the actions module before importing the service
jest.mock('@/app/actions', () => ({
  getTemplatesAction: jest.fn(),
  searchTemplatesAction: jest.fn()
}));

import { getTemplates, searchTemplates } from '@/services/templatesService';
import { getTemplatesAction, searchTemplatesAction } from '@/app/actions';

describe('TemplatesService', () => {
  let consoleLogSpy, consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on console methods to test logging
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('getTemplates', () => {
    const mockTemplates = [
      {
        id: 'template-1',
        name: 'Modern Landing Page',
        description: 'A clean, modern landing page template',
        content: { components: [] },
        html: '<div>Landing Page</div>',
        css: '.page { margin: 0; }',
        theme: { primaryColor: '#3b82f6', secondaryColor: '#ffffff' },
        tags: ['landing', 'modern', 'business'],
        category: 'business',
        thumbnail_html: '<div>Preview</div>',
        is_active: true
      },
      {
        id: 'template-2',
        name: 'Portfolio Showcase',
        description: 'Elegant portfolio template',
        content: { components: [] },
        html: '<div>Portfolio</div>',
        css: '.portfolio { padding: 20px; }',
        theme: { primaryColor: '#8b5cf6', secondaryColor: '#f3f4f6' },
        tags: ['portfolio', 'creative'],
        category: 'portfolio',
        thumbnail_html: '<div>Preview</div>',
        is_active: true
      }
    ];

    test('should fetch templates successfully', async () => {
      getTemplatesAction.mockResolvedValue({ data: mockTemplates, error: null });

      const result = await getTemplates();

      expect(getTemplatesAction).toHaveBeenCalledWith({});
      expect(result).toEqual(mockTemplates);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TemplatesService] INFO: Fetching templates'),
        expect.any(String)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TemplatesService] INFO: Templates fetched successfully'),
        expect.any(String)
      );
    });

    test('should pass options to getTemplatesAction', async () => {
      const options = { category: 'business', limit: 10 };
      getTemplatesAction.mockResolvedValue({ data: [mockTemplates[0]], error: null });

      const result = await getTemplates(options);

      expect(getTemplatesAction).toHaveBeenCalledWith(options);
      expect(result).toEqual([mockTemplates[0]]);
    });

    test('should handle empty results', async () => {
      getTemplatesAction.mockResolvedValue({ data: [], error: null });

      const result = await getTemplates();

      expect(result).toEqual([]);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Templates fetched successfully'),
        expect.stringContaining('"count": 0')
      );
    });

    test('should throw error when getTemplatesAction fails', async () => {
      const errorMessage = 'Database connection failed';
      getTemplatesAction.mockResolvedValue({ data: null, error: errorMessage });

      await expect(getTemplates()).rejects.toThrow(errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TemplatesService] ERROR: Failed to fetch templates'),
        errorMessage
      );
    });

    test('should throw error when action returns no data and no error', async () => {
      getTemplatesAction.mockResolvedValue({ data: null, error: null });

      await expect(getTemplates()).rejects.toThrow('No data returned from getTemplatesAction');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should log debug information with options', async () => {
      const options = { category: 'portfolio', tags: ['creative'] };
      getTemplatesAction.mockResolvedValue({ data: mockTemplates, error: null });

      await getTemplates(options);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TemplatesService] INFO: Fetching templates'),
        expect.stringContaining('"category": "portfolio"')
      );
    });
  });

  describe('searchTemplates', () => {
    const mockSearchResults = [
      {
        id: 'template-1',
        name: 'Modern Landing Page',
        description: 'A clean, modern landing page template',
        content: { components: [] },
        html: '<div>Landing Page</div>',
        css: '.page { margin: 0; }',
        theme: { primaryColor: '#3b82f6' },
        tags: ['landing', 'modern'],
        category: 'business',
        is_active: true
      }
    ];

    test('should search templates successfully', async () => {
      searchTemplatesAction.mockResolvedValue({ data: mockSearchResults, error: null });

      const result = await searchTemplates('modern');

      expect(searchTemplatesAction).toHaveBeenCalledWith('modern');
      expect(result).toEqual(mockSearchResults);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TemplatesService] INFO: Searching templates'),
        expect.stringContaining('"query": "modern"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TemplatesService] INFO: Search completed'),
        expect.any(String)
      );
    });

    test('should throw error for empty query', async () => {
      await expect(searchTemplates('')).rejects.toThrow('Search query is required');
      expect(searchTemplatesAction).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TemplatesService] ERROR: Invalid search query'),
        expect.objectContaining({ query: '' })
      );
    });

    test('should throw error for null query', async () => {
      await expect(searchTemplates(null)).rejects.toThrow('Search query is required');
      expect(searchTemplatesAction).not.toHaveBeenCalled();
    });

    test('should throw error for undefined query', async () => {
      await expect(searchTemplates()).rejects.toThrow('Search query is required');
      expect(searchTemplatesAction).not.toHaveBeenCalled();
    });

    test('should trim whitespace from query', async () => {
      searchTemplatesAction.mockResolvedValue({ data: mockSearchResults, error: null });

      await searchTemplates('  modern  ');

      expect(searchTemplatesAction).toHaveBeenCalledWith('modern');
    });

    test('should handle empty search results', async () => {
      searchTemplatesAction.mockResolvedValue({ data: [], error: null });

      const result = await searchTemplates('nonexistent');

      expect(result).toEqual([]);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Search completed'),
        expect.stringContaining('"count": 0')
      );
    });

    test('should throw error when searchTemplatesAction fails', async () => {
      const errorMessage = 'Search query failed';
      searchTemplatesAction.mockResolvedValue({ data: null, error: errorMessage });

      await expect(searchTemplates('test')).rejects.toThrow(errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TemplatesService] ERROR: Search failed'),
        errorMessage
      );
    });

    test('should throw error when action returns no data and no error', async () => {
      searchTemplatesAction.mockResolvedValue({ data: null, error: null });

      await expect(searchTemplates('test')).rejects.toThrow('No data returned from searchTemplatesAction');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should log search performance metrics', async () => {
      searchTemplatesAction.mockResolvedValue({ data: mockSearchResults, error: null });

      await searchTemplates('landing page');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Search completed'),
        expect.stringContaining('"count": 1')
      );
    });
  });

  describe('Logger', () => {
    test('should include timestamp in log messages', async () => {
      getTemplatesAction.mockResolvedValue({ data: [], error: null });

      await getTemplates();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/),
        expect.any(String)
      );
    });

    test('should include service name in log messages', async () => {
      getTemplatesAction.mockResolvedValue({ data: [], error: null });

      await getTemplates();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TemplatesService]'),
        expect.any(String)
      );
    });

    test('should use appropriate emoji for log levels', async () => {
      getTemplatesAction.mockResolvedValue({ data: [], error: null });

      await getTemplates();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('📚'),
        expect.any(String)
      );
    });

    test('should include emoji in error messages', async () => {
      getTemplatesAction.mockResolvedValue({ data: null, error: 'Test error' });

      await expect(getTemplates()).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌'),
        expect.any(String)
      );
    });
  });
});
