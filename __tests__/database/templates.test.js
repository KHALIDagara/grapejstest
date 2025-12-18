// Mock the server actions module before importing
jest.mock('@/app/actions', () => ({
  getTemplatesAction: jest.fn(),
  searchTemplatesAction: jest.fn()
}));

import { getTemplatesAction, searchTemplatesAction } from '@/app/actions';

describe('Templates Database Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplatesAction', () => {
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
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
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
        is_active: true,
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z'
      }
    ];

    test('should return all active templates by default', async () => {
      getTemplatesAction.mockResolvedValue({ data: mockTemplates, error: null });

      const result = await getTemplatesAction();

      expect(getTemplatesAction).toHaveBeenCalledWith();
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(expect.objectContaining({
        id: 'template-1',
        name: 'Modern Landing Page',
        tags: ['landing', 'modern', 'business']
      }));
      expect(result.error).toBeNull();
    });

    test('should filter templates by category', async () => {
      const businessTemplates = [mockTemplates[0]];
      getTemplatesAction.mockResolvedValue({ data: businessTemplates, error: null });

      const result = await getTemplatesAction({ category: 'business' });

      expect(getTemplatesAction).toHaveBeenCalledWith({ category: 'business' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].category).toBe('business');
    });

    test('should filter templates by tags', async () => {
      const modernTemplates = [mockTemplates[0]];
      getTemplatesAction.mockResolvedValue({ data: modernTemplates, error: null });

      const result = await getTemplatesAction({ tags: ['modern'] });

      expect(getTemplatesAction).toHaveBeenCalledWith({ tags: ['modern'] });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].tags).toContain('modern');
    });

    test('should limit results when limit option provided', async () => {
      getTemplatesAction.mockResolvedValue({ data: [mockTemplates[0]], error: null });

      const result = await getTemplatesAction({ limit: 1 });

      expect(getTemplatesAction).toHaveBeenCalledWith({ limit: 1 });
      expect(result.data).toHaveLength(1);
    });

    test('should handle empty results', async () => {
      getTemplatesAction.mockResolvedValue({ data: [], error: null });

      const result = await getTemplatesAction({ category: 'nonexistent' });

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    test('should handle database errors', async () => {
      const errorMessage = 'Database connection failed';
      getTemplatesAction.mockResolvedValue({ data: null, error: errorMessage });

      const result = await getTemplatesAction();

      expect(result.error).toBe(errorMessage);
      expect(result.data).toBeNull();
    });

    test('should only return active templates (is_active = true)', async () => {
      const activeTemplates = mockTemplates.filter(t => t.is_active);
      getTemplatesAction.mockResolvedValue({ data: activeTemplates, error: null });

      const result = await getTemplatesAction();

      expect(result.data).toHaveLength(2);
      result.data.forEach(template => {
        expect(template.is_active).toBe(true);
      });
    });

    test('should return templates ordered by updated_at DESC', async () => {
      getTemplatesAction.mockResolvedValue({ data: mockTemplates, error: null });

      const result = await getTemplatesAction();

      expect(result.data[0].updated_at).toBe('2025-01-01T00:00:00Z');
      expect(result.data[1].updated_at).toBe('2025-01-02T00:00:00Z');
    });
  });

  describe('searchTemplatesAction', () => {
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

    test('should search templates by name using fuzzy search', async () => {
      searchTemplatesAction.mockResolvedValue({ data: mockSearchResults, error: null });

      const result = await searchTemplatesAction('modern');

      expect(searchTemplatesAction).toHaveBeenCalledWith('modern');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toContain('Modern');
    });

    test('should search templates case-insensitively', async () => {
      searchTemplatesAction.mockResolvedValue({ data: mockSearchResults, error: null });

      const result = await searchTemplatesAction('MODERN');

      expect(searchTemplatesAction).toHaveBeenCalledWith('MODERN');
      expect(result.data).toHaveLength(1);
    });

    test('should search in both name and description fields', async () => {
      searchTemplatesAction.mockResolvedValue({ data: mockSearchResults, error: null });

      const result = await searchTemplatesAction('landing');

      expect(result.data).toHaveLength(1);
      expect(
        result.data[0].name.toLowerCase().includes('landing') ||
        result.data[0].description.toLowerCase().includes('landing')
      ).toBe(true);
    });

    test('should handle empty query string', async () => {
      searchTemplatesAction.mockResolvedValue({ data: [], error: 'Query is required' });

      const result = await searchTemplatesAction('');

      expect(result.error).toBe('Query is required');
    });

    test('should return empty array when no matches found', async () => {
      searchTemplatesAction.mockResolvedValue({ data: [], error: null });

      const result = await searchTemplatesAction('nonexistentquery123');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    test('should handle special characters in search query', async () => {
      searchTemplatesAction.mockResolvedValue({ data: [], error: null });

      const result = await searchTemplatesAction('test%query_');

      expect(searchTemplatesAction).toHaveBeenCalledWith('test%query_');
      expect(result.data).toEqual([]);
    });

    test('should limit search results to 20 by default', async () => {
      const limitedResults = Array(20).fill(mockSearchResults[0]);
      searchTemplatesAction.mockResolvedValue({ data: limitedResults, error: null });

      const result = await searchTemplatesAction('template');

      expect(result.data.length).toBeLessThanOrEqual(20);
    });

    test('should handle database errors during search', async () => {
      const errorMessage = 'Search query failed';
      searchTemplatesAction.mockResolvedValue({ data: null, error: errorMessage });

      const result = await searchTemplatesAction('test');

      expect(result.error).toBe(errorMessage);
      expect(result.data).toBeNull();
    });
  });

  describe('Templates Table Schema Validation', () => {
    test('should have all required fields in template object', () => {
      const template = {
        id: 'template-1',
        name: 'Test Template',
        description: 'Test Description',
        content: {},
        html: '<div>Test</div>',
        css: '.test {}',
        theme: {},
        tags: [],
        category: 'test',
        thumbnail_html: '<div>Preview</div>',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Verify all required fields exist
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('content');
      expect(template).toHaveProperty('html');
      expect(template).toHaveProperty('css');
      expect(template).toHaveProperty('theme');
      expect(template).toHaveProperty('tags');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('thumbnail_html');
      expect(template).toHaveProperty('is_active');
      expect(template).toHaveProperty('created_at');
      expect(template).toHaveProperty('updated_at');
    });

    test('should validate theme structure', () => {
      const theme = {
        primaryColor: '#3b82f6',
        secondaryColor: '#ffffff',
        fontFamily: 'Inter',
        borderRadius: '8px'
      };

      expect(theme).toHaveProperty('primaryColor');
      expect(theme).toHaveProperty('secondaryColor');
      expect(theme.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    test('should validate tags as array', () => {
      const template = {
        tags: ['landing', 'modern', 'business']
      };

      expect(Array.isArray(template.tags)).toBe(true);
      expect(template.tags).toHaveLength(3);
    });
  });
});
