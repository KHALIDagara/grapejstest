'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData) {
    const email = formData.get('email')
    const password = formData.get('password')
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function signupAction(formData) {
    const email = formData.get('email')
    const password = formData.get('password')

    console.log('[SignupAction] Attempting signup for:', email);
    console.log('[SignupAction] Env check - URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            // If you want to force no email confirmation (only works if enabled in Supabase settings)
            // data: { ... } 
        }
    })

    console.log('[SignupAction] Supabase Response Data:', JSON.stringify(data, null, 2));
    console.log('[SignupAction] Supabase Response Error:', error);

    if (error) {
        console.error('[SignupAction] Error:', error.message);

        // Specific handling for the "Error sending confirmation email" which causes a 500
        if (error.message?.includes('Error sending confirmation email') || (error.code === 'unexpected_failure' && error.status === 500)) {
            return { error: 'Signup Failed: The server tried to send a confirmation email but failed. Please DISABLE "Confirm Email" in your Supabase Auth Settings to fix this.' }
        }

        return { error: error.message }
    }

    if (data?.user && !data?.session) {
        console.log('[SignupAction] User created but no session. Email confirmation likely required.');
        // We can return a specific message
        // return { success: true, message: 'Check your email' }
    }

    return { success: true }
}

export async function savePageAction(pageId, pageData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('pages')
        .upsert({
            id: pageId,
            user_id: user.id,
            name: pageData.name || 'Untitled',
            content: pageData.content || {},
            theme: pageData.theme || {},
            messages: pageData.messages || [],
            html: pageData.html || '',
            css: pageData.css || '',
            rendered_pages: pageData.rendered_pages || [],
            updated_at: new Date().toISOString()
        })
        .select()

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}


export async function loadPageAction(pageId) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return { data: null } // Not found
        return { error: error.message }
    }
    return { data }
}

export async function getUserPagesAction() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[getUserPagesAction] No user found');
        return []
    }

    const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('Error fetching pages:', error)
        return []
    }

    console.log(`[getUserPagesAction] Found ${data.length} pages for user ${user.id}`);
    return data
}

export async function getUserAction() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { user: null }
    return { user }
}

export async function getTemplatesAction(options = {}) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    let query = supabase
        .from('templates')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

    // Filter by category if provided
    if (options.category) {
        query = query.eq('category', options.category)
    }

    // Filter by tags if provided (contains any of the tags)
    if (options.tags && Array.isArray(options.tags)) {
        query = query.overlaps('tags', options.tags)
    }

    // Apply limit if provided, default to 20
    const limit = options.limit || 20
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
        console.error('[getTemplatesAction] Error:', error)
        return { data: null, error: error.message }
    }

    return { data, error: null }
}

export async function searchTemplatesAction(query) {
    if (!query || query.trim() === '') {
        return { data: null, error: 'Query is required' }
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Use ILIKE for case-insensitive fuzzy search on name and description
    // The % wildcards allow matching anywhere in the string
    const searchPattern = `%${query}%`

    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .order('updated_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('[searchTemplatesAction] Error:', error)
        return { data: null, error: error.message }
    }

    return { data: data || [], error: null }
}
