import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { quetes } from "./data-quetes";

// Import d'un son court (bip) libre de droits
const bipUrl = "https://cdn.pixabay.com/audio/2022/03/15/audio_115b9b7b3b.mp3";

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
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

// Définition des niveaux de chaleur
const niveaux = [
  { nom: "Glacial", couleur: "#b3e0ff", min: 1000, pulse: 0, bip: 0 },
  { nom: "Froid", couleur: "#7ec8e3", min: 300, pulse: 1, bip: 0 },
  { nom: "Tiède", couleur: "#ffe066", min: 100, pulse: 2, bip: 1 },
  { nom: "Chaud", couleur: "#ffb347", min: 30, pulse: 3, bip: 2 },
  { nom: "Très chaud", couleur: "#ff704d", min: 10, pulse: 4, bip: 3 },
  { nom: "Brûlant", couleur: "#ff1744", min: 0, pulse: 5, bip: 4 },
];

function getNiveau(distance) {
  return niveaux.find((n) => distance >= n.min) || niveaux[niveaux.length - 1];
}

const QueteDetail = () => {
  const { id } = useParams();
  const quete = quetes.find((q) => q.id === parseInt(id));
  const [position, setPosition] = useState(null);
  const [distance, setDistance] = useState(null);
  const [azimut, setAzimut] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [niveau, setNiveau] = useState(niveaux[0]);
  const prevNiveau = useRef(niveaux[0]);
  const audioRef = useRef(null);
  const bipTimeout = useRef(null);

  // Gestion de la géolocalisation et du guidage
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
      const niv = getNiveau(dist);
      setNiveau(niv);
      if (niv.nom !== prevNiveau.current.nom && "vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      prevNiveau.current = niv;
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

  // Gestion du bip sonore selon la proximité
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(bipUrl);
    }
    if (bipTimeout.current) clearTimeout(bipTimeout.current);
    if (niveau.bip > 0) {
      const playBip = () => {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        bipTimeout.current = setTimeout(playBip, 1200 / niveau.bip);
      };
      playBip();
    }
    return () => {
      if (bipTimeout.current) clearTimeout(bipTimeout.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, [niveau]);

  if (!quete) return <div>Quête introuvable.</div>;

  // Animation CSS dynamique
  const pulseStyle = {
    animation: niveau.pulse ? `pulse ${1.2 - niveau.pulse * 0.15}s infinite` : "none",
    background: niveau.couleur,
    transition: "background 0.5s",
    borderRadius: 20,
    padding: 20,
    margin: "30px auto",
    maxWidth: 320,
    boxShadow: `0 0 ${niveau.pulse * 10 + 10}px ${niveau.couleur}`,
    position: "relative"
  };

  // La boussole de la quête : le nord est toujours en haut, la flèche pointe vers le nord géographique
  function BoussoleQuete() {
    return (
      <div style={{width: 200, height: 200, border: '2px solid #333', borderRadius: '50%', position: 'relative', margin: 'auto', background: '#fff'}}>
        {/* Flèche nord (toujours vers le haut) */}
        <div style={{position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '60px solid red', transform: `translate(-50%, -100%) rotate(0deg)`}} />
        {/* Centre */}
        <div style={{position: 'absolute', left: '50%', top: '50%', width: 8, height: 8, background: '#333', borderRadius: '50%', transform: 'translate(-50%, -50%)'}} />
        {/* N S O E */}
        <div style={{position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)', fontWeight: 'bold'}}>N</div>
        <div style={{position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)', fontWeight: 'bold'}}>S</div>
        <div style={{position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold'}}>O</div>
        <div style={{position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold'}}>E</div>
      </div>
    );
  }

  return (
    <div>
      <h2>{quete.nom}</h2>
      <p>Lieu : {quete.lieu}</p>
      <p>Coordonnées : {quete.latitude}, {quete.longitude}</p>
      {geoError && <p style={{color: 'red'}}>{geoError}</p>}
      {position ? (
        <>
          <div style={pulseStyle}>
            {/* Halo animé autour de la boussole */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 120,
              height: 120,
              background: niveau.couleur,
              opacity: 0.3 + niveau.pulse * 0.1,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 0,
              animation: niveau.pulse ? `pulse-halo ${1.2 - niveau.pulse * 0.15}s infinite` : "none"
            }} />
            <div style={{position: 'relative', zIndex: 1}}>
              <BoussoleQuete />
              <div style={{textAlign: 'center', fontWeight: 'bold', fontSize: 22, marginTop: 10}}>{niveau.nom}</div>
              <div style={{textAlign: 'center', fontSize: 16}}>{distance && distance.toFixed(1)} m</div>
            </div>
          </div>
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
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 ${niveau.couleur}; }
          70% { box-shadow: 0 0 ${niveau.pulse * 10 + 10}px ${niveau.couleur}; }
          100% { box-shadow: 0 0 0 0 ${niveau.couleur}; }
        }
        @keyframes pulse-halo {
          0% { opacity: 0.3; }
          50% { opacity: 0.7; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default QueteDetail; 