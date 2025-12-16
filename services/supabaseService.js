
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export const supabaseService = {
    async savePage(pageId, pageData) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            console.warn("Save attempted with no user logged in")
            return null
        }

        const { error } = await supabase
            .from('pages')
            .upsert({
                id: pageId,
                user_id: user.id,
                name: pageData.name || 'Untitled',
                content: pageData.content || {}, // Editor HTML/CSS components
                theme: pageData.theme || {},
                messages: pageData.messages || [],
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Error saving page:', error)
            throw error
        }
        return true
    },

    async loadPage(pageId) {
        const { data, error } = await supabase
            .from('pages')
            .select('*')
            .eq('id', pageId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // Not found
            console.error('Error loading page:', error)
            return null
        }
        return data
    },

    async getUserPages() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('pages')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Error getting pages:', error)
            return []
        }
        return data
    }
}
