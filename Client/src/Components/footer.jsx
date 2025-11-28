import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaInstagram, FaLinkedin, FaGlobe } from 'react-icons/fa';

const Footer = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <footer className="bg-[#04000D] text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
                <h2 className="text-2xl font-bold mb-2">Classroom Management System</h2>
                <p className="text-sm">&copy; {new Date().getFullYear()} Classroom Management System. All rights reserved.</p>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;