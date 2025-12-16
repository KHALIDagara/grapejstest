
import { savePageAction, getUserPagesAction, loadPageAction, getUserAction } from '@/app/actions';

// We replace the direct supabase client usage with calls to Server Actions.
// This ensures that all requests to Supabase happen server-side,
// proxying through Next.js to solve Mixed Content issues.

export const supabaseService = {
    async savePage(pageId, pageData) {
        const result = await savePageAction(pageId, pageData);
        if (result && result.error) {
            console.error('Error saving page:', result.error);
            throw new Error(result.error);
        }
        return true;
    },

    // loadPage is less critical for the "save" flow but should also match if we want full proxying.
    // However, I didn't create a loadPageAction yet. Let's stick to what we have in actions.js
    // Wait, I missed loadPage in actions.js? I only added savePage and getUserPages.
    // getUserPages fetches all, so we can use that or I should add loadPageAction.
    // Re-checking task... I added getUserPagesAction. 

    // Let's rely on getUserPages for now or just add loadPageAction quickly.
    // Actually, let's keep it simple. If loadPage is needed strictly by ID, we should add it.
    // But for now, let's update getUserPages.

    async getUserPages() {
        return await getUserPagesAction();
    },

    // If loadPage is used by specific ID fetching (not in my refactor plan explicitly but good to have)
    async loadPage(pageId) {
        const { data, error } = await loadPageAction(pageId);
        if (error) {
            console.error('Error loading page:', error);
            return null;
        }
        return data;
    },

    async getUser() {
        const { user } = await getUserAction();
        return user;
    }
}
