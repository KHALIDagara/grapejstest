/**
 * Templates Gallery Service
 *
 * Service layer for fetching and searching public templates.
 * Wraps server actions with logging and error handling.
 */

import { getTemplatesAction, searchTemplatesAction } from '@/app/actions';

/**
 * Logger utility for consistent log formatting
 */
const logger = {
    info: (message, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 📚 [TemplatesService] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    error: (message, error = null) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ❌ [TemplatesService] ERROR: ${message}`, error || '');
    },
    debug: (message, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 🔍 [TemplatesService] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};

/**
 * Fetch templates from the public gallery
 *
 * @param {Object} options - Filter options
 * @param {string} options.category - Filter by category (optional)
 * @param {string[]} options.tags - Filter by tags (optional)
 * @param {number} options.limit - Maximum number of results (default: 20)
 * @returns {Promise<Array>} Array of template objects
 * @throws {Error} If fetch fails
 */
export async function getTemplates(options = {}) {
    logger.info('Fetching templates', options);

    try {
        const { data, error } = await getTemplatesAction(options);

        if (error) {
            logger.error('Failed to fetch templates', error);
            throw new Error(error);
        }

        if (!data) {
            logger.error('No data returned from getTemplatesAction', 'data is null or undefined');
            throw new Error('No data returned from getTemplatesAction');
        }

        logger.info('Templates fetched successfully', { count: data.length });
        return data;

    } catch (error) {
        logger.error('Exception during template fetch', error.message);
        throw error;
    }
}

/**
 * Search templates by name or description
 *
 * @param {string} query - Search query string
 * @returns {Promise<Array>} Array of matching template objects
 * @throws {Error} If query is invalid or search fails
 */
export async function searchTemplates(query) {
    // Validate query
    if (!query || typeof query !== 'string' || query.trim() === '') {
        logger.error('Invalid search query', { query });
        throw new Error('Search query is required and must be a non-empty string');
    }

    const trimmedQuery = query.trim();
    logger.info('Searching templates', { query: trimmedQuery });

    try {
        const { data, error } = await searchTemplatesAction(trimmedQuery);

        if (error) {
            logger.error('Search failed', error);
            throw new Error(error);
        }

        if (!data) {
            logger.error('No data returned from searchTemplatesAction', 'data is null or undefined');
            throw new Error('No data returned from searchTemplatesAction');
        }

        logger.info('Search completed', { count: data.length, query: trimmedQuery });
        return data;

    } catch (error) {
        logger.error('Exception during template search', error.message);
        throw error;
    }
}

export { logger };
