"use client";

import React, { useEffect, useRef } from 'react';

interface Coordinate {
  lat: number;
  lng: number;
}

interface MapPlannerProps {
  brandColor: string;
  panelWidth: number;
  panelHeight: number;
  panelRotation: number;
  currentPoints: Coordinate[];
  savedRoofs: any[];
  onMapClick: (point: Coordinate) => void;
  onPanelDeleted: (roofId: string) => void;
}

export default function MapPlanner({
  brandColor,
  panelWidth,
  panelHeight,
  panelRotation,
  currentPoints,
  savedRoofs,
  onMapClick,
  onPanelDeleted
}: MapPlannerProps) {
  const mapRef = useRef<any>(null);
  const activeMarkersRef = useRef<any[]>([]);
  const activePolygonRef = useRef<any>(null);
  
  const savedRoofsLayerGroupRef = useRef<any>(null);
  const panelsLayerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .leaflet-container, 
      .leaflet-interactive, 
      .leaflet-pane, 
      .leaflet-marker-icon, 
      .leaflet-path { 
        cursor: crosshair !important; 
      }
    `;
    document.head.appendChild(styleEl);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      initializeMap();
    };
    document.body.appendChild(script);

    return () => {
      styleEl.remove();
      link.remove();
      script.remove();
    };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (savedRoofsLayerGroupRef.current) savedRoofsLayerGroupRef.current.clearLayers();
    if (panelsLayerGroupRef.current) panelsLayerGroupRef.current.clearLayers();

    savedRoofs.forEach(roof => {
      L.polygon(roof.points.map((p: Coordinate) => [p.lat, p.lng]), {
        color: '#10b981',
        fillOpacity: 0.25
      }).addTo(savedRoofsLayerGroupRef.current);

      drawPanelsForRoof(roof.points, roof.id);
    });
  }, [panelRotation, savedRoofs]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    activeMarkersRef.current.forEach(m => m.remove());
    activeMarkersRef.current = [];

    currentPoints.forEach(p => {
      const marker = L.marker([p.lat, p.lng]).addTo(mapRef.current);
      activeMarkersRef.current.push(marker);
    });

    if (activePolygonRef.current) {
      activePolygonRef.current.setLatLngs(currentPoints.map(p => [p.lat, p.lng]));
    } else if (currentPoints.length > 0) {
      activePolygonRef.current = L.polygon(currentPoints.map(p => [p.lat, p.lng]), {
        color: brandColor,
        fillOpacity: 0.25
      }).addTo(mapRef.current);
    }
  }, [currentPoints]);

  const initializeMap = () => {
    const L = (window as any).L;
    if (!L) return;

    // Prevenzione e distruzione istanza esistente per scongiurare l'errore "Map container is already initialized"
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    const container = L.DomUtil.get('map-pv');
    if (container) {
      container._leaflet_id = null;
    }

    const map = L.map('map-pv', { maxZoom: 22 }).setView([41.9028, 12.4964], 6);
    mapRef.current = map;

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 22,
      maxNativeZoom: 19,
      attribution: 'Esri, Maxar'
    }).addTo(map);

    savedRoofsLayerGroupRef.current = L.layerGroup().addTo(map);
    panelsLayerGroupRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: any) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  };

  const drawPanelsForRoof = (points: Coordinate[], roofId: string) => {
    const L = (window as any).L;
    if (!L || points.length < 3) return;

    const latMid = points[0].lat * Math.PI / 180;
    const project = (p: Coordinate) => ({ x: p.lng * 111320 * Math.cos(latMid), y: p.lat * 110540 });
    const unproject = (m: { x: number; y: number }) => ({ lat: m.y / 110540, lng: m.x / (111320 * Math.cos(latMid)) });

    const m0 = project(points[0]);
    const angleRad = (panelRotation * Math.PI) / 180; 

    const rotate = (p: { x: number; y: number }, rad: number) => ({
      x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
      y: p.x * Math.sin(rad) + p.y * Math.cos(rad)
    });

    const localVertices = points.map(p => {
      const proj = project(p);
      return rotate({ x: proj.x - m0.x, y: proj.y - m0.y }, -angleRad);
    });

    const xs = localVertices.map(v => v.x);
    const ys = localVertices.map(v => v.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);

    for (let lx = minX; lx < maxX; lx += panelWidth) {
      for (let ly = minY; ly < maxY; ly += panelHeight) {
        const c1 = { x: lx + panelWidth * 0.05, y: ly + panelHeight * 0.05 };
        const c2 = { x: lx + panelWidth * 0.95, y: ly + panelHeight * 0.05 };
        const c3 = { x: lx + panelWidth * 0.95, y: ly + panelHeight * 0.95 };
        const c4 = { x: lx + panelWidth * 0.05, y: ly + panelHeight * 0.95 };

        if (
          isPointInPolygonLocal(c1, localVertices) &&
          isPointInPolygonLocal(c2, localVertices) &&
          isPointInPolygonLocal(c3, localVertices) &&
          isPointInPolygonLocal(c4, localVertices)
        ) {
          const geoCorners = [c1, c2, c3, c4].map(c => {
            const rot = rotate(c, angleRad);
            return unproject({ x: rot.x + m0.x, y: rot.y + m0.y });
          });

          const panel = L.polygon(geoCorners.map(gc => [gc.lat, gc.lng]), {
            color: '#1e293b',
            fillColor: '#0f172a',
            fillOpacity: 0.9,
            weight: 1
          }).addTo(panelsLayerGroupRef.current);

          panel.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            panel.remove();
            onPanelDeleted(roofId);
          });
        }
      }
    }
  };

  return <div id="map-pv" className="w-full h-full z-10" />;
}

function isPointInPolygonLocal(point: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
