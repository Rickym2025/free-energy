"use client";

import React, { useEffect, useState, useRef } from 'react';

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
  mapCenter: Coordinate | null;
  onMapClick: (point: Coordinate) => void;
  onPanelDeleted: (roofId: string) => void;
  onMarkerDrag: (index: number, newCoord: Coordinate) => void;
}

export default function MapPlanner({
  brandColor,
  panelWidth,
  panelHeight,
  panelRotation,
  currentPoints,
  savedRoofs,
  mapCenter,
  onMapClick,
  onPanelDeleted,
  onMarkerDrag
}: MapPlannerProps) {
  const mapRef = useRef<any>(null);
  const activeMarkersRef = useRef<any[]>([]);
  const activePolygonRef = useRef<any>(null);
  
  const savedRoofsLayerGroupRef = useRef<any>(null);
  const panelsLayerGroupRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [osm3dActive, setOsm3dActive] = useState(false); 
  const osm3dLayerInstanceRef = useRef<any>(null);

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

    // Carica Leaflet CSS e JS
    const L = (window as any).L;
    if (L) {
      loadOsmBuildingsScript();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        loadOsmBuildingsScript();
      };
      document.body.appendChild(script);
    }

    return () => {
      styleEl.remove();
    };
  }, []);

  // Caricamento asincrono e integrato di OSM Buildings Classic
  const loadOsmBuildingsScript = () => {
    const OSMBuildings = (window as any).OSMBuildings;
    if (OSMBuildings) {
      initializeMap();
    } else {
      const script3d = document.createElement('script');
      // Carica la libreria ufficiale ed unificata di OSM Buildings per Leaflet
      script3d.src = 'https://cdn.osmbuildings.org/classic/0.2.2b/OSMBuildings-Leaflet.js';
      script3d.async = true;
      script3d.onload = () => {
        initializeMap();
      };
      document.body.appendChild(script3d);
    }
  };

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !mapReady) return;

    if (savedRoofsLayerGroupRef.current) savedRoofsLayerGroupRef.current.clearLayers();
    if (panelsLayerGroupRef.current) panelsLayerGroupRef.current.clearLayers();

    savedRoofs.forEach(roof => {
      L.polygon(roof.points.map((p: Coordinate) => [p.lat, p.lng]), {
        color: '#10b981',
        fillOpacity: 0.25
      }).addTo(savedRoofsLayerGroupRef.current);

      drawPanelsForRoof(roof.points, roof.id);
      drawSegmentLengths(roof.points, savedRoofsLayerGroupRef.current, false, roof.lengths);
    });
  }, [panelRotation, savedRoofs, mapReady]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !mapReady) return;

    if ((window as any).tempLengthMarkers) {
      (window as any).tempLengthMarkers.forEach((m: any) => m.remove());
      (window as any).tempLengthMarkers = [];
    }

    activeMarkersRef.current.forEach(m => m.remove());
    activeMarkersRef.current = [];

    currentPoints.forEach((p, idx) => {
      const marker = L.marker([p.lat, p.lng], { draggable: true }).addTo(mapRef.current);
      
      marker.on('dragend', (e: any) => {
        const newLatLng = e.target.getLatLng();
        onMarkerDrag(idx, { lat: newLatLng.lat, lng: newLatLng.lng });
      });

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

    if (currentPoints.length >= 2) {
      drawSegmentLengths(currentPoints, mapRef.current, true);
    }
  }, [currentPoints, mapReady]);

  useEffect(() => {
    if (mapRef.current && mapReady && mapCenter) {
      mapRef.current.setView([mapCenter.lat, mapCenter.lng], 19);
    }
  }, [mapCenter, mapReady]);

  const initializeMap = () => {
    const L = (window as any).L;
    if (!L) return;

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

    setMapReady(true);

    map.on('click', (e: any) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  };

  // Attiva l'estrusione 3D vettoriale semitrasparente dei capannoni direttamente sopra il satellite
  const handleToggle3D = () => {
    const OSMBuildings = (window as any).OSMBuildings;
    if (!OSMBuildings || !mapRef.current) return;

    const nextState = !osm3dActive;
    setOsm3dActive(nextState);

    if (nextState) {
      // Inizializza il motore 3D e carica l'estrusione dei palazzi in trasparenza
      osm3dLayerInstanceRef.current = new OSMBuildings(mapRef.current).load('https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json');
    } else {
      if (osm3dLayerInstanceRef.current) {
        // Rimuove lo strato 3D in modo pulito
        osm3dLayerInstanceRef.current.destroy();
        osm3dLayerInstanceRef.current = null;
      }
    }
  };

  const drawSegmentLengths = (points: Coordinate[], targetLayer: any, isTemporary = false, lengthsOverride?: number[]) => {
    const L = (window as any).L;
    if (!L || points.length < 2) return;

    if (isTemporary && (window as any).tempLengthMarkers) {
      (window as any).tempLengthMarkers.forEach((m: any) => m.remove());
    }
    const tempMarkers: any[] = [];

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      if (!isTemporary && i === points.length - 1 && points.length < 3) continue;
      if (isTemporary && i === points.length - 1) continue;

      const latlng1 = L.latLng(p1.lat, p1.lng);
      const latlng2 = L.latLng(p2.lat, p2.lng);

      const distanceMeters = (lengthsOverride && lengthsOverride[i] !== undefined)
        ? lengthsOverride[i]
        : latlng1.distanceTo(latlng2);

      const midLat = (p1.lat + p2.lat) / 2;
      const midLng = (p1.lng + p2.lng) / 2;

      const lengthMarker = L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: 'bg-zinc-950/95 border-2 border-emerald-500/80 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap',
          html: `${distanceMeters.toFixed(1)} m`,
          iconAnchor: [24, 12]
        })
      }).addTo(targetLayer);

      if (isTemporary) {
        tempMarkers.push(lengthMarker);
      }
    }

    if (isTemporary) {
      (window as any).tempLengthMarkers = tempMarkers;
    }
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

  return (
    <div className="w-full h-full relative">
      <div id="map-pv" className="w-full h-full z-10" />
      
      <button 
        onClick={handleToggle3D}
        className="absolute top-4 right-4 z-20 bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 text-white font-extrabold text-[10px] px-3.5 py-2.5 rounded-xl uppercase tracking-wider shadow-2xl transition"
      >
        {osm3dActive ? "🌐 Nascondi 3D OSM" : "🌐 Attiva 3D OSM"}
      </button>
    </div>
  );
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
