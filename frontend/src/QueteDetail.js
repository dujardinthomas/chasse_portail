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
  const [showWin, setShowWin] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

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

  // Gestion du bip sonore selon la proximité avec gestion des autoplay
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(bipUrl);
      audioRef.current.volume = 0.3; // Volume réduit
    }
    
    if (bipTimeout.current) clearTimeout(bipTimeout.current);
    
    // Ne jouer le son que si l'utilisateur a interagi et que l'audio est activé
    if (niveau.bip > 0 && audioEnabled && userInteracted) {
      const playBip = () => {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => {
          console.log("Audio play failed:", err);
          setAudioEnabled(false);
        });
        bipTimeout.current = setTimeout(playBip, 1200 / niveau.bip);
      };
      playBip();
    }
    
    return () => {
      if (bipTimeout.current) clearTimeout(bipTimeout.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, [niveau, audioEnabled, userInteracted]);

  if (!quete) return <div>Quête introuvable.</div>;

  // Fonction pour activer l'audio après interaction utilisateur
  const enableAudio = () => {
    if (!userInteracted) {
      setUserInteracted(true);
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setAudioEnabled(true);
        }).catch(() => {
          setAudioEnabled(false);
        });
      }
    }
  };

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

  // La boussole de la quête : avec deux flèches, une pour le nord et une pour la direction de la quête
  function BoussoleQuete() {
    return (
      <div style={{width: 200, height: 200, border: '2px solid #333', borderRadius: '50%', position: 'relative', margin: 'auto', background: '#fff'}}>
        {/* Flèche nord (rouge, toujours vers le haut) */}
        <div style={{
          position: 'absolute', 
          left: '50%', 
          top: '50%', 
          width: 0, 
          height: 0, 
          borderLeft: '8px solid transparent', 
          borderRight: '8px solid transparent', 
          borderBottom: '40px solid #ff4444', 
          transform: `translate(-50%, -100%) rotate(0deg)`,
          zIndex: 2
        }} />
        
        {/* Flèche direction de la quête (bleue, pointe vers la quête) */}
        {azimut !== null && (
          <div style={{
            position: 'absolute', 
            left: '50%', 
            top: '50%', 
            width: 0, 
            height: 0, 
            borderLeft: '10px solid transparent', 
            borderRight: '10px solid transparent', 
            borderBottom: '50px solid #2196F3', 
            transform: `translate(-50%, -100%) rotate(${azimut}deg)`,
            zIndex: 3,
            filter: 'drop-shadow(0 0 3px rgba(33, 150, 243, 0.7))'
          }} />
        )}
        
        {/* Centre */}
        <div style={{position: 'absolute', left: '50%', top: '50%', width: 8, height: 8, background: '#333', borderRadius: '50%', transform: 'translate(-50%, -50%)', zIndex: 4}} />
        
        {/* N S O E */}
        <div style={{position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)', fontWeight: 'bold', fontSize: '14px'}}>N</div>
        <div style={{position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)', fontWeight: 'bold', fontSize: '14px'}}>S</div>
        <div style={{position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', fontSize: '14px'}}>O</div>
        <div style={{position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', fontSize: '14px'}}>E</div>
        
        {/* Légende des flèches */}
        <div style={{position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', fontSize: '12px', textAlign: 'center'}}>
          <div style={{color: '#ff4444', fontWeight: 'bold'}}>🧭 Nord</div>
          <div style={{color: '#2196F3', fontWeight: 'bold'}}>🎯 Quête</div>
        </div>
      </div>
    );
  }

  // Animation de victoire améliorée (confettis + texte + effets)
  function WinAnimation() {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(45deg, rgba(255,255,255,0.9), rgba(255,215,0,0.1))',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.5s',
      }}>
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div 
              key={i} 
              className="confetti" 
              style={{
                left: `${Math.random()*100}%`, 
                animationDelay: `${Math.random()}s`,
                background: `hsl(${Math.random()*360}, 90%, 60%)`
              }} 
            />
          ))}
        </div>
        
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '80px', marginBottom: '20px', animation: 'pop 1s'}}>🎉</div>
          <h1 style={{
            fontSize: 48, 
            color: '#ff1744', 
            textShadow: '3px 3px 10px rgba(255,23,68,0.3)', 
            animation: 'pop 1s',
            marginBottom: '10px'
          }}>
            Félicitations !
          </h1>
          <p style={{
            fontSize: 24,
            color: '#4CAF50',
            fontWeight: 'bold',
            animation: 'fadeIn 1s 0.5s both'
          }}>
            Quête "{quete.nom}" terminée ! ✅
          </p>
          <div style={{
            fontSize: '60px',
            marginTop: '20px',
            animation: 'pop 1s 1s both'
          }}>
            🏆
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{padding: '20px', fontFamily: 'Arial, sans-serif'}} onClick={enableAudio}>
      <h2 style={{textAlign: 'center', color: '#333', marginBottom: '10px'}}>{quete.nom}</h2>
      <p style={{textAlign: 'center', color: '#666', marginBottom: '5px'}}>📍 {quete.lieu}</p>
      <p style={{textAlign: 'center', color: '#888', fontSize: '12px', marginBottom: '20px'}}>
        Coordonnées : {quete.latitude}, {quete.longitude}
      </p>
      
      {/* Indicateur audio */}
      {!userInteracted && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '5px',
          padding: '10px',
          margin: '10px 0',
          textAlign: 'center',
          fontSize: '14px',
          color: '#856404'
        }}>
          🔊 Cliquez n'importe où pour activer les sons de guidage
        </div>
      )}
      
      {userInteracted && (
        <div style={{
          textAlign: 'center',
          marginBottom: '10px'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAudioEnabled(!audioEnabled);
            }}
            style={{
              background: audioEnabled ? '#4CAF50' : '#f44336',
              color: 'white',
              border: 'none',
              padding: '5px 15px',
              borderRadius: '15px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {audioEnabled ? '🔊 Son activé' : '🔇 Son désactivé'}
          </button>
        </div>
      )}
      
      {geoError && <p style={{color: 'red', textAlign: 'center', background: '#ffe6e6', padding: '10px', borderRadius: '5px'}}>{geoError}</p>}
      
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
              <div style={{textAlign: 'center', fontWeight: 'bold', fontSize: 22, marginTop: 15, textShadow: '1px 1px 2px rgba(0,0,0,0.1)'}}>
                🌡️ {niveau.nom}
              </div>
              <div style={{textAlign: 'center', fontSize: 18, color: '#555', marginTop: 5}}>
                📏 {distance && distance.toFixed(1)} m
              </div>
              {azimut !== null && (
                <div style={{textAlign: 'center', fontSize: 14, color: '#777', marginTop: 5}}>
                  🧭 Direction : {azimut.toFixed(0)}°
                </div>
              )}
            </div>
          </div>
          
          <div style={{textAlign: 'center', marginTop: '20px'}}>
            {unlocked && !showWin ? (
              <button 
                onClick={() => {
                  enableAudio(); // S'assurer que l'audio est activé
                  setShowWin(true);
                  setTimeout(() => setShowWin(false), 3500);
                }}
                style={{
                  background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  fontSize: '18px',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s',
                  animation: 'button-glow 2s infinite'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                ✅ Valider la quête !
              </button>
            ) : !unlocked ? (
              <button 
                disabled
                style={{
                  background: '#ccc',
                  color: '#666',
                  border: 'none',
                  padding: '15px 30px',
                  fontSize: '18px',
                  borderRadius: '25px',
                  cursor: 'not-allowed'
                }}
              >
                🚶 Approche-toi pour valider
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <div style={{textAlign: 'center', padding: '40px'}}>
          <div style={{fontSize: '48px', marginBottom: '10px'}}>🔍</div>
          <p style={{fontSize: '18px', color: '#666'}}>Recherche de ta position...</p>
        </div>
      )}
      {showWin && <WinAnimation />}
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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes button-glow {
          0% { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
          50% { box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4); }
          100% { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        }
        .confetti-container {
          position: absolute;
          width: 100vw;
          height: 100vh;
          top: 0;
          left: 0;
          pointer-events: none;
        }
        .confetti {
          position: absolute;
          width: 12px;
          height: 24px;
          background: hsl(${Math.random()*360}, 90%, 60%);
          border-radius: 3px;
          opacity: 0.8;
          animation: confetti-fall 1.8s cubic-bezier(.62,.01,.5,1) forwards;
        }
        @keyframes confetti-fall {
          0% { top: -30px; transform: rotate(0deg); }
          80% { opacity: 1; }
          100% { top: 100vh; transform: rotate(360deg); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
};

export default QueteDetail; 