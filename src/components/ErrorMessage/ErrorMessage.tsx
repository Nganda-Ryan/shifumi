"use client";

import { useEffect, useState } from "react";

interface ErrorMessageProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function ErrorMessage({ message, onClose, duration = 3000 }: ErrorMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-black/80 border border-red-500/50 rounded-lg shadow-lg transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="text-red-400 font-semibold">{message}</p>
    </div>
  );
}
