import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./CountDown.module.css";
import { Bungee_Shade } from "next/font/google"

const bungeeShade = Bungee_Shade({weight: '400', subsets: ["latin"]})

interface props {
  onCountdownEnd: () => void;
  startFrom: number;
  getTime: (num: number) => void;
}

const CountDown = ({ getTime, onCountdownEnd, startFrom }: props) => {
  const [counter, setCounter] = useState<number>(startFrom);
  const hasEndedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mémoriser les callbacks pour éviter les re-renders
  const onCountdownEndRef = useRef(onCountdownEnd);
  const getTimeRef = useRef(getTime);

  useEffect(() => {
    onCountdownEndRef.current = onCountdownEnd;
    getTimeRef.current = getTime;
  }, [onCountdownEnd, getTime]);

  const getMessage = useCallback((index: number) => {
    if (index === 3) return "SHI🪨";
    if (index === 2) return "FU📜";
    if (index === 1) return "MI✂️";
    return "";
  }, []);

  // Reset quand startFrom change (nouveau round)
  useEffect(() => {
    setCounter(startFrom);
    hasEndedRef.current = false;
  }, [startFrom]);

  // Timer principal - utilise setTimeout au lieu de setInterval
  useEffect(() => {
    // Notifier le temps actuel
    getTimeRef.current(counter);

    // Si le countdown est terminé
    if (counter <= 0 && !hasEndedRef.current) {
      hasEndedRef.current = true;
      onCountdownEndRef.current();
      return;
    }

    // Programmer le prochain tick
    if (counter > 0) {
      timerRef.current = setTimeout(() => {
        setCounter(prev => prev - 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [counter]); // Seulement counter comme dépendance

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (counter <= 0) return null;

  return (
    <h1 className={`z-20 ${styles.countdown} ${bungeeShade.className}`}>
      {getMessage(counter)}
    </h1>
  );
};

export default CountDown;
