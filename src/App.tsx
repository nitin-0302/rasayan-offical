/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BroadcastNotifier from './components/BroadcastNotifier';
import PriorityNotifier from './components/PriorityNotifier';
import Home from './pages/Home';
import Events from './pages/Events';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Quiz from './pages/Quiz';
import TreasureHunt from './pages/TreasureHunt';
import Games from './pages/Games';
import Community from './pages/Community';
import Chatbot from './components/Chatbot';
import CursorGlow from './components/CursorGlow';

export default function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <Router>
          <div className="flex flex-col min-h-screen relative">
            <CursorGlow />
            <Navbar />
            <BroadcastNotifier />
            <PriorityNotifier />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/games" element={<Games />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/treasure-hunt" element={<TreasureHunt />} />
                <Route path="/community" element={<Community />} />
              </Routes>
            </main>
            <Footer />
            <Chatbot />
          </div>
        </Router>
      </EventProvider>
    </AuthProvider>
  );
}
