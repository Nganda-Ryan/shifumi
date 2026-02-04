"use client";

interface InfoMessageProps {
  message: string;
  type?: "info" | "warning" | "success";
}

export default function InfoMessage({ message, type = "info" }: InfoMessageProps) {
  const borderColor =
    type === "warning"
      ? "border-yellow-500/50"
      : type === "success"
      ? "border-green-500/50"
      : "border-blue-500/50";

  const textColor =
    type === "warning"
      ? "text-yellow-400"
      : type === "success"
      ? "text-green-400"
      : "text-blue-400";

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-black/80 border ${borderColor} rounded-lg shadow-lg`}>
      <p className={`font-semibold ${textColor}`}>{message}</p>
    </div>
  );
}
