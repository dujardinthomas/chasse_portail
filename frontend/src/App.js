import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { quetes } from "./data-quetes";
import QueteDetail from "./QueteDetail";
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <h1>Chasse aux Quêtes</h1>
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h2>Liste des quêtes</h2>
                <ul>
                  {quetes.map((quete) => (
                    <li key={quete.id}>
                      <Link to={`/quete/${quete.id}`}>{quete.nom} - {quete.lieu}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            }
          />
          <Route path="/quete/:id" element={<QueteDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
