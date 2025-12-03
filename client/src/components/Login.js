import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Login.css';

const Login = ({ onLogin, loading, setLoading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Fetch users from API
    axios.get('/api/users/info')
      .then(res => {
        setUsers(res.data);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/login', { username, password });
      if (response.data.success) {
        onLogin(username);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Chat App</h1>
        <p className="login-subtitle">Sign in to continue</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            >
              <option value="">Select user</option>
              {users.map(user => (
                <option key={user.username} value={user.username}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

