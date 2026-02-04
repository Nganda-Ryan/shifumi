import React, { useEffect, useState } from "react";
import "./style.css";

function useDelayUnmount(isMounted: boolean, delayTime: number): boolean {
    const [showDiv, setShowDiv] = useState<boolean>(false);
    
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (isMounted && !showDiv) {
            setShowDiv(true);
        } else if (!isMounted && showDiv) {
            timeoutId = setTimeout(() => setShowDiv(false), delayTime);
        }
        return () => clearTimeout(timeoutId);
    }, [isMounted, delayTime, showDiv]);
    
    return showDiv;
}

// Déclaration des types pour les props
interface IndexProps {
    children: React.ReactNode; // enfants du composant
    isMounted: boolean; // état de montage
}

const ShowWithAnimation: React.FC<IndexProps> = ({ children, isMounted }) => {
    const showDiv = useDelayUnmount(isMounted, 450);
    const mountedStyle = { animation: "inAnimation 450ms ease-in" };
    const unmountedStyle = {
        animation: "outAnimation 470ms ease-out",
        animationFillMode: "forwards",
    };
    
    return (
        <div>
        {showDiv && (
            <div style={isMounted ? mountedStyle : unmountedStyle}>{children}</div>
        )}
        </div>
    );
};

export default ShowWithAnimation;
