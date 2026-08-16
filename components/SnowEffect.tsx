"use client";

import { useEffect } from "react";

export default function SnowEffect() {
  useEffect(() => {
    const snowContainer = document.createElement("div");
    snowContainer.className = "snow-container";
    document.body.appendChild(snowContainer);
    const createSnowflake = () => {
      const snowflake = document.createElement("div");
      snowflake.className = "snowflake";
      snowflake.innerHTML = "❄";
      snowflake.style.left = Math.random() * window.innerWidth + "px";
      snowflake.style.animationDuration = 3 + Math.random() * 5 + "s";
      snowflake.style.opacity = Math.random().toString();
      snowflake.style.fontSize = 10 + Math.random() * 20 + "px";
      snowContainer.appendChild(snowflake);
      setTimeout(() => {
        snowflake.remove();
      }, 8000);
    };
    const interval = setInterval(createSnowflake, 200);
    return () => {
      clearInterval(interval);
      snowContainer.remove();
    };
  }, []);
  return null;
}
