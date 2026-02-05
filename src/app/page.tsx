/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import Card from "@/components/Card/Card";
import CountDown from "@/components/Counter/CountDown";
import Lobby from "@/components/Lobby/Lobby";
import InvitationModal from "@/components/Invitation/InvitationModal";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import InfoMessage from "@/components/InfoMessage/InfoMessage";
import Footer from "@/components/Footer/Footer";
import { useGame } from "@/contexts/GameContext";
import { Move } from "@/types/Move";
import { Result } from "@/types/Result";
import { useEffect, useState } from "react";
import thunder from "../../public/assets/images/thunder.png";
import Image from "next/image";

interface ResultStyle {
  user: string;
  userMsg: string;
  opponent: string;
  opponentMsg: string;
}

export default function Home() {
  const {
    currentGame,
    playerId,
    sendMove,
    startRound: startRoundOnServer,
    leaveGame,
    isConnected,
    error,
    roundResult: serverRoundResult,
    roundStarted,
    roundStartTimestamp,
    serverTimeOffset,
    readyTimestamp,
  } = useGame();

  const DEFAULT_MOVE: Move = "stone";

  const [userMove, setUserMove] = useState<Move>(DEFAULT_MOVE);
  const [opponentMove, setOpponentMove] = useState<Move>(null);
  const [roundResult, setRoundResult] = useState<Result>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultShown, setResultShown] = useState(false);
  const [syncedCountdown, setSyncedCountdown] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  const READY_DURATION = 900; // Must match the value in useFirebaseGame.ts

  // Update URL when game starts
  useEffect(() => {
    if (currentGame) {
      const url = new URL(window.location.href);
      url.searchParams.set("gameId", currentGame.id);
      window.history.replaceState({}, "", url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("gameId");
      window.history.replaceState({}, "", url.toString());
    }
  }, [currentGame?.id]);

  // Update round result from server
  useEffect(() => {
    if (serverRoundResult) {
      setRoundResult(serverRoundResult.yourResult as Result);
      setResultShown(true);

      if (currentGame && playerId) {
        const isPlayer1 = currentGame.player1.id === playerId;
        const opponentMoveValue = isPlayer1
          ? currentGame.moves.player2
          : currentGame.moves.player1;
        const myMoveValue = isPlayer1
          ? currentGame.moves.player1
          : currentGame.moves.player2;

        if (opponentMoveValue) {
          setOpponentMove(opponentMoveValue);
        }
        if (myMoveValue) {
          setUserMove(myMoveValue);
        }
      }

      const timer = setTimeout(() => {
        setResultShown(false);
        setOpponentMove(null);
        setRoundResult(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [serverRoundResult, currentGame, playerId]);

  // Synchronize "Ready?" phase based on server time
  useEffect(() => {
    if (!readyTimestamp) {
      setIsReady(false);
      return;
    }

    const updateReady = () => {
      const serverTime = Date.now() + serverTimeOffset;
      const elapsed = serverTime - readyTimestamp;
      const shouldShowReady = elapsed < READY_DURATION;
      setIsReady(shouldShowReady);
    };

    // Update immediately
    updateReady();

    // Update frequently for precise sync
    const interval = setInterval(updateReady, 50);

    return () => clearInterval(interval);
  }, [readyTimestamp, serverTimeOffset]);

  // Handle round started from server
  useEffect(() => {
    if (roundStarted && roundStartTimestamp) {
      setRoundResult(null);
      setOpponentMove(null);
      setResultShown(false);

      // Send default move initially (user can change it during countdown)
      if (currentGame) {
        sendMove(currentGame.id, userMove || DEFAULT_MOVE);
      }
    }
  }, [roundStarted, roundStartTimestamp, currentGame, userMove, sendMove]);

  // Synchronize countdown periodically during round (using corrected server time)
  useEffect(() => {
    if (!roundStarted || !roundStartTimestamp) {
      setSyncedCountdown(null); // Reset when not in countdown phase
      return;
    }

    const updateCountdown = () => {
      const serverTime = Date.now() + serverTimeOffset;
      const elapsed = serverTime - roundStartTimestamp;

      // Don't show countdown until server time reaches roundStartTimestamp
      // This ensures both players start the countdown at the same moment
      if (elapsed < 0) {
        setSyncedCountdown(null); // Still waiting for sync
        return;
      }

      const remaining = Math.max(0, Math.ceil((3000 - elapsed) / 1000));
      setSyncedCountdown(remaining);
    };

    // Update immediately
    updateCountdown();

    // Update every 50ms for precise synchronization
    const interval = setInterval(updateCountdown, 50);

    return () => clearInterval(interval);
  }, [roundStarted, roundStartTimestamp, serverTimeOffset]);

  // Handle error messages
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const playerOneImage = {
    scissors: <Card name="scissors" xside="left" customcss="left-0 scale-x-[-1]" />,
    stone: <Card name="stone" xside="left" customcss="left-0" />,
    paper: <Card name="paper" xside="left" customcss="left-0" />,
  };

  const playerTwoImage = {
    scissors: <Card name="scissors" xside="right" customcss="right-0" />,
    stone: <Card name="stone" xside="right" customcss="right-0 scale-x-[-1]" />,
    paper: <Card name="paper" xside="right" customcss="right-0 scale-x-[-1]" />,
  };

  useEffect(() => {
    if (currentGame && playerId && resultShown) {
      const isPlayer1 = currentGame.player1.id === playerId;
      const opponentMoveValue = isPlayer1
        ? currentGame.moves.player2
        : currentGame.moves.player1;

      if (opponentMoveValue && opponentMoveValue !== opponentMove) {
        setOpponentMove(opponentMoveValue);
      }

      const myMoveValue = isPlayer1
        ? currentGame.moves.player1
        : currentGame.moves.player2;
      if (myMoveValue && myMoveValue !== userMove) {
        setUserMove(myMoveValue);
      }
    }
  }, [currentGame, playerId, resultShown, opponentMove, userMove]);

  const handleStartRound = (): void => {
    if (!currentGame) return;

    setRoundResult(null);
    setOpponentMove(null);
    setResultShown(false);
    setUserMove(DEFAULT_MOVE);

    startRoundOnServer(currentGame.id);
  };

  const handleLeaveGame = (): void => {
    if (!currentGame) return;
    leaveGame(currentGame.id);
  };

  const getRoundStyle = (): ResultStyle => {
    if (!resultShown || !roundResult) {
      return { user: "", userMsg: "", opponent: "", opponentMsg: "" };
    }

    if (roundResult === "Win") {
      return {
        user: "bg-green-400",
        userMsg: "Winner!",
        opponent: "bg-red-500",
        opponentMsg: "Loser",
      };
    } else if (roundResult === "Loose") {
      return {
        opponent: "bg-green-400",
        opponentMsg: "Winner!",
        user: "bg-red-500",
        userMsg: "Loser!",
      };
    } else if (roundResult === "Draw") {
      return {
        user: "bg-white text-black",
        userMsg: "Draw",
        opponent: "bg-white text-black",
        opponentMsg: "Draw",
      };
    }
    return { user: "", userMsg: "", opponent: "", opponentMsg: "" };
  };

  const handlePlayerMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!currentGame || resultShown) return;

    const move: Move = event.currentTarget.dataset.move as Move;
    if (!move) return;

    // Update UI immediately
    setUserMove(move);

    // Allow multiple changes during countdown - send move if round is active
    if (roundStarted) {
      sendMove(currentGame.id, move);
    }
  };

  const handleCountEnd = () => {};

  // Show lobby if not in a game
  if (!currentGame) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 md:px-10 pt-6">
          {errorMessage && (
            <ErrorMessage message={errorMessage} onClose={() => setErrorMessage(null)} />
          )}
          {!isConnected && (
            <InfoMessage message="Connecting to server..." type="warning" />
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">
            Shi-Fu-Mi
          </h1>

          <Lobby />
          <InvitationModal />
        </div>
        <Footer />
      </div>
    );
  }

  if (!playerId) return null;

  const isPlayer1 = currentGame.player1.id === playerId;
  const opponent = isPlayer1 ? currentGame.player2 : currentGame.player1;
  const opponentName = opponent.username || `Player ${opponent.id.slice(0, 8)}`;
  const myScore = isPlayer1 ? currentGame.scores.player1 : currentGame.scores.player2;
  const opponentScore = isPlayer1 ? currentGame.scores.player2 : currentGame.scores.player1;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 md:px-10 pt-4">
        <InvitationModal />
        {errorMessage && (
          <ErrorMessage message={errorMessage} onClose={() => setErrorMessage(null)} />
        )}

        {/* Header with Game ID and Leave Button */}
        <div className="flex items-center justify-between mb-4 px-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Game:</span>
            <code className="text-xs bg-black/50 px-2 py-1 rounded font-mono text-gray-300">
              {currentGame.id.slice(0, 8)}
            </code>
          </div>
          <button
            onClick={handleLeaveGame}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Leave
          </button>
        </div>

        {/* Scores */}
        <div className="mb-6 flex justify-center items-center gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-400">You</p>
            <p className="text-3xl font-bold">{myScore}</p>
          </div>
          <div className="text-2xl font-bold">-</div>
          <div className="text-center">
            <p className="text-sm text-gray-400">{opponentName}</p>
            <p className="text-3xl font-bold">{opponentScore}</p>
          </div>
        </div>

        {/* Game Ring */}
        <div className="w-full flex justify-between h-80 sm:h-96 pt-2">
          <div className="w-1/3 flex items-center transition-all duration-200 relative">
            {userMove && playerOneImage[userMove]}
            <div
              className={`w-full absolute bottom-0 lg:text-3xl rounded flex items-center justify-center h-10 lg:h-20 lg:w-32 z-10 ${getRoundStyle().user}`}
            >
              {resultShown && roundResult && getRoundStyle().userMsg}
            </div>
          </div>

          <div className="w-1/4 flex justify-center items-center sm:w-28 md:w-36">
            <Image
              src={thunder}
              alt=""
              priority={true}
              className="w-10 h-auto sm:w-40 md:w-64 lg:w-80"
            />
          </div>

          <div
            className={`w-1/3 flex items-center transition-all duration-150 ease-in-out ${
              opponentMove && resultShown ? "opacity-100 scale-100" : "opacity-0 scale-90"
            }`}
          >
            {opponentMove && resultShown && playerTwoImage[opponentMove]}
            <div
              className={`lg:text-3xl w-full rounded absolute bottom-0 right-0 flex items-center justify-center h-10 lg:h-20 lg:w-32 z-10 ${getRoundStyle().opponent}`}
            >
              {resultShown && roundResult && getRoundStyle().opponentMsg}
            </div>
          </div>
        </div>

        {/* Move Buttons */}
        <div className="flex justify-center mt-28 sm:mt-20">
          <button
            data-move="stone"
            onClick={handlePlayerMove}
            disabled={resultShown}
            className="text-lg text-white bg-gradient-to-r from-stone-500 via-stone-600 to-stone-700 hover:bg-gradient-to-br focus:ring-2 focus:outline-none focus:ring-stone-200 shadow-lg shadow-stone-500/50 font-medium rounded-lg px-5 py-2 text-center me-2 mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Stone
          </button>
          <button
            data-move="paper"
            onClick={handlePlayerMove}
            disabled={resultShown}
            className="text-lg text-white bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:bg-gradient-to-br focus:ring-2 focus:outline-none focus:ring-orange-200 shadow-lg shadow-orange-500/50 font-medium rounded-lg px-5 py-2 text-center me-2 mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Paper
          </button>
          <button
            data-move="scissors"
            onClick={handlePlayerMove}
            disabled={resultShown}
            className="text-lg text-white bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 hover:bg-gradient-to-br focus:ring-2 focus:outline-none focus:ring-blue-100 shadow-lg shadow-blue-400/50 font-medium rounded-lg px-5 py-2 text-center me-2 mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Scissors
          </button>
        </div>

        {/* Start Round Button */}
        {!roundStarted && !resultShown && !isReady && currentGame.player1.id === playerId && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleStartRound}
              className="px-8 py-3 text-xl text-gray-900 bg-gradient-to-r from-teal-200 to-lime-200 hover:bg-gradient-to-l hover:from-teal-200 hover:to-lime-200 focus:ring-2 focus:outline-none focus:ring-lime-100 font-bold rounded-lg"
            >
              Start Round
            </button>
          </div>
        )}

        {/* Waiting message for player2 */}
        {!roundStarted && !resultShown && !isReady && currentGame.player1.id !== playerId && (
          <div className="flex justify-center mt-6">
            <p className="text-gray-400">Waiting for opponent to start the round...</p>
          </div>
        )}

        {/* Ready? Phase - show until countdown actually starts */}
        {(isReady || (roundStarted && syncedCountdown === null)) && currentGame && (
          <div className="flex justify-center mt-6">
            <div className="text-4xl md:text-6xl font-bold text-yellow-400 animate-pulse">
              Ready?
            </div>
          </div>
        )}

        {/* SHI FU MI Countdown */}
        {roundStarted && currentGame && roundStartTimestamp && !isReady && syncedCountdown !== null && (
          <CountDown
            key={`countdown-${currentGame.id}-${currentGame.currentRound}-${roundStartTimestamp}`}
            startFrom={syncedCountdown}
            onCountdownEnd={handleCountEnd}
            getTime={() => {}}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}
