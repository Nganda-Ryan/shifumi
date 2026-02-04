"use client";

import { useGame } from "@/contexts/GameContext";
import { useEffect, useState } from "react";

export default function InvitationModal() {
  const { invitations, acceptInvitation, declineInvitation } = useGame();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (invitations.length > 0) {
      setIsOpen(true);
    }
  }, [invitations]);

  if (invitations.length === 0 || !isOpen) {
    return null;
  }

  const latestInvitation = invitations[invitations.length - 1];

  const handleAccept = () => {
    acceptInvitation(latestInvitation.id);
    setIsOpen(false);
  };

  const handleDecline = () => {
    declineInvitation(latestInvitation.id);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const inviterName =
    latestInvitation.from.username ||
    `Player ${latestInvitation.from.id.slice(0, 8)}`;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-center">Game Invitation</h2>
        <div className="text-center mb-6">
          <p className="text-3xl mb-2">{inviterName}</p>
          <p className="text-gray-400">wants to play with you!</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
          >
            Decline
          </button>
        </div>
        <button
          onClick={handleClose}
          className="mt-3 w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
