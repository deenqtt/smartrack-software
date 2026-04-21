import { useEffect, useState } from "react";
import { useMapEvents } from "react-leaflet";
import dynamic from "next/dynamic";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/20">Loading map...</div>,
});

const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {
  ssr: false,
});

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), {
  ssr: false,
});

const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), {
  ssr: false,
});

// Map click handler component
const MapClickHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      onMapClick(lat, lng);
    },
  });
  return null;
};

// Animated Flowing Polyline component for visual connections
const FlowingLine = ({ positions, color = '#3b82f6', isActive = true, isDashed = false }: {
  positions: [number, number][];
  color?: string;
  isActive?: boolean;
  isDashed?: boolean;
}) => {
  const [animationOffset, setAnimationOffset] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const animate = () => {
      setAnimationOffset(prev => (prev + 1) % 100);
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isActive]);

  const dashArray = isDashed ? '5, 5' : '10, 20'; // Stripped pattern

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color,
        weight: 3,
        opacity: isActive ? 0.8 : 0.4,
        dashArray,
        dashOffset: animationOffset.toString(),
      }}
    />
  );
};

// Draggable marker component
const DraggableMarker = ({ position, onPositionChange }: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}) => {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(position);
  const [createIcon, setCreateIcon] = useState<((url: string) => any) | null>(null);

  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  useEffect(() => {
    // Create custom icon for marker following manage-node-map pattern
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // Override default icon URLs to prevent broken icon issues
        L.Icon.Default.prototype.options.iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
        L.Icon.Default.prototype.options.iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
        L.Icon.Default.prototype.options.shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

        // Create function to generate custom icons with different sizes (consistent with manage-node-map)
        const iconCreator = (url: string, size: number = 25) => {
          return new L.Icon({
            iconUrl: url,
            iconSize: [size, size === 25 ? 41 : size + 16], // Default marker height or custom
            iconAnchor: [size/2, size === 25 ? 41 : size + 16], // Center horizontally, full height anchor
            popupAnchor: [0, -(size === 25 ? 41 : size + 16)], // Popup above icon
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            shadowSize: [41, 41]
          });
        };

        setCreateIcon(() => iconCreator);
      });
    }
  }, []);

  const handleDragEnd = (event: any) => {
    const marker = event.target;
    const newPosition = marker.getLatLng();
    const lat = parseFloat(newPosition.lat.toFixed(6));
    const lng = parseFloat(newPosition.lng.toFixed(6));
    setMarkerPosition([lat, lng]);
    onPositionChange(lat, lng);
  };

  const icon = createIcon ? createIcon('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png') : undefined;

  return (
    <Marker
      position={markerPosition}
      draggable={true}
      eventHandlers={{
        dragend: handleDragEnd,
      }}
      icon={icon}
    >
      <Popup>
        <div className="text-sm font-mono">
          {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
          <br />
          <span className="text-xs text-muted-foreground">Drag marker to reposition</span>
        </div>
      </Popup>
    </Marker>
  );
};

// Main MapLocationPicker component
interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  className?: string;
}

export default function MapLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  className = ""
}: MapLocationPickerProps) {
  const [clickedPosition, setClickedPosition] = useState<[number, number] | null>(null);
  const [serverNodes, setServerNodes] = useState<any[]>([]);

  const handleMapClick = (event: any) => {
    const lat = parseFloat(event.latlng.lat.toFixed(6));
    const lng = parseFloat(event.latlng.lng.toFixed(6));
    onLocationChange(lat, lng);
    setClickedPosition([lat, lng]);
  };

  const handleMarkerChange = (lat: number, lng: number) => {
    onLocationChange(lat, lng);
    setClickedPosition([lat, lng]);
  };

  // Default center to Jakarta if no coordinates provided
  const defaultLat = latitude || -6.2088;
  const defaultLng = longitude || 106.8456;

  const currentPosition: [number, number] = [latitude || defaultLat, longitude || defaultLng];

  return (
    <div className={`h-64 w-full rounded-lg border overflow-hidden ${className}`}>
      <MapContainer
        center={currentPosition}
        zoom={13}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Flowing connection lines from marker to server nodes */}
        {serverNodes.map((server, index) => (
          <FlowingLine
            key={`flowing-line-${server.id}-${index}`}
            positions={[
              currentPosition, // From current marker position
              [server.latitude, server.longitude] // To server node
            ]}
            color="#10b981" // Green color for active connections
            isActive={server.status === 'active'}
            isDashed={false}
          />
        ))}
        <MapClickHandler onMapClick={handleMapClick} />
        <DraggableMarker
          position={currentPosition}
          onPositionChange={handleMarkerChange}
        />
      </MapContainer>

      {/* Coordinates display */}
      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-mono border">
        Lat: {currentPosition[0].toFixed(6)}
        <br />
        Lng: {currentPosition[1].toFixed(6)}
      </div>
    </div>
  );
}
