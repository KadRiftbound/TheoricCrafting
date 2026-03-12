'use client';

import { useState } from 'react';
import { useArenaSocket } from '../../lib/useArenaSocket';
import type { Domain } from '../engine';
import type { GameAction } from '../../../shared/pvp-types';
import { PvPGameBoard } from './PvPGameBoard';

const DOMAINS: { value: Domain; label: string; color: string; bg: string }[] = [
  { value: 'Fury',      label: 'Fury',      color: 'border-red-500',    bg: 'bg-red-500/20' },
  { value: 'Cunning',   label: 'Cunning',   color: 'border-blue-500',   bg: 'bg-blue-500/20' },
  { value: 'Knowledge', label: 'Knowledge', color: 'border-purple-500', bg: 'bg-purple-500/20' },
  { value: 'Glory',     label: 'Glory',     color: 'border-yellow-500', bg: 'bg-yellow-500/20' },
  { value: 'Hope',      label: 'Hope',      color: 'border-green-500',  bg: 'bg-green-500/20' },
  { value: 'Order',     label: 'Order',     color: 'border-orange-500', bg: 'bg-orange-500/20' },
];

export function PvPLobby() {
  const {
    status, lobbyStep, roomCode, room, gameState, yourSeat,
    error, messages, winner,
    connect, disconnect, createRoom, joinRoom, setReady, sendAction, sendMessage, setLobbyStep, setError,
  } = useArenaSocket();

  const [playerName, setPlayerName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<Domain>('Fury');
  const [joinCode, setJoinCode] = useState('');
  const [chatInput, setChatInput] = useState('');

  // --- Si la partie est en cours ---
  if (lobbyStep === 'playing' && gameState && yourSeat) {
    return (
      <PvPGameBoard
        gameState={gameState}
        yourSeat={yourSeat}
        playerName={playerName}
        opponentName={yourSeat === 'host' ? (room?.guest?.name || 'Adversaire') : (room?.host?.name || 'Adversaire')}
        messages={messages}
        winner={winner}
        onAction={sendAction}
        onChat={(msg) => sendMessage(msg, playerName)}
        onLeave={() => { disconnect(); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-rift-gold mb-2">Arena PvP</h1>
          <p className="text-gray-400">Affrontez des joueurs en temps réel</p>

          {/* Status badge */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-green-400 animate-pulse' :
              status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              status === 'error' ? 'bg-red-400' : 'bg-gray-600'
            }`} />
            <span className="text-xs text-gray-500">
              {status === 'connected' ? 'Serveur connecté' :
               status === 'connecting' ? 'Connexion...' :
               status === 'error' ? 'Serveur hors ligne' : 'Non connecté'}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Step: Menu */}
        {lobbyStep === 'menu' && (
          <div className="bg-rift-dark-secondary rounded-2xl p-6 border border-gray-800 space-y-4">
            <input
              type="text"
              placeholder="Ton pseudo"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-rift-dark border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-rift-blue focus:outline-none"
              maxLength={20}
            />

            {/* Domain selection */}
            <div>
              <p className="text-sm text-gray-400 mb-2">Ton domaine</p>
              <div className="grid grid-cols-3 gap-2">
                {DOMAINS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDomain(d.value)}
                    className={`py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                      selectedDomain === d.value
                        ? `${d.color} ${d.bg} text-white`
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {status !== 'connected' ? (
              <button
                onClick={connect}
                disabled={status === 'connecting'}
                className="w-full py-3 bg-rift-blue text-rift-dark font-bold rounded-lg hover:bg-rift-blue/80 transition-colors disabled:opacity-50"
              >
                {status === 'connecting' ? 'Connexion...' : 'Se connecter'}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (!playerName.trim()) { setError('Entre un pseudo'); return; }
                    createRoom(playerName, selectedDomain);
                  }}
                  className="py-3 bg-rift-purple text-white font-bold rounded-lg hover:bg-rift-purple/80 transition-colors"
                >
                  Créer une partie
                </button>
                <button
                  onClick={() => setLobbyStep('joining' as any)}
                  className="py-3 bg-rift-blue text-rift-dark font-bold rounded-lg hover:bg-rift-blue/80 transition-colors"
                >
                  Rejoindre
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Joining */}
        {(lobbyStep as any) === 'joining' && (
          <div className="bg-rift-dark-secondary rounded-2xl p-6 border border-gray-800 space-y-4">
            <h2 className="text-xl font-bold text-center">Rejoindre une partie</h2>
            <input
              type="text"
              placeholder="Code de la room (ex: RF-AB12)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-rift-dark border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-rift-blue focus:outline-none font-mono text-center text-lg tracking-widest"
              maxLength={7}
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLobbyStep('menu')}
                className="py-3 border border-gray-700 text-gray-400 rounded-lg"
              >
                Retour
              </button>
              <button
                onClick={() => {
                  if (!playerName.trim()) { setError('Entre un pseudo'); return; }
                  joinRoom(joinCode, playerName, selectedDomain);
                }}
                className="py-3 bg-rift-blue text-rift-dark font-bold rounded-lg hover:bg-rift-blue/80 transition-colors"
              >
                Rejoindre
              </button>
            </div>
          </div>
        )}

        {/* Step: Waiting */}
        {lobbyStep === 'waiting' && (
          <div className="bg-rift-dark-secondary rounded-2xl p-6 border border-gray-800 text-center space-y-4">
            <h2 className="text-xl font-bold">En attente d'un adversaire</h2>

            <div className="bg-rift-dark rounded-xl p-4 border border-rift-gold">
              <p className="text-sm text-gray-400 mb-1">Code de ta room</p>
              <p className="text-4xl font-bold text-rift-gold tracking-widest font-mono">{roomCode}</p>
              <button
                onClick={() => navigator.clipboard.writeText(roomCode)}
                className="mt-2 text-xs text-gray-500 hover:text-rift-blue transition-colors"
              >
                Copier le code
              </button>
            </div>

            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-rift-purple/30 border-2 border-rift-purple flex items-center justify-center mx-auto mb-1">
                  <span className="text-lg">👑</span>
                </div>
                <p className="text-sm font-bold">{room?.host?.name}</p>
                <p className="text-xs text-gray-500">{room?.host?.domain}</p>
              </div>
              <div className="text-center self-center">
                <span className="text-gray-600 text-2xl">vs</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center mx-auto mb-1">
                  {room?.guest ? <span className="text-lg">⚔️</span> : <span className="animate-ping">⏳</span>}
                </div>
                <p className="text-sm font-bold">{room?.guest?.name || '...'}</p>
                <p className="text-xs text-gray-500">{room?.guest?.domain || 'Attente'}</p>
              </div>
            </div>

            <button
              onClick={disconnect}
              className="px-4 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Step: Ready */}
        {lobbyStep === 'ready' && (
          <div className="bg-rift-dark-secondary rounded-2xl p-6 border border-green-500 text-center space-y-4">
            <h2 className="text-xl font-bold text-green-400">Les deux joueurs sont présents !</h2>

            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-1 border-2 ${
                  room?.host?.isReady ? 'bg-green-500/30 border-green-500' : 'bg-gray-800 border-gray-700'
                }`}>
                  <span>{room?.host?.isReady ? '✓' : '⌛'}</span>
                </div>
                <p className="text-sm font-bold">{room?.host?.name}</p>
              </div>
              <div className="text-center self-center">
                <span className="text-gray-600 text-2xl">vs</span>
              </div>
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-1 border-2 ${
                  room?.guest?.isReady ? 'bg-green-500/30 border-green-500' : 'bg-gray-800 border-gray-700'
                }`}>
                  <span>{room?.guest?.isReady ? '✓' : '⌛'}</span>
                </div>
                <p className="text-sm font-bold">{room?.guest?.name}</p>
              </div>
            </div>

            <button
              onClick={setReady}
              className="w-full py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 transition-colors text-lg"
            >
              Je suis prêt !
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
