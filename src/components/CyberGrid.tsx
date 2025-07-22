import { useEffect, useRef } from 'react';

interface CyberGridProps {
  className?: string;
}

const CyberGrid = ({ className }: CyberGridProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createGridSquares = () => {
      if (!overlayRef.current) return;
      
      const overlay = overlayRef.current;
      overlay.innerHTML = '';
      
      const cols = Math.ceil(window.innerWidth / 50);
      const rows = Math.ceil(window.innerHeight / 50);
      
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const square = document.createElement('div');
          square.className = 'cyber-grid-square';
          square.style.left = j * 50 + 'px';
          square.style.top = i * 50 + 'px';
          
          // Random opacity for every square
          const opacity = 0.1 + Math.random() * 0.8;
          square.style.opacity = opacity.toString();
          
          // Random background intensity
          const bgOpacity = Math.random() * 0.1;
          square.style.background = `hsl(var(--cyber-grid) / ${bgOpacity})`;
          
          // Random filled squares
          if (Math.random() < 0.03) {
            square.classList.add('filled');
          }
          
          overlay.appendChild(square);
        }
      }
    };

    const createShiningPaths = () => {
      if (!pathsRef.current) return;
      
      const pathsContainer = pathsRef.current;
      pathsContainer.innerHTML = '';
      
      const cols = Math.ceil(window.innerWidth / 50);
      const rows = Math.ceil(window.innerHeight / 50);
      
      // Create horizontal paths
      for (let i = 0; i < 5; i++) {
        const row = Math.floor(Math.random() * rows);
        const startCol = Math.floor(Math.random() * (cols - 5));
        const length = 3 + Math.floor(Math.random() * 8);
        
        const path = document.createElement('div');
        path.className = 'cyber-shining-path cyber-path-horizontal';
        path.style.top = (row * 50) + 'px';
        path.style.left = (startCol * 50) + 'px';
        path.style.width = (length * 50) + 'px';
        path.style.animationDelay = Math.random() * 2 + 's';
        
        pathsContainer.appendChild(path);
      }
      
      // Create vertical paths
      for (let i = 0; i < 5; i++) {
        const col = Math.floor(Math.random() * cols);
        const startRow = Math.floor(Math.random() * (rows - 5));
        const length = 3 + Math.floor(Math.random() * 8);
        
        const path = document.createElement('div');
        path.className = 'cyber-shining-path cyber-path-vertical';
        path.style.left = (col * 50) + 'px';
        path.style.top = (startRow * 50) + 'px';
        path.style.height = (length * 50) + 'px';
        path.style.animationDelay = Math.random() * 2 + 's';
        
        pathsContainer.appendChild(path);
      }
      
      // Create L-shaped paths
      for (let i = 0; i < 8; i++) {
        const startCol = Math.floor(Math.random() * (cols - 6));
        const startRow = Math.floor(Math.random() * (rows - 6));
        const hLength = 2 + Math.floor(Math.random() * 5);
        const vLength = 2 + Math.floor(Math.random() * 5);
        
        // Horizontal part of L
        const hPath = document.createElement('div');
        hPath.className = 'cyber-shining-path cyber-path-horizontal';
        hPath.style.top = (startRow * 50) + 'px';
        hPath.style.left = (startCol * 50) + 'px';
        hPath.style.width = (hLength * 50) + 'px';
        hPath.style.animationDelay = Math.random() * 2 + 's';
        
        // Vertical part of L
        const vPath = document.createElement('div');
        vPath.className = 'cyber-shining-path cyber-path-vertical';
        vPath.style.left = ((startCol + hLength - 1) * 50) + 'px';
        vPath.style.top = (startRow * 50) + 'px';
        vPath.style.height = (vLength * 50) + 'px';
        vPath.style.animationDelay = Math.random() * 2 + 's';
        
        pathsContainer.appendChild(hPath);
        pathsContainer.appendChild(vPath);
      }
    };

    const initialize = () => {
      createGridSquares();
      createShiningPaths();
    };

    initialize();

    const handleResize = () => {
      initialize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`cyber-grid-container ${className || ''}`}>
      <div className="cyber-grid-background" />
      <div ref={overlayRef} className="cyber-grid-overlay" />
      <div ref={pathsRef} />
    </div>
  );
};

export default CyberGrid;