// src/components/Login.jsx
import React, { useState } from 'react';
import { signIn } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';

function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const user = await signIn({ username: email, password });
            onLogin(user);
            navigate('/'); 
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

                <input
                    type="email"
                    placeholder="Email"
                    className="w-full mb-4 px-3 py-2 border rounded"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="w-full mb-4 px-3 py-2 border rounded"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-200"
                >
                    Login
                </button>

                {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
            </form>
        </div>
    );
}

export default Login;
