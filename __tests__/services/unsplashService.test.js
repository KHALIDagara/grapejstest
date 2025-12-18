import { searchPhotos, getRandomImage, VALID_COLORS, VALID_ORIENTATIONS } from '../../services/unsplashService';

// Mock fetch globally
global.fetch = jest.fn();

describe('UnsplashService', () => {
    const mockAccessKey = 'test-access-key';

    beforeEach(() => {
        jest.clearAllMocks();
        // Suppress console logs during tests
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('searchPhotos', () => {
        const mockApiResponse = {
            total: 100,
            total_pages: 10,
            results: [
                {
                    id: 'photo-1',
                    urls: {
                        raw: 'https://images.unsplash.com/photo-1-raw',
                        full: 'https://images.unsplash.com/photo-1-full',
                        regular: 'https://images.unsplash.com/photo-1-regular',
                        small: 'https://images.unsplash.com/photo-1-small',
                        thumb: 'https://images.unsplash.com/photo-1-thumb'
                    },
                    alt_description: 'A beautiful sunset',
                    description: 'Sunset over the ocean',
                    width: 4000,
                    height: 3000,
                    color: '#FF6B35',
                    user: {
                        name: 'John Photographer',
                        username: 'johnphoto',
                        links: { html: 'https://unsplash.com/@johnphoto' }
                    },
                    links: { download_location: 'https://api.unsplash.com/photos/photo-1/download' }
                }
            ]
        };

        test('should search photos successfully', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponse
            });

            const result = await searchPhotos('sunset', {}, mockAccessKey);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('https://api.unsplash.com/search/photos'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Authorization': `Client-ID ${mockAccessKey}`
                    })
                })
            );

            expect(result.total).toBe(100);
            expect(result.totalPages).toBe(10);
            expect(result.images).toHaveLength(1);
            expect(result.images[0]).toEqual(expect.objectContaining({
                id: 'photo-1',
                url: 'https://images.unsplash.com/photo-1-regular',
                alt: 'A beautiful sunset',
                photographer: 'John Photographer',
                photographerUrl: 'https://unsplash.com/@johnphoto'
            }));
        });

        test('should include color filter in request', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ...mockApiResponse, results: [] })
            });

            await searchPhotos('sunset', { color: 'blue' }, mockAccessKey);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('color=blue'),
                expect.anything()
            );
        });

        test('should include orientation filter in request', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ...mockApiResponse, results: [] })
            });

            await searchPhotos('sunset', { orientation: 'landscape' }, mockAccessKey);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('orientation=landscape'),
                expect.anything()
            );
        });

        test('should throw error for empty query', async () => {
            await expect(searchPhotos('', {}, mockAccessKey))
                .rejects.toThrow('Query parameter is required');
        });

        test('should throw error for missing access key', async () => {
            await expect(searchPhotos('sunset', {}, ''))
                .rejects.toThrow('Unsplash Access Key is required');
        });

        test('should throw error for invalid color', async () => {
            await expect(searchPhotos('sunset', { color: 'invalid-color' }, mockAccessKey))
                .rejects.toThrow('Invalid color');
        });

        test('should throw error for invalid orientation', async () => {
            await expect(searchPhotos('sunset', { orientation: 'diagonal' }, mockAccessKey))
                .rejects.toThrow('Invalid orientation');
        });

        test('should handle API error response', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: async () => 'Unauthorized'
            });

            await expect(searchPhotos('sunset', {}, mockAccessKey))
                .rejects.toThrow('Unsplash API error: 401');
        });

        test('should limit perPage to 30', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ...mockApiResponse, results: [] })
            });

            await searchPhotos('sunset', { perPage: 100 }, mockAccessKey);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('per_page=30'),
                expect.anything()
            );
        });
    });

    describe('getRandomImage', () => {
        test('should return a random image from results', async () => {
            const mockResults = {
                total: 10,
                total_pages: 1,
                results: [
                    {
                        id: 'photo-1',
                        urls: { regular: 'url1', thumb: 't1', small: 's1', full: 'f1' },
                        alt_description: 'Image 1',
                        width: 1000,
                        height: 800,
                        color: '#FFF',
                        user: { name: 'User1', username: 'u1', links: { html: 'link1' } },
                        links: { download_location: 'dl1' }
                    },
                    {
                        id: 'photo-2',
                        urls: { regular: 'url2', thumb: 't2', small: 's2', full: 'f2' },
                        alt_description: 'Image 2',
                        width: 1000,
                        height: 800,
                        color: '#000',
                        user: { name: 'User2', username: 'u2', links: { html: 'link2' } },
                        links: { download_location: 'dl2' }
                    }
                ]
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResults
            });

            const result = await getRandomImage('test', {}, mockAccessKey);

            expect(result).not.toBeNull();
            expect(['photo-1', 'photo-2']).toContain(result.id);
        });

        test('should return null when no images found', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ total: 0, total_pages: 0, results: [] })
            });

            const result = await getRandomImage('nonexistent', {}, mockAccessKey);

            expect(result).toBeNull();
        });
    });

    describe('Constants', () => {
        test('VALID_COLORS should include expected colors', () => {
            expect(VALID_COLORS).toContain('blue');
            expect(VALID_COLORS).toContain('red');
            expect(VALID_COLORS).toContain('green');
            expect(VALID_COLORS).toContain('black_and_white');
        });

        test('VALID_ORIENTATIONS should include expected orientations', () => {
            expect(VALID_ORIENTATIONS).toContain('landscape');
            expect(VALID_ORIENTATIONS).toContain('portrait');
            expect(VALID_ORIENTATIONS).toContain('squarish');
        });
    });
});
