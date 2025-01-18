//import { ReactNode, StrictMode } from 'react'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {BrowserRouter,Routes,Route} from 'react-router-dom';
import HomePage from "./pages/homepage";
import AdminPage from "./pages/adminpage";
import "./assets/styles.css";
import "./assets/oneko.js";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <BrowserRouter>
   <Routes>
     <Route path="/" element={<HomePage/>}/>
     <Route path="/admin" element={<AdminPage/>}/>
   </Routes>
  </BrowserRouter>
  </StrictMode>,
);
