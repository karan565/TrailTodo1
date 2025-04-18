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
  const [greeting, setGreeting] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'completed' | 'remaining'


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

  const cycleFilter = () => {
    if (filterType === 'all') setFilterType('completed');
    else if (filterType === 'completed') setFilterType('remaining');
    else setFilterType('all');
  };


  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const getISTGreeting = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istOffset = 5.5 * 60 * 60000;
      const istTime = new Date(utc + istOffset);
      const hour = istTime.getHours();

      if (hour >= 5 && hour < 12) return "Good morning";
      else if (hour >= 12 && hour < 17) return "Good afternoon";
      else return "Good evening";
    };

    setGreeting(getISTGreeting());
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
        <h1 className="text-2xl font-semibold mr-3">
          {greeting}, {user?.attributes?.name || user?.attributes?.email?.split('@')[0] || 'User'} !
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search todos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2 py-1 rounded text-black bg-white w-full sm:w-auto"
          />

          <div className="background background--light w-full sm:w-auto flex justify-end sm:justify-normal">
            <button className="filterButton" onClick={cycleFilter}>
              <span className="button-text">
                {filterType === 'all' && 'All Todos'}
                {filterType === 'completed' && '✅ Completed'}
                {filterType === 'remaining' && '🔄 Incomplete'}
              </span>
            </button>
          </div>

          <div className="w-full sm:w-auto flex justify-end sm:justify-normal">
            <LogoutButton onLogout={handleLogout} />
          </div>
        </div>

      </nav>
      <Todos searchQuery={searchQuery} filterType={filterType} />

      <footer className=" bottom-0 left-0 w-full bg-gradient-to-r from-gray-700 via-gray-600 to-gray-800 bg-opacity-60 backdrop-blur-md text-white text-center py-3 text-base z-50">
        © 2025 Karan. All rights reserved. <br />
        Built with <span className="text-red-500">❤️</span> by <span className="font-semibold">Karan Vaghela</span>.
      </footer>

    </div>
  );
}


export default App;
