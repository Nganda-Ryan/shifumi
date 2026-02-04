"use client";

import { useGame } from "@/contexts/GameContext";
import { Player } from "@/types/GameState";
import { useState, useEffect } from "react";

// Liste des pays avec leurs drapeaux
const COUNTRIES = [
  { "code": "AF", "name": "Afghanistan", "flag": "🇦🇫" },
  { "code": "AL", "name": "Albania", "flag": "🇦🇱" },
  { "code": "DZ", "name": "Algeria", "flag": "🇩🇿" },
  { "code": "AD", "name": "Andorra", "flag": "🇦🇩" },
  { "code": "AO", "name": "Angola", "flag": "🇦🇴" },
  { "code": "AG", "name": "Antigua and Barbuda", "flag": "🇦🇬" },
  { "code": "AR", "name": "Argentina", "flag": "🇦🇷" },
  { "code": "AM", "name": "Armenia", "flag": "🇦🇲" },
  { "code": "AU", "name": "Australia", "flag": "🇦🇺" },
  { "code": "AT", "name": "Austria", "flag": "🇦🇹" },
  { "code": "AZ", "name": "Azerbaijan", "flag": "🇦🇿" },

  { "code": "BS", "name": "Bahamas", "flag": "🇧🇸" },
  { "code": "BH", "name": "Bahrain", "flag": "🇧🇭" },
  { "code": "BD", "name": "Bangladesh", "flag": "🇧🇩" },
  { "code": "BB", "name": "Barbados", "flag": "🇧🇧" },
  { "code": "BY", "name": "Belarus", "flag": "🇧🇾" },
  { "code": "BE", "name": "Belgium", "flag": "🇧🇪" },
  { "code": "BZ", "name": "Belize", "flag": "🇧🇿" },
  { "code": "BJ", "name": "Benin", "flag": "🇧🇯" },
  { "code": "BT", "name": "Bhutan", "flag": "🇧🇹" },
  { "code": "BO", "name": "Bolivia", "flag": "🇧🇴" },
  { "code": "BA", "name": "Bosnia and Herzegovina", "flag": "🇧🇦" },
  { "code": "BW", "name": "Botswana", "flag": "🇧🇼" },
  { "code": "BR", "name": "Brazil", "flag": "🇧🇷" },
  { "code": "BN", "name": "Brunei", "flag": "🇧🇳" },
  { "code": "BG", "name": "Bulgaria", "flag": "🇧🇬" },
  { "code": "BF", "name": "Burkina Faso", "flag": "🇧🇫" },
  { "code": "BI", "name": "Burundi", "flag": "🇧🇮" },

  { "code": "KH", "name": "Cambodia", "flag": "🇰🇭" },
  { "code": "CM", "name": "Cameroon", "flag": "🇨🇲" },
  { "code": "CA", "name": "Canada", "flag": "🇨🇦" },
  { "code": "CV", "name": "Cape Verde", "flag": "🇨🇻" },
  { "code": "CF", "name": "Central African Republic", "flag": "🇨🇫" },
  { "code": "TD", "name": "Chad", "flag": "🇹🇩" },
  { "code": "CL", "name": "Chile", "flag": "🇨🇱" },
  { "code": "CN", "name": "China", "flag": "🇨🇳" },
  { "code": "CO", "name": "Colombia", "flag": "🇨🇴" },
  { "code": "KM", "name": "Comoros", "flag": "🇰🇲" },
  { "code": "CG", "name": "Congo", "flag": "🇨🇬" },
  { "code": "CD", "name": "DR Congo", "flag": "🇨🇩" },
  { "code": "CR", "name": "Costa Rica", "flag": "🇨🇷" },
  { "code": "CI", "name": "Ivory Coast", "flag": "🇨🇮" },
  { "code": "HR", "name": "Croatia", "flag": "🇭🇷" },
  { "code": "CU", "name": "Cuba", "flag": "🇨🇺" },
  { "code": "CY", "name": "Cyprus", "flag": "🇨🇾" },
  { "code": "CZ", "name": "Czech Republic", "flag": "🇨🇿" },

  { "code": "DK", "name": "Denmark", "flag": "🇩🇰" },
  { "code": "DJ", "name": "Djibouti", "flag": "🇩🇯" },
  { "code": "DO", "name": "Dominican Republic", "flag": "🇩🇴" },

  { "code": "EC", "name": "Ecuador", "flag": "🇪🇨" },
  { "code": "EG", "name": "Egypt", "flag": "🇪🇬" },
  { "code": "SV", "name": "El Salvador", "flag": "🇸🇻" },
  { "code": "GQ", "name": "Equatorial Guinea", "flag": "🇬🇶" },
  { "code": "ER", "name": "Eritrea", "flag": "🇪🇷" },
  { "code": "EE", "name": "Estonia", "flag": "🇪🇪" },
  { "code": "ET", "name": "Ethiopia", "flag": "🇪🇹" },

  { "code": "FI", "name": "Finland", "flag": "🇫🇮" },
  { "code": "FR", "name": "France", "flag": "🇫🇷" },

  { "code": "GA", "name": "Gabon", "flag": "🇬🇦" },
  { "code": "GM", "name": "Gambia", "flag": "🇬🇲" },
  { "code": "GE", "name": "Georgia", "flag": "🇬🇪" },
  { "code": "DE", "name": "Germany", "flag": "🇩🇪" },
  { "code": "GH", "name": "Ghana", "flag": "🇬🇭" },
  { "code": "GR", "name": "Greece", "flag": "🇬🇷" },
  { "code": "GT", "name": "Guatemala", "flag": "🇬🇹" },
  { "code": "GN", "name": "Guinea", "flag": "🇬🇳" },
  { "code": "GW", "name": "Guinea-Bissau", "flag": "🇬🇼" },
  { "code": "GY", "name": "Guyana", "flag": "🇬🇾" },

  { "code": "HT", "name": "Haiti", "flag": "🇭🇹" },
  { "code": "HN", "name": "Honduras", "flag": "🇭🇳" },
  { "code": "HU", "name": "Hungary", "flag": "🇭🇺" },

  { "code": "IS", "name": "Iceland", "flag": "🇮🇸" },
  { "code": "IN", "name": "India", "flag": "🇮🇳" },
  { "code": "ID", "name": "Indonesia", "flag": "🇮🇩" },
  { "code": "IR", "name": "Iran", "flag": "🇮🇷" },
  { "code": "IQ", "name": "Iraq", "flag": "🇮🇶" },
  { "code": "IE", "name": "Ireland", "flag": "🇮🇪" },
  { "code": "IL", "name": "Israel", "flag": "🇮🇱" },
  { "code": "IT", "name": "Italy", "flag": "🇮🇹" },

  { "code": "JP", "name": "Japan", "flag": "🇯🇵" },
  { "code": "JO", "name": "Jordan", "flag": "🇯🇴" },

  { "code": "KE", "name": "Kenya", "flag": "🇰🇪" },
  { "code": "KR", "name": "South Korea", "flag": "🇰🇷" },
  { "code": "KW", "name": "Kuwait", "flag": "🇰🇼" },

  { "code": "LB", "name": "Lebanon", "flag": "🇱🇧" },
  { "code": "LR", "name": "Liberia", "flag": "🇱🇷" },
  { "code": "LY", "name": "Libya", "flag": "🇱🇾" },
  { "code": "LT", "name": "Lithuania", "flag": "🇱🇹" },
  { "code": "LU", "name": "Luxembourg", "flag": "🇱🇺" },

  { "code": "MG", "name": "Madagascar", "flag": "🇲🇬" },
  { "code": "MW", "name": "Malawi", "flag": "🇲🇼" },
  { "code": "MY", "name": "Malaysia", "flag": "🇲🇾" },
  { "code": "ML", "name": "Mali", "flag": "🇲🇱" },
  { "code": "MA", "name": "Morocco", "flag": "🇲🇦" },
  { "code": "MX", "name": "Mexico", "flag": "🇲🇽" },

  { "code": "NE", "name": "Niger", "flag": "🇳🇪" },
  { "code": "NG", "name": "Nigeria", "flag": "🇳🇬" },
  { "code": "NO", "name": "Norway", "flag": "🇳🇴" },

  { "code": "OM", "name": "Oman", "flag": "🇴🇲" },

  { "code": "PK", "name": "Pakistan", "flag": "🇵🇰" },
  { "code": "PA", "name": "Panama", "flag": "🇵🇦" },
  { "code": "PE", "name": "Peru", "flag": "🇵🇪" },
  { "code": "PH", "name": "Philippines", "flag": "🇵🇭" },
  { "code": "PL", "name": "Poland", "flag": "🇵🇱" },
  { "code": "PT", "name": "Portugal", "flag": "🇵🇹" },

  { "code": "QA", "name": "Qatar", "flag": "🇶🇦" },

  { "code": "RO", "name": "Romania", "flag": "🇷🇴" },
  { "code": "RU", "name": "Russia", "flag": "🇷🇺" },
  { "code": "RW", "name": "Rwanda", "flag": "🇷🇼" },

  { "code": "SA", "name": "Saudi Arabia", "flag": "🇸🇦" },
  { "code": "SN", "name": "Senegal", "flag": "🇸🇳" },
  { "code": "RS", "name": "Serbia", "flag": "🇷🇸" },
  { "code": "SG", "name": "Singapore", "flag": "🇸🇬" },
  { "code": "SK", "name": "Slovakia", "flag": "🇸🇰" },
  { "code": "SI", "name": "Slovenia", "flag": "🇸🇮" },
  { "code": "ZA", "name": "South Africa", "flag": "🇿🇦" },
  { "code": "ES", "name": "Spain", "flag": "🇪🇸" },
  { "code": "LK", "name": "Sri Lanka", "flag": "🇱🇰" },
  { "code": "SE", "name": "Sweden", "flag": "🇸🇪" },
  { "code": "CH", "name": "Switzerland", "flag": "🇨🇭" },

  { "code": "TN", "name": "Tunisia", "flag": "🇹🇳" },
  { "code": "TR", "name": "Turkey", "flag": "🇹🇷" },

  { "code": "UA", "name": "Ukraine", "flag": "🇺🇦" },
  { "code": "AE", "name": "United Arab Emirates", "flag": "🇦🇪" },
  { "code": "GB", "name": "United Kingdom", "flag": "🇬🇧" },
  { "code": "US", "name": "United States", "flag": "🇺🇸" },
  { "code": "UY", "name": "Uruguay", "flag": "🇺🇾" },

  { "code": "VE", "name": "Venezuela", "flag": "🇻🇪" },
  { "code": "VN", "name": "Vietnam", "flag": "🇻🇳" },

  { "code": "ZM", "name": "Zambia", "flag": "🇿🇲" },
  { "code": "ZW", "name": "Zimbabwe", "flag": "🇿🇼" },

  { "code": "OTHER", "name": "Other", "flag": "🌍" }
]


