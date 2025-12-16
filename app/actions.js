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
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
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
    if (!user) return []

    const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('Error fetching pages:', error)
        return []
    }

    return data
}

export async function getUserAction() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { user: null }
    return { user }
}
