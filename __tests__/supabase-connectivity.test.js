
/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Helper to load .env.local manually for testing
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envFile = fs.readFileSync(envPath, 'utf8');
            const env = {};
            envFile.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
                }
            });
            return env;
        }
    } catch (e) {
        console.error('Could not load .env.local', e);
    }
    return {};
}

describe('Supabase Real Connectivity', () => {
    let supabase;
    const email = `test-jest-${Date.now()}@example.com`;
    const password = 'password123';

    beforeAll(() => {
        const env = loadEnv();
        const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.error('Keys not found. URL:', url, 'Key:', key ? 'FOUND' : 'MISSING');
            throw new Error('Missing Supabase Environment Variables in Test (Checked .env.local)');
        }
        supabase = createClient(url, key);
    });

    it('should be able to sign up a new user', async () => {
        console.log(`Attempting signup for: ${email}`);

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            console.error('Signup Error:', error);
            if (error.status === 500 && error.code === 'unexpected_failure') {
                // Detect common SMTP failure
                throw new Error('FATAL: Supabase Backend Failed via 500 Error. Likely cause: SMTP/Email Confirmation not configured but enabled. DISABLE "Confirm Email" in Supabase Dashboard.');
            }
        }

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.user).toBeDefined();
    });
});
