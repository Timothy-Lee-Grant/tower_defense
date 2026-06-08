// src/GameCanvas.jsx
import React, { useRef, useEffect } from 'react';

export default function GameCanvas() {
  const canvasRef = useRef(null);

  // 1. GAME OBJECT PROPERTIES (Using refs to hold high-speed animation numbers)
  // We define a player object with coordinates, radius, velocity, and color.
  const player = useRef({
    x: 100,
    y: 200,
    radius: 20,
    speedX: 3,  // How many pixels to move horizontally per frame
    speedY: 2,  // How many pixels to move vertically per frame
    color: '#007acc'
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // 2. THE GAME LOOP FUNCTION
    // This function loops infinitely, acting as the engine heartbeat.
    function gameLoop() {
      // --- STEP A: UPDATE MATH LOGIC ---
      const p = player.current;
      
      // Move the player object by adding velocity to its current position
      p.x += p.speedX;
      p.y += p.speedY;

      // COLLISION DETECTION: Wall bouncing logic
      // If the ball hits the right wall OR left wall, reverse horizontal speed
      if (p.x + p.radius > canvas.width || p.x - p.radius < 0) {
        p.speedX = -p.speedX; // Reverse direction
      }
      // If the ball hits the bottom wall OR top wall, reverse vertical speed
      if (p.y + p.radius > canvas.height || p.y - p.radius < 0) {
        p.speedY = -p.speedY; // Reverse direction
      }

      // --- STEP B: RENDER IMAGES TO THE SCREEN ---
      // Clear the entire canvas paper so old frames don't leave streaks
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Background Canvas Box
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the Player Object (The Circle)
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // --- STEP C: REQUEST NEXT FRAME ---
      // Tell the browser to run this gameLoop function again on the next monitor refresh
      animationFrameId = requestAnimationFrame(gameLoop);
    }

    // Start the game loop engine loop initialization
    gameLoop();

    // Cleanup function: Stops the loop instantly if the user leaves the page
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      style={{ border: '3px solid #333', borderRadius: '4px', display: 'block', margin: '20px auto' }}
    />
  );
}