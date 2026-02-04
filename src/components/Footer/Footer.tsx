"use client";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-4 px-6 border-t border-white/10 bg-black/30">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400">
        <p>
          Made with passion by <span className="text-white font-semibold">Steve</span>
        </p>
        <p>&copy; {currentYear} Shi-Fu-Mi. All rights reserved.</p>
      </div>
    </footer>
  );
}
