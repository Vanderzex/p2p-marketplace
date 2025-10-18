import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapSelector({ tx, onSelectLocation }) {
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
  );
}
