import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { quetes } from "./data-quetes";

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Rayon de la Terre en mètres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getAzimuth(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  let brng = Math.atan2(y, x);
  brng = (brng * 180) / Math.PI;
  return (brng + 360) % 360;
}

function getChaleur(distance) {
  if (distance < 10) return "Brûlant";
  if (distance < 30) return "Très chaud";
  if (distance < 100) return "Chaud";
  if (distance < 300) return "Tiède";
  if (distance < 1000) return "Froid";
  return "Glacial";
}

const QueteDetail = () => {
  const { id } = useParams();
  const quete = quetes.find((q) => q.id === parseInt(id));
  const [position, setPosition] = useState(null);
  const [heading, setHeading] = useState(null);
  const [distance, setDistance] = useState(null);
  const [azimut, setAzimut] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    if (!quete) return;
    const geoSuccess = (pos) => {
      const { latitude, longitude } = pos.coords;
      setPosition({ latitude, longitude });
      const dist = getDistanceFromLatLonInMeters(
        latitude,
        longitude,
        quete.latitude,
        quete.longitude
      );
      setDistance(dist);
      const az = getAzimuth(
        latitude,
        longitude,
        quete.latitude,
        quete.longitude
      );
      setAzimut(az);
      if (dist < 10) setUnlocked(true);
    };
    const geoError = (err) => {
      setGeoError("Erreur de géolocalisation : " + err.message);
    };
    const watchId = navigator.geolocation.watchPosition(geoSuccess, geoError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 5000,
    });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [quete]);

  useEffect(() => {
    // Boussole (orientation de l'appareil)
    const handleOrientation = (event) => {
      if (event.absolute && event.alpha !== null) {
        setHeading(event.alpha);
      }
    };
    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  if (!quete) return <div>Quête introuvable.</div>;

  return (
    <div>
      <h2>{quete.nom}</h2>
      <p>Lieu : {quete.lieu}</p>
      <p>Coordonnées : {quete.latitude}, {quete.longitude}</p>
      {geoError && <p style={{color: 'red'}}>{geoError}</p>}
      {position ? (
        <>
          <div style={{margin: '30px 0'}}>
            <Boussole azimut={azimut} heading={heading} />
          </div>
          <p>Distance : {distance && distance.toFixed(1)} m</p>
          <p>Chaleur : {distance && getChaleur(distance)}</p>
          {unlocked ? (
            <button onClick={() => fetch("/api/quete/valider", {method: "POST"})}>
              Valider la quête !
            </button>
          ) : (
            <button disabled>Approche-toi pour valider</button>
          )}
        </>
      ) : (
        <p>Recherche de ta position...</p>
      )}
    </div>
  );
};

function Boussole({ azimut, heading }) {
  // heading = direction de l'appareil, azimut = direction vers la quête
  const angle = heading !== null && azimut !== null ? azimut - heading : 0;
  return (
    <div style={{width: 200, height: 200, border: '2px solid #333', borderRadius: '50%', position: 'relative', margin: 'auto'}}>
      <div style={{position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '60px solid red', transform: `translate(-50%, -100%) rotate(${angle}deg)`}} />
      <div style={{position: 'absolute', left: '50%', top: '50%', width: 4, height: 4, background: '#333', borderRadius: '50%', transform: 'translate(-50%, -50%)'}} />
      <div style={{position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)', fontWeight: 'bold'}}>N</div>
      <div style={{position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)', fontWeight: 'bold'}}>S</div>
      <div style={{position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold'}}>O</div>
      <div style={{position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold'}}>E</div>
    </div>
  );
}

export default QueteDetail; 