import { useEffect, useRef } from 'react';

/**
 * WaveformVisualizer — Canvas-based animated audio waveform.
 * Uses AnalyserNode frequency data for real-time visualization.
 */
export default function WaveformVisualizer({ analyser, isRecording }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Resize canvas for HiDPI
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();

      ctx.clearRect(0, 0, width, height);

      if (!analyser || !isRecording) {
        // Draw idle state — a flat line with gentle wave
        drawIdleWave(ctx, width, height);
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Get frequency data
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Draw bars
      const barCount = 64;
      const barGap = 3;
      const totalBarWidth = width / barCount;
      const barWidth = totalBarWidth - barGap;
      const maxBarHeight = height * 0.85;

      for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency data
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex] / 255;
        const barHeight = Math.max(3, value * maxBarHeight);

        const x = i * totalBarWidth + barGap / 2;
        const y = (height - barHeight) / 2;

        // Gradient from accent to accent-dim
        const alpha = 0.4 + value * 0.6;
        const hue = 38 + (i / barCount) * 10; // slight hue shift
        ctx.fillStyle = `hsla(${hue}, 90%, 55%, ${alpha})`;

        // Rounded bars
        const radius = Math.min(barWidth / 2, 4);
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isRecording]);

  return (
    <div className="waveform-container">
      <canvas ref={canvasRef} className="waveform-canvas" />
    </div>
  );
}

/**
 * Draw a gentle idle wave animation.
 */
function drawIdleWave(ctx, width, height) {
  const time = Date.now() / 1000;
  const centerY = height / 2;

  ctx.beginPath();
  ctx.moveTo(0, centerY);

  for (let x = 0; x <= width; x += 2) {
    const progress = x / width;
    const amplitude = 4 + Math.sin(time * 0.5) * 2;
    const y = centerY + Math.sin(progress * Math.PI * 4 + time * 2) * amplitude;
    ctx.lineTo(x, y);
  }

  ctx.strokeStyle = 'rgba(245, 166, 35, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
}