export default function Lobby() {
  const { players, playerId, invitePlayer, isConnected, updateUsername } = useGame();

  const [username, setUsername] = useState("");
  const [nationality, setNationality] = useState("");
  const [isProfileSet, setIsProfileSet] = useState(false);

  // Charger le profil depuis localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem("shifumi_username");
    const savedNationality = localStorage.getItem("shifumi_nationality");

    if (savedUsername) {
      setUsername(savedUsername);
      setIsProfileSet(true);
    }
    if (savedNationality) {
      setNationality(savedNationality);
    }
  }, []);

  const availablePlayers = players.filter(
    (player) => player.id !== playerId && player.status === "available"
  );

  const handleInvite = (targetPlayerId: string) => {
    invitePlayer(targetPlayerId);
  };

  const handleSaveProfile = () => {
    if (username.trim().length < 2) return;

    const displayName = nationality
      ? `${username} ${COUNTRIES.find(c => c.code === nationality)?.flag || ""}`
      : username;

    localStorage.setItem("shifumi_username", username);
    localStorage.setItem("shifumi_nationality", nationality);
    localStorage.setItem("shifumi_displayname", displayName);
    setIsProfileSet(true);

    // Mettre à jour le nom sur le serveur
    updateUsername(displayName);
  };

  const handleEditProfile = () => {
    setIsProfileSet(false);
  };

  const selectedCountry = COUNTRIES.find(c => c.code === nationality);

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto p-4 bg-black/40 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-200">Connecting to server...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Profile Section */}
      <div className="p-6 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
        <h2 className="text-xl font-bold mb-4">Your Profile</h2>

        {!isProfileSet ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm text-gray-400 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="nationality" className="block text-sm text-gray-400 mb-1">
                Nationality
              </label>
              <select
                id="nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select your country...</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={username.trim().length < 2}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Save Profile
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{selectedCountry?.flag || "🎮"}</div>
              <div>
                <p className="font-semibold text-lg">{username}</p>
                <p className="text-sm text-gray-400">{selectedCountry?.name || "Unknown"}</p>
              </div>
            </div>
            <button
              onClick={handleEditProfile}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Players List */}
      <div className="p-6 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
        <h2 className="text-xl font-bold mb-4">Available Players</h2>
        {availablePlayers.length === 0 ? (
          <p className="text-gray-400">No other players available at the moment.</p>
        ) : (
          <ul className="space-y-2">
            {availablePlayers.map((player: Player) => (
              <li
                key={player.id}
                className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <div>
                  <span className="font-semibold">
                    {player.username || `Player ${player.id.slice(0, 8)}`}
                  </span>
                  <span className="ml-2 text-sm text-green-400">
                    (online)
                  </span>
                </div>
                <button
                  onClick={() => handleInvite(player.id)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Invite
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
