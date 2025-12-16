'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction, signupAction } from '../actions'

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)

        try {
            const action = isSignUp ? signupAction : loginAction;
            const result = await action(formData);

            if (result && result.error) {
                setError(result.error);
            } else {
                // Success
                router.push('/');
                router.refresh();
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-container">
            <style jsx>{`
        .login-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #f5f5f5;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .login-box {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
            color: #333;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #666;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box; /* Critical for padding */
        }
        input:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        button[type="submit"] {
            width: 100%;
            padding: 12px;
            background-color: #2563eb;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        button[type="submit"]:hover {
            background-color: #1d4ed8;
        }
        button[type="submit"]:disabled {
            background-color: #93c5fd;
            cursor: not-allowed;
        }
        .error-message {
            background-color: #fee2e2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .toggle-text {
            text-align: center;
            margin-top: 20px;
            font-size: 14px;
            color: #666;
        }
        .toggle-btn {
            background: none;
            border: none;
            color: #2563eb;
            font-weight: 500;
            cursor: pointer;
            padding: 0;
            margin-left: 5px;
        }
        .toggle-btn:hover {
            text-decoration: underline;
        }
      `}</style>

            <div className="login-box">
                <h1 className="title">
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h1>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <div className="toggle-text">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button
                        type="button" // Important: type button so it doesn't submit
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="toggle-btn"
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    )
}
