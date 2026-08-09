'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BootScreen } from '@/components/BootScreen';

export default function HomeLandingPage() {
  const [isBooting, setIsBooting] = useState(true);
  const logoRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const glassCardRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    document.body.classList.add('landing-page-active');

    // 1. Logo Letter Splitting
    const logoText = logoRef.current;
    if (logoText) {
      if (!logoText.dataset.rawText) {
        logoText.dataset.rawText = logoText.textContent?.trim() || '';
      }
      const text = logoText.dataset.rawText;
      logoText.innerHTML = '';
      [...text].forEach((char, index) => {
        const wrapper = document.createElement('span');
        wrapper.className = 'letter-wrapper';
        const inner = document.createElement('span');
        inner.textContent = char === ' ' ? '\u00A0' : char;
        inner.className = 'letter-inner';
        inner.style.animationDelay = `${index * 0.09}s`;
        wrapper.appendChild(inner);
        logoText.appendChild(wrapper);
      });
    }

    // 2. Title Word Splitting
    const heroTitle = titleRef.current;
    if (heroTitle) {
      if (!heroTitle.dataset.rawText) {
        heroTitle.dataset.rawText = heroTitle.innerHTML;
      }
      const text = heroTitle.dataset.rawText;
      heroTitle.innerHTML = '';

      let wordIndex = 0;
      const parts = text.split(/(\s+|<br\s*\/?>)/i);
      parts.forEach((part) => {
        if (part.trim() === '') {
          heroTitle.appendChild(document.createTextNode(' '));
        } else if (part.toLowerCase().startsWith('<br')) {
          heroTitle.appendChild(document.createElement('br'));
        } else {
          const wrapper = document.createElement('span');
          wrapper.className = 'word-wrapper';
          const inner = document.createElement('span');
          inner.className = 'word-inner';
          inner.textContent = part;
          inner.style.animationDelay = `${wordIndex * 0.1}s`;
          wordIndex++;
          wrapper.appendChild(inner);
          heroTitle.appendChild(wrapper);
        }
      });
    }

    // 3. Cursor & Plaquette Physics LERP
    const glassCard = glassCardRef.current;
    const cursorRing = cursorRingRef.current;
    const heroBtn = btnRef.current;

    if (glassCard && cursorRing) {
      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;
      let cardX = mouseX;
      let cardY = mouseY;
      let ringX = mouseX;
      let ringY = mouseY;

      let isFirstMove = true;
      let scale = 0;
      let targetScale = 0;
      let isHoveringBtn = false;

      const onMouseMove = (e: MouseEvent) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (isFirstMove) {
          cardX = mouseX;
          cardY = mouseY;
          ringX = mouseX;
          ringY = mouseY;
          isFirstMove = false;
          glassCard.classList.add('active');
          cursorRing.classList.add('active');
        }

        if (!isHoveringBtn) {
          targetScale = 1;
        }
      };

      const onMouseLeave = () => {
        targetScale = 0;
      };

      const onMouseEnter = () => {
        if (!isHoveringBtn) {
          targetScale = 1;
        }
      };

      const onBtnEnter = () => {
        isHoveringBtn = true;
        targetScale = 0;
        cursorRing.classList.add('expanded');
      };

      const onBtnLeave = () => {
        isHoveringBtn = false;
        targetScale = 1;
        cursorRing.classList.remove('expanded');
      };

      window.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseleave', onMouseLeave);
      document.addEventListener('mouseenter', onMouseEnter);

      if (heroBtn) {
        heroBtn.addEventListener('mouseenter', onBtnEnter);
        heroBtn.addEventListener('mouseleave', onBtnLeave);
      }

      let animId: number;
      const updatePhysics = () => {
        cardX += (mouseX - cardX) * 0.08;
        cardY += (mouseY - cardY) * 0.08;
        ringX = mouseX;
        ringY = mouseY;

        scale += (targetScale - scale) * 0.15;
        const currentRingScale = cursorRing.classList.contains('expanded') ? 1.6 * scale : scale;

        glassCard.style.transform = `translate3d(${cardX}px, ${cardY + 28}px, 0) translate(-50%, 0) scale(${scale})`;
        cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${currentRingScale})`;

        animId = requestAnimationFrame(updatePhysics);
      };

      updatePhysics();

      return () => {
        document.body.classList.remove('landing-page-active');
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', onMouseLeave);
        document.removeEventListener('mouseenter', onMouseEnter);
        if (heroBtn) {
          heroBtn.removeEventListener('mouseenter', onBtnEnter);
          heroBtn.removeEventListener('mouseleave', onBtnLeave);
        }
        cancelAnimationFrame(animId);
      };
    }
  }, [isBooting]);

  if (isBooting) {
    return <BootScreen title="SOLE_AGENT OPERATING SYSTEM v1.0.0" onComplete={() => setIsBooting(false)} />;
  }

  return (
    <div className="landing-page-body">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap');

        .landing-page-body {
          background-color: #000000 !important;
          color: #ffffff !important;
          min-height: 100vh;
          width: 100vw;
          overflow: hidden;
          position: fixed;
          inset: 0;
          z-index: 9999;
          font-family: 'Outfit', sans-serif;
        }

        #top-gradient-img {
          position: fixed;
          top: -30vh;
          left: 0;
          width: 100vw;
          height: auto;
          display: block;
          z-index: 10;
          pointer-events: none;
        }

        .landing-hero-content {
          position: relative;
          z-index: 12;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-top: 6vh;
          width: 95%;
          max-width: 1100px;
          margin: 0 auto;
        }

        .landing-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 2.8rem;
          font-weight: 400;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 2.2rem;
          letter-spacing: -0.015em;
          text-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }

        .landing-hero-btn {
          font-family: 'Outfit', sans-serif;
          font-size: 1.1rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: #ffffff;
          background-color: #000000;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 1.3rem 2.5rem;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          gap: 0.9rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 25px rgba(0, 0, 0, 0.4);
          outline: none;
        }
        .landing-hero-btn:hover {
          background-color: #ffffff;
          color: #000000;
          border-color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(0, 0, 0, 0.3);
        }
        .landing-hero-btn:active {
          transform: translateY(0);
        }

        .landing-blinking-dot {
          width: 10px;
          height: 10px;
          background-color: #39FF14;
          border-radius: 50%;
          position: relative;
          display: inline-block;
          animation: pulse-glow 2s infinite ease-in-out;
        }
        .landing-blinking-dot::after {
          content: '';
          position: absolute;
          top: -5px; left: -5px; right: -5px; bottom: -5px;
          background-color: rgba(57, 255, 20, 0.45);
          border-radius: 50%;
          animation: wave-expand 2s infinite ease-in-out;
        }
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(0.85);
            box-shadow: 0 0 4px rgba(57, 255, 20, 0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
            box-shadow: 0 0 12px rgba(57, 255, 20, 0.9);
          }
        }
        @keyframes wave-expand {
          0%   { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.3); opacity: 0; }
        }

        .landing-footer-container {
          position: fixed;
          top: 50vh;
          left: 20px;
          right: 20px;
          width: calc(100vw - 40px);
          transform: translateY(-50%);
          z-index: 13;
          display: flex;
          flex-direction: column;
          pointer-events: none;
        }
        .landing-footer-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          width: 100%;
          padding: 0 5px;
        }
        .landing-footer-title {
          font-family: 'General Sans', -apple-system, sans-serif;
          font-size: 1.4rem;
          font-weight: 400;
          color: #ffffff;
          letter-spacing: -0.015em;
          margin: 0;
        }
        .landing-footer-divider {
          border: none;
          height: 1px;
          background-color: rgba(255, 255, 255, 0.2);
          margin: 1.6rem 0;
          width: 100%;
        }
        .landing-footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 0 5px;
          pointer-events: auto;
        }
        .landing-footer-socials {
          display: flex;
          gap: 1.25rem;
          align-items: center;
          flex: 1;
        }
        .landing-footer-links {
          display: flex;
          gap: 2.8rem;
          justify-content: center;
          align-items: center;
          flex: 2;
        }
        .landing-footer-link {
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          font-weight: 400;
          color: #ffffff;
          text-decoration: none;
          letter-spacing: 0.03em;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .landing-footer-link:hover {
          opacity: 0.75;
          transform: translateY(-1px);
        }
        .landing-footer-copyright {
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.45);
          text-align: right;
          flex: 1;
          letter-spacing: 0.02em;
        }

        .landing-footer-logo-wrap {
          position: fixed;
          bottom: 50px;
          left: 0;
          right: 0;
          width: 100%;
          padding: 0 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 13;
          margin: 0;
        }
        .landing-footer-logo-text {
          font-family: 'General Sans', -apple-system, sans-serif;
          font-size: 21.9vw;
          font-weight: 400;
          color: #ffffff;
          letter-spacing: -0.03em;
          margin-right: -0.03em;
          transform: translateX(-20px);
          line-height: 0.8;
          margin-top: 0;
          margin-bottom: 0;
          margin-left: 0;
          text-align: center;
          width: 100%;
          pointer-events: none;
          opacity: 0.95;
          text-shadow: none;
          white-space: nowrap;
        }

        .landing-video-container {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100vw;
          height: 90vh;
          overflow: hidden;
          z-index: 9;
        }
        #landing-bg-video {
          width: 100%;
          height: 110%;
          object-fit: cover;
          display: block;
        }

        .landing-glass-cursor-card {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 99999;
          pointer-events: none;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 9999px;
          box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          will-change: transform, opacity;
          transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                      background 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .landing-glass-cursor-card.active { opacity: 1; }
        .landing-cursor-card-text {
          font-family: 'General Sans', -apple-system, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: #39FF14;
          text-transform: uppercase;
          white-space: nowrap;
          text-shadow: 0 0 8px rgba(57, 255, 20, 0.45);
        }
        .landing-cursor-card-text .text-white {
          color: #ffffff;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }
        .landing-cursor-ring-outline {
          display: none !important;
          position: fixed;
          top: 0;
          left: 0;
          width: 48px;
          height: 48px;
          border: 1.5px solid rgba(255, 255, 255, 0.45);
          border-radius: 50%;
          z-index: 99998;
          pointer-events: none;
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          will-change: transform, opacity;
          transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.4s ease;
        }
        .landing-cursor-ring-outline.active { opacity: 1; }
        .landing-cursor-ring-outline.expanded {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .landing-hero-title .word-wrapper {
          display: inline-block;
          overflow: hidden;
          vertical-align: bottom;
          padding-bottom: 0.15em;
          margin-bottom: -0.15em;
        }
        .landing-hero-title .word-inner {
          display: inline-block;
          opacity: 0;
          transform: translateY(105%);
          filter: blur(20px);
          animation: word-reveal-mask 1.3s cubic-bezier(0.05, 0.9, 0.1, 1) forwards;
        }
        @keyframes word-reveal-mask {
          0%   { opacity: 0; transform: translateY(105%); filter: blur(20px); }
          30%  { opacity: 1; }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        .landing-footer-logo-text .letter-wrapper {
          display: inline-block;
          overflow: hidden;
          vertical-align: bottom;
          line-height: 0.8;
          padding-bottom: 0.25em;
          margin-bottom: -0.25em;
        }
        .landing-footer-logo-text .letter-inner {
          display: inline-block;
          opacity: 0;
          transform: translateX(-105%);
          filter: blur(20px);
          animation: letter-reveal-mask 1.2s cubic-bezier(0.05, 0.9, 0.1, 1) forwards;
        }
        @keyframes letter-reveal-mask {
          0%   { opacity: 0; transform: translateX(-105%); filter: blur(20px); }
          25%  { opacity: 1; }
          100% { opacity: 0.95; transform: translateX(0); filter: blur(0); }
        }
      ` }} />

      <img
        src="https://api.getlayers.ai/storage/v1/object/public/public/assets/loopstack-f8c64439bf/black_gradient.svg"
        alt="Top Gradient"
        id="top-gradient-img"
      />

      <main className="landing-hero-content">
        <h1 ref={titleRef} className="landing-hero-title">
          Apply Now to be part <br /> of the closed beta
        </h1>
        <a ref={btnRef} href="/interview" className="landing-hero-btn" style={{ textDecoration: 'none' }}>
          <span className="btn-text">Start the Interview</span>
          <span className="landing-blinking-dot"></span>
        </a>
      </main>

      <footer className="landing-footer-container">
        <div className="landing-footer-top">
          <h2 className="landing-footer-title">Stay in Touch</h2>
          <h2 className="landing-footer-title">Think. Build. Repeat.</h2>
        </div>

        <div className="landing-footer-bottom">
          <div className="landing-footer-socials"></div>

          <div className="landing-footer-copyright">
            © 2026 Sole Agent
          </div>
        </div>
      </footer>

      <div className="landing-footer-logo-wrap">
        <h2 ref={logoRef} className="landing-footer-logo-text">Sole Agent</h2>
      </div>

      <div className="landing-video-container">
        <video autoPlay muted playsInline loop id="landing-bg-video">
          <source
            src="https://api.getlayers.ai/storage/v1/object/public/public/assets/loopstack-f8c64439bf/flower.mp4"
            type="video/mp4"
          />
          Ваш браузер не поддерживает видео.
        </video>
      </div>

      <div ref={cursorRingRef} id="cursor-ring" className="landing-cursor-ring-outline"></div>

      <div ref={glassCardRef} id="glass-card" className="landing-glass-cursor-card">
        <span className="landing-cursor-card-text">
          <span className="text-white">Say</span> Hello!
        </span>
      </div>
    </div>
  );
}
