/**
 * Unsplash Image Search Service
 * 
 * Isolated service for searching images via Unsplash API.
 * Includes comprehensive logging for debugging.
 */

const UNSPLASH_API_BASE = 'https://api.unsplash.com';

/**
 * Logger utility for consistent log formatting
 */
const logger = {
    info: (message, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 📸 [UnsplashService] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    error: (message, error = null) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ❌ [UnsplashService] ERROR: ${message}`, error || '');
    },
    debug: (message, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 🔍 [UnsplashService] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};

/**
 * Valid color options for Unsplash search
 */
export const VALID_COLORS = [
    'black_and_white', 'black', 'white', 'yellow', 'orange',
    'red', 'purple', 'magenta', 'green', 'teal', 'blue'
];

/**
 * Valid orientation options for Unsplash search
 */
export const VALID_ORIENTATIONS = ['landscape', 'portrait', 'squarish'];

/**
 * Search photos on Unsplash
 * 
 * @param {string} query - Search keywords (required)
 * @param {Object} options - Search options
 * @param {string} options.color - Filter by color (optional)
 * @param {string} options.orientation - Filter by orientation (optional)
 * @param {number} options.perPage - Number of results (default: 10, max: 30)
 * @param {number} options.page - Page number (default: 1)
 * @param {string} accessKey - Unsplash Access Key (required)
 * @returns {Promise<Object>} Search results with images array
 */
export async function searchPhotos(query, options = {}, accessKey) {
    logger.info('Starting photo search', { query, options });

    // Validate required parameters
    if (!query || typeof query !== 'string' || query.trim() === '') {
        logger.error('Invalid query parameter', { query });
        throw new Error('Query parameter is required and must be a non-empty string');
    }

    if (!accessKey) {
        logger.error('Missing Unsplash Access Key');
        throw new Error('Unsplash Access Key is required');
    }

    // Validate and sanitize options
    const sanitizedOptions = {
        query: query.trim(),
        per_page: Math.min(Math.max(options.perPage || 10, 1), 30),
        page: Math.max(options.page || 1, 1)
    };

    // Validate color if provided
    if (options.color) {
        if (!VALID_COLORS.includes(options.color)) {
            logger.error('Invalid color parameter', { color: options.color, validColors: VALID_COLORS });
            throw new Error(`Invalid color. Must be one of: ${VALID_COLORS.join(', ')}`);
        }
        sanitizedOptions.color = options.color;
    }

    // Validate orientation if provided
    if (options.orientation) {
        if (!VALID_ORIENTATIONS.includes(options.orientation)) {
            logger.error('Invalid orientation parameter', { orientation: options.orientation, validOrientations: VALID_ORIENTATIONS });
            throw new Error(`Invalid orientation. Must be one of: ${VALID_ORIENTATIONS.join(', ')}`);
        }
        sanitizedOptions.orientation = options.orientation;
    }

    logger.debug('Sanitized search options', sanitizedOptions);

    // Build query string
    const queryParams = new URLSearchParams(sanitizedOptions);
    const url = `${UNSPLASH_API_BASE}/search/photos?${queryParams.toString()}`;

    logger.debug('Making API request', { url: url.replace(accessKey, '***') });

    try {
        const startTime = Date.now();

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Client-ID ${accessKey}`,
                'Accept-Version': 'v1'
            }
        });

        const responseTime = Date.now() - startTime;
        logger.info(`API response received in ${responseTime}ms`, { status: response.status });

        if (!response.ok) {
            const errorBody = await response.text();
            logger.error('API request failed', { status: response.status, body: errorBody });
            throw new Error(`Unsplash API error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();

        logger.info('Search completed successfully', {
            total: data.total,
            totalPages: data.total_pages,
            resultsReturned: data.results?.length || 0
        });

        // Transform results to a simplified format
        const images = (data.results || []).map(photo => ({
            id: photo.id,
            url: photo.urls.regular,
            thumbUrl: photo.urls.thumb,
            smallUrl: photo.urls.small,
            fullUrl: photo.urls.full,
            alt: photo.alt_description || photo.description || query,
            width: photo.width,
            height: photo.height,
            color: photo.color,
            photographer: photo.user.name,
            photographerUrl: photo.user.links.html,
            photographerUsername: photo.user.username,
            downloadUrl: photo.links.download_location
        }));

        logger.debug('Transformed image results', { count: images.length });

        return {
            total: data.total,
            totalPages: data.total_pages,
            images
        };

    } catch (error) {
        logger.error('Search failed', error.message);
        throw error;
    }
}

/**
 * Get a single random image matching criteria
 * 
 * @param {string} query - Search keywords (required)
 * @param {Object} options - Search options
 * @param {string} accessKey - Unsplash Access Key (required)
 * @returns {Promise<Object|null>} Single image object or null
 */
export async function getRandomImage(query, options = {}, accessKey) {
    logger.info('Getting random image', { query, options });

    const result = await searchPhotos(query, { ...options, perPage: 10 }, accessKey);

    if (result.images.length === 0) {
        logger.info('No images found for query', { query });
        return null;
    }

    // Select a random image from results
    const randomIndex = Math.floor(Math.random() * result.images.length);
    const selectedImage = result.images[randomIndex];

    logger.info('Random image selected', { id: selectedImage.id, photographer: selectedImage.photographer });

    return selectedImage;
}

export { logger };
