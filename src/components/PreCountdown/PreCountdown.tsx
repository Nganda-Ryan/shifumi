import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./PreCountdown.module.css";
import { Bungee_Shade } from "next/font/google";

const bungeeShade = Bungee_Shade({ weight: "400", subsets: ["latin"] });

interface props {
  onPreCountdownEnd: () => void;
  startFrom: number;
}

const PreCountdown = ({ onPreCountdownEnd, startFrom }: props) => {
  const [counter, setCounter] = useState<number>(startFrom);
  const hasEndedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mémoriser le callback pour éviter les re-renders
  const onPreCountdownEndRef = useRef(onPreCountdownEnd);

  useEffect(() => {
    onPreCountdownEndRef.current = onPreCountdownEnd;
  }, [onPreCountdownEnd]);

  const getMessage = useCallback((index: number) => {
    if (index <= 0) return "";
    if (index > 4) return "";
    if (index === 4) return "Start in";
    return index.toString();
  }, []);

  // Reset quand startFrom change (nouveau round)
  useEffect(() => {
    setCounter(startFrom);
    hasEndedRef.current = false;
  }, [startFrom]);

  // Timer principal
  useEffect(() => {
    // Si le countdown est terminé
    if (counter <= 0 && !hasEndedRef.current) {
      hasEndedRef.current = true;
      onPreCountdownEndRef.current();
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

  if (counter <= 0) {
    return null;
  }

  const isNumberPhase = counter <= 3;

  return (
    <h1
      className={`z-20 ${styles.preCountdown} ${bungeeShade.className} ${isNumberPhase ? styles.numberPhase : ''}`}
    >
      {getMessage(counter)}
    </h1>
  );
};

export default PreCountdown;

