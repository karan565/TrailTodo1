// frontend/src/App.js
import React, { useEffect, useState } from "react";
import { Amplify } from 'aws-amplify';
import awsExports from "./aws-exports";
import { getCurrentUser, fetchUserAttributes, signOut } from 'aws-amplify/auth';
import './index.css';
import Login from "./components/Login";
import Todos from "./components/Todos";
import LogoutButton from './components/LogoutButton';



// import amplifyConfig from './amplifyconfiguration.json'; // adjust the path as needed

//Amplify.configure(amplifyConfig);

Amplify.configure(awsExports);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // new loading state

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setUser({ ...currentUser, attributes });
    } catch {
      setUser(null);
    } finally {
      setLoading(false); // done loading
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const handleLogout = async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-gray-600 text-xl">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={checkUser} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-600 via-gray-200 to-gray-600">
      <nav className="bg-gradient-to-r from-gray-700 via-gray-600 to-gray-800 bg-opacity-60 backdrop-blur-md text-white px-6 py-4 flex justify-between items-center shadow-md rounded-b-lg">
        <h1 className="text-2xl font-semibold">
          Welcome, {user?.attributes?.name || user?.attributes?.email?.split('@')[0] || 'User'} !!
        </h1>
        <div className="flex gap-4 items-center">
          <LogoutButton onLogout={handleLogout} />
        </div>
      </nav>
      <Todos />
    </div>
  );
}


export default App;
