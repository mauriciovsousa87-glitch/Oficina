import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, maxWidth = 'max-w-xl' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} transform transition-all scale-100 relative my-8`}>
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 bg-white/50 rounded-full p-1 transition-colors"
        >
            <FaTimes size={20} />
        </button>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;