import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { FaTimes } from "react-icons/fa"; 
import "leaflet/dist/leaflet.css";

export default function MapSelector({ tx, onSelectLocation, onClose }) {
  const [position, setPosition] = useState(null);

  // Φόρτωση υπάρχουσας τοποθεσίας
  useEffect(() => {
    if (tx?.meeting_lat && tx?.meeting_lng) {
      setPosition({ lat: tx.meeting_lat, lng: tx.meeting_lng });
    }
  }, [tx]);

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        onSelectLocation(e.latlng.lat, e.latlng.lng);
      },
    });

    return position ? (
      <Marker position={position}>
        <Popup>📍 Προτεινόμενη τοποθεσία</Popup>
      </Marker>
    ) : null;
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          zIndex: 1000,
          background: "rgba(0,0,0,0.6)",
          border: "none",
          borderRadius: "50%",
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
        }}
      >
        <FaTimes size={16} />
      </button>

      <MapContainer
        center={position ? [position.lat, position.lng] : [37.9838, 23.7275]}
        zoom={position ? 14 : 12}
        style={{ height: "400px", width: "100%", borderRadius: "10px" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker />
      </MapContainer>
    </div>
  );
}