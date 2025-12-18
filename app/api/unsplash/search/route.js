import { NextResponse } from 'next/server';
import { searchPhotos, getRandomImage, logger } from '../../../../services/unsplashService';

/**
 * POST /api/unsplash/search
 * 
 * Search for images on Unsplash
 * 
 * Request body:
 * {
 *   query: string (required) - Search keywords
 *   color?: string - Filter by color
 *   orientation?: string - Filter by orientation
 *   perPage?: number - Results per page (1-30)
 *   page?: number - Page number
 *   random?: boolean - Return single random result
 * }
 */
export async function POST(req) {
    logger.info('Received search request');

    try {
        const body = await req.json();
        const { query, color, orientation, perPage, page, random } = body;

        logger.debug('Request body', { query, color, orientation, perPage, page, random });

        const accessKey = process.env.UNSPLASH_ACCESS_KEY;

        if (!accessKey) {
            logger.error('UNSPLASH_ACCESS_KEY not configured');
            return NextResponse.json(
                { error: 'Unsplash API not configured. Add UNSPLASH_ACCESS_KEY to environment.' },
                { status: 500 }
            );
        }

        const options = {};
        if (color) options.color = color;
        if (orientation) options.orientation = orientation;
        if (perPage) options.perPage = perPage;
        if (page) options.page = page;

        let result;

        if (random) {
            // Get single random image
            const image = await getRandomImage(query, options, accessKey);
            result = { image };
        } else {
            // Get full search results
            result = await searchPhotos(query, options, accessKey);
        }

        logger.info('Search request completed successfully');
        return NextResponse.json(result);

    } catch (error) {
        logger.error('Search request failed', error.message);
        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }
}
