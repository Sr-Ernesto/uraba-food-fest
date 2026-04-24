'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useRef, useCallback } from 'react';
import { Download, ExternalLink } from 'lucide-react';

interface QRCardProps {
  name: string;
  slug: string;
  imageUrl?: string | null;
  instagram?: string | null;
  qrUrl: string;
  eventName?: string;
  logoUrl?: string | null;
}

export default function QRCard({ name, slug, imageUrl, instagram, qrUrl, eventName, logoUrl }: QRCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    const card = cardRef.current;
    if (!card) return;

    const svg = card.querySelector('svg');
    if (!svg) return;

    // Render QR SVG to canvas
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 3; // High-res
      canvas.width = 600 * scale;
      canvas.height = 780 * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, 600, 780);

      // Card background
      const cardX = 30;
      const cardY = 30;
      const cardW = 540;
      const cardH = 720;

      // Rounded rect
      const radius = 24;
      ctx.beginPath();
      ctx.moveTo(cardX + radius, cardY);
      ctx.lineTo(cardX + cardW - radius, cardY);
      ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
      ctx.lineTo(cardX + cardW, cardY + cardH - radius);
      ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
      ctx.lineTo(cardX + radius, cardY + cardH);
      ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
      ctx.lineTo(cardX, cardY + radius);
      ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
      ctx.closePath();
      ctx.fillStyle = '#141414';
      ctx.fill();

      // Border glow
      ctx.strokeStyle = 'rgba(255, 92, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Event name header
      ctx.fillStyle = '#ff5c00';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(eventName || '🍔 URABA FOOD FEST', 300, 72);

      // Orange accent line
      ctx.beginPath();
      ctx.moveTo(180, 85);
      ctx.lineTo(420, 85);
      ctx.strokeStyle = '#ff5c00';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Restaurant name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      // Truncate long names
      const displayName = name.length > 25 ? name.slice(0, 22) + '...' : name;
      ctx.fillText(displayName, 300, 130);

      // Subtitle
      ctx.fillStyle = '#888888';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Escanea y vota por la mejor hamburguesa', 300, 158);

      // QR code area - white rounded rect
      const qrX = 120;
      const qrY = 185;
      const qrSize = 360;
      const qrRadius = 16;

      ctx.beginPath();
      ctx.moveTo(qrX + qrRadius, qrY);
      ctx.lineTo(qrX + qrSize - qrRadius, qrY);
      ctx.quadraticCurveTo(qrX + qrSize, qrY, qrX + qrSize, qrY + qrRadius);
      ctx.lineTo(qrX + qrSize, qrY + qrSize - qrRadius);
      ctx.quadraticCurveTo(qrX + qrSize, qrY + qrSize, qrX + qrSize - qrRadius, qrY + qrSize);
      ctx.lineTo(qrX + qrRadius, qrY + qrSize);
      ctx.quadraticCurveTo(qrX, qrY + qrSize, qrX, qrY + qrSize - qrRadius);
      ctx.lineTo(qrX, qrY + qrRadius);
      ctx.quadraticCurveTo(qrX, qrY, qrX + qrRadius, qrY);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Draw QR SVG into the white area
      const qrImg = new Image();
      qrImg.onload = () => {
        ctx.drawImage(qrImg, qrX + 20, qrY + 20, qrSize - 40, qrSize - 40);

        // Bottom text
        ctx.fillStyle = '#666666';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('urabafoodfest.com', 300, 580);

        if (instagram) {
          ctx.fillStyle = '#e1306c';
          ctx.font = '13px system-ui, -apple-system, sans-serif';
          ctx.fillText(`📸 ${instagram}`, 300, 605);
        }

        // Star decoration
        ctx.fillStyle = '#ff5c00';
        ctx.font = '20px system-ui';
        ctx.fillText('⭐ ⭐ ⭐ ⭐ ⭐', 300, 645);

        // URL at bottom
        ctx.fillStyle = '#444444';
        ctx.font = '10px monospace';
        ctx.fillText(qrUrl, 300, 675);

        // Download
        const link = document.createElement('a');
        link.download = `qr-${slug}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        URL.revokeObjectURL(svgUrl);
      };
      qrImg.src = svgUrl;
    };
    img.src = svgUrl;
  }, [name, slug, qrUrl, instagram, eventName]);

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden hover:border-brand/30 transition-colors group">
      {/* Card preview */}
      <div ref={cardRef} className="p-6 text-center">
        {/* Event header */}
        <p className="text-xs font-bold text-brand tracking-wider mb-1">
          {eventName || '🍔 URABA FOOD FEST'}
        </p>
        <div className="w-24 h-0.5 bg-brand/50 mx-auto mb-4" />

        {/* Restaurant name */}
        <h3 className="text-lg font-bold text-white mb-1 truncate">{name}</h3>
        <p className="text-xs text-gray-500 mb-4">Escanea y vota por la mejor hamburguesa</p>

        {/* QR Code */}
        <div className="bg-white rounded-xl p-4 inline-block mb-4">
          <QRCodeSVG
            value={qrUrl}
            size={180}
            level="H"
            bgColor="#ffffff"
            fgColor="#0a0a0a"
            imageSettings={logoUrl ? {
              src: logoUrl,
              height: 36,
              width: 36,
              excavate: true,
            } : undefined}
          />
        </div>

        {/* Footer info */}
        <p className="text-xs text-gray-500">urabafoodfest.com</p>
        {instagram && (
          <p className="text-xs text-pink-400 mt-1">📸 {instagram}</p>
        )}
        <div className="text-sm mt-2">⭐ ⭐ ⭐ ⭐ ⭐</div>
        <p className="text-[9px] text-gray-600 mt-2 font-mono truncate px-2">{qrUrl}</p>
      </div>

      {/* Actions */}
      <div className="border-t border-surface-3 p-3 flex gap-2">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-brand hover:bg-brand-dark rounded-xl text-sm font-medium transition-colors"
        >
          <Download size={14} /> Descargar PNG
        </button>
        <a
          href={qrUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 px-3 py-2.5 bg-surface-2 hover:bg-surface-3 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
