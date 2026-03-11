'use client';

import { useState, useCallback } from 'react';
import type { GameState, GameCard, Rune, Phase } from '../engine';
import type { GameAction, ChatReceivedPayload } from '../../../shared/pvp-types';
import {
  playCard, block, channelRune, processPhase,
  moveToField, declareAttack, skipToAction,
} from '../engine';

interface PvPGameBoardProps {
  gameState: GameState;
  yourSeat: 'host' | 'guest';
  playerName: string;
  opponentName: string;
  messages: ChatReceivedPayload[];
  winner: 'host' | 'guest' | null;
  onAction: (action: GameAction) => void;
  onChat: (message: string) => void;
  onLeave: () => void;
}

const PHASE_LABELS: Record<Phase, string> = {
  awaken: 'Éveil', beginning: 'Début', channel: 'Canal',
  draw: 'Pioche', action: 'Action', end: 'Fin',
};

const DOMAIN_BORDER: Record<string, string> = {
  Fury: 'border-red-500', Hope: 'border-green-500', Glory: 'border-yellow-500',
  Cunning: 'border-blue-500', Knowledge: 'border-purple-500', Order: 'border-orange-500',
  Void: 'border-pink-500', Chaos: 'border-emerald-500', Colorless: 'border-gray-500',
};

const DOMAIN_GRADIENT: Record<string, string> = {
  Fury: 'from-red-900 to-red-700', Hope: 'from-green-900 to-green-700',
  Glory: 'from-yellow-900 to-yellow-700', Cunning: 'from-blue-900 to-blue-700',
  Knowledge: 'from-purple-900 to-purple-700', Order: 'from-orange-900 to-orange-700',
  Void: 'from-pink-900 to-pink-700', Chaos: 'from-emerald-900 to-emerald-700',
  Colorless: 'from-gray-900 to-gray-700',
};

export function PvPGameBoard({
  gameState, yourSeat, playerName, opponentName,
  messages, winner, onAction, onChat, onLeave,
}: PvPGameBoardProps) {

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<GameCard | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Selon le siège, "player" = toi, "opponent" = adversaire
  const you = yourSeat === 'host' ? gameState.player : gameState.opponent;
  const opponent = yourSeat === 'host' ? gameState.opponent : gameState.player;
  const isYourTurn =
    (yourSeat === 'host' && gameState.activePlayer === 'player') ||
    (yourSeat === 'guest' && gameState.activePlayer === 'opponent');
  const canAct = isYourTurn && gameState.phase === 'action' && gameState.turnState === 'open';
  const yourEnergy = you.runePool.filter(r => r.isExhausted).length;

  const send = (action: GameAction) => {
    onAction(action);
    setSelectedCard(null);
    setSelectedAttacker(null);
  };

  // ---------- Render Card ----------
  const renderCard = (
    card: GameCard,
    opts: { size?: 'sm' | 'md' | 'lg'; interactive?: boolean; isBack?: boolean } = {}
  ) => {
    const { size = 'md', interactive = false, isBack = false } = opts;
    const sizeClass = size === 'sm' ? 'w-12 h-16' : size === 'lg' ? 'w-28 h-40' : 'w-20 h-28';
    const isSel = selectedCard === card.id || selectedAttacker === card.id;
    const canAttackCard = card.canAttack && !card.isExhausted;

    return (
      <div
        key={card.id}
        draggable={interactive && canAct}
        onDragStart={e => { e.dataTransfer.setData('cardId', card.id); }}
        onClick={() => {
          if (!interactive) return;
          if (card.type === 'Unit' || card.type === 'Champion') {
            if (canAttackCard) setSelectedAttacker(p => p === card.id ? null : card.id);
          } else {
            setSelectedCard(p => p === card.id ? null : card.id);
          }
        }}
        onMouseEnter={() => setHoveredCard(card)}
        onMouseLeave={() => setHoveredCard(null)}
        className={`
          ${sizeClass} rounded-lg border-2 flex flex-col relative select-none transition-all
          ${DOMAIN_BORDER[card.domain] || 'border-gray-500'}
          ${isBack ? 'bg-gray-800 cursor-default' :
            `bg-gradient-to-br ${DOMAIN_GRADIENT[card.domain] || DOMAIN_GRADIENT.Colorless} cursor-pointer`}
          ${interactive && canAct && !isBack ? 'hover:scale-105 hover:-translate-y-2' : ''}
          ${isSel ? 'ring-4 ring-rift-gold scale-105 -translate-y-2' : ''}
          ${card.isExhausted ? 'opacity-50' : ''}
        `}
      >
        {isBack ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-2xl opacity-30">🃏</span>
          </div>
        ) : (
          <>
            {/* Energy */}
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow">
              {card.energyCost}
            </div>
            {/* Name */}
            <div className="flex-1 flex items-center justify-center p-1">
              <span className="text-[8px] font-bold text-center leading-tight text-white drop-shadow">
                {card.name.split(',')[0]}
              </span>
            </div>
            {/* Stats */}
            {(card.might > 0 || card.power > 0) && (
              <div className="flex justify-center gap-1 pb-1 text-[9px] font-bold">
                {card.might > 0 && <span className="text-red-300">{card.might}</span>}
                {card.power > 0 && <span className="text-green-300">{card.power}</span>}
              </div>
            )}
            {/* Attack badge */}
            {canAttackCard && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px]">⚔</div>
            )}
            {/* Damage */}
            {card.damage > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded text-white text-[7px] px-1 font-bold">-{card.damage}</div>
            )}
          </>
        )}
      </div>
    );
  };

  // ---------- Render Rune ----------
  const renderRune = (rune: Rune) => (
    <div
      key={rune.uid}
      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] transition-all ${
        DOMAIN_BORDER[rune.domain] || 'border-gray-500'
      } ${rune.isExhausted ? 'opacity-30 bg-gray-900' : 'bg-rift-dark animate-pulse'}`}
      title={`${rune.domain} Rune`}
    >
      🔮
    </div>
  );

  // ---------- Game Over ----------
  if (winner) {
    const youWon = (winner === 'host' && yourSeat === 'host') || (winner === 'guest' && yourSeat === 'guest');
    return (
      <div className="min-h-screen bg-gradient-to-b from-rift-dark to-rift-dark-secondary flex items-center justify-center">
        <div className="bg-rift-dark-secondary p-8 rounded-2xl border-2 border-rift-gold text-center max-w-md shadow-2xl">
          <div className="text-6xl mb-4">{youWon ? '🏆' : '💀'}</div>
          <h2 className={`text-4xl font-bold mb-4 ${youWon ? 'text-rift-gold' : 'text-rift-red'}`}>
            {youWon ? 'Victoire !' : 'Défaite'}
          </h2>
          <p className="text-gray-400 mb-6">
            Score final — Toi: {you.score} | {opponentName}: {opponent.score}
          </p>
          <button onClick={onLeave} className="px-8 py-3 bg-rift-blue text-rift-dark font-bold rounded-lg hover:bg-rift-blue/80">
            Retour au lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1117] to-[#1a1a2e] flex flex-col overflow-hidden">

      {/* ═══ TOP BAR ═══ */}
      <div className="bg-black/70 px-4 py-2 flex items-center justify-between text-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-rift-gold font-bold">Tour {gameState.turn}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            gameState.turnState === 'showdown' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
            {gameState.turnState === 'showdown' ? '⚔️ Combat' : PHASE_LABELS[gameState.phase]}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${isYourTurn ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'}`}>
            {isYourTurn ? 'Ton tour' : `Tour de ${opponentName}`}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-blue-400 font-bold">{you.score}</span>
            <span className="text-gray-600">/8</span>
            <span className="text-red-400 font-bold">{opponent.score}</span>
          </div>
          <button onClick={() => setShowChat(s => !s)} className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">
            💬 Chat
          </button>
          <button onClick={onLeave} className="text-xs px-2 py-1 border border-gray-700 text-gray-500 rounded hover:border-red-500 hover:text-red-400">
            Quitter
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ═══ BOARD ═══ */}
        <div className="flex-1 flex flex-col p-2 gap-1">

          {/* --- Opponent Hand (face down) --- */}
          <div className="flex justify-center gap-1 h-16 items-end">
            {opponent.hand.map((_, i) => (
              <div key={i} className="w-10 h-14 bg-gray-800 rounded border border-gray-700 flex items-center justify-center">
                <span className="text-gray-600 text-lg">🃏</span>
              </div>
            ))}
          </div>

          {/* --- Opponent Info Bar --- */}
          <div className="flex items-center justify-between px-3 py-1 bg-black/30 rounded text-xs">
            <span className="text-red-400 font-bold">{opponentName}</span>
            <div className="flex gap-1">{opponent.runePool.map((r: Rune) => renderRune(r))}</div>
            <span className="text-gray-500">Deck: {opponent.deck.length}</span>
          </div>

          {/* --- Opponent Battlefield --- */}
          <div className={`min-h-[90px] bg-black/20 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 p-2 transition-colors ${
            gameState.turnState === 'showdown' ? 'border-red-500/50' : 'border-gray-800'
          }`}>
            {gameState.battlefield.opponentUnits.length === 0
              ? <span className="text-gray-700 text-sm">Battlefield adversaire</span>
              : gameState.battlefield.opponentUnits.map((c: GameCard) => renderCard(c, { size: 'md' }))}
          </div>

          {/* --- Center / Battlefield Marker --- */}
          <div className={`flex items-center justify-center gap-3 py-1 rounded-lg border ${
            gameState.battlefield.controller === 'player' ? 'border-blue-500/40 bg-blue-500/5' :
            gameState.battlefield.controller === 'opponent' ? 'border-red-500/40 bg-red-500/5' :
            'border-gray-700/40 bg-gray-900/30'
          }`}>
            <span className="text-xs text-gray-500">
              {gameState.battlefield.controller === 'player' ? '🔵 Battlefield — Ton contrôle' :
               gameState.battlefield.controller === 'opponent' ? '🔴 Battlefield — Adversaire' :
               '⚪ Battlefield — Contesté'}
            </span>
            {gameState.battlefield.contested && <span className="text-xs text-red-400 font-bold animate-pulse">⚔️ Showdown</span>}
          </div>

          {/* --- Player Battlefield (droppable) --- */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const cardId = e.dataTransfer.getData('cardId');
              if (cardId && canAct) send({ type: 'PLAY_CARD', cardId });
            }}
            className={`min-h-[90px] rounded-xl border-2 flex items-center justify-center gap-2 p-2 transition-colors ${
              dragOver ? 'border-green-500 bg-green-500/10' :
              canAct ? 'border-gray-700 hover:border-gray-600' : 'border-gray-800'
            }`}
          >
            {gameState.battlefield.playerUnits.length === 0
              ? <span className="text-gray-700 text-sm">{canAct ? 'Glisse une carte ici pour la jouer' : 'Ton battlefield'}</span>
              : gameState.battlefield.playerUnits.map((c: GameCard) => renderCard(c, { size: 'md', interactive: true }))}
          </div>

          {/* --- Player Info Bar --- */}
          <div className="flex items-center justify-between px-3 py-1 bg-black/30 rounded text-xs">
            <span className="text-blue-400 font-bold">{playerName}</span>
            <div className="flex gap-1">{you.runePool.map((r: Rune) => renderRune(r))}</div>
            <span className="text-rift-blue font-bold">{yourEnergy}⚡ · Deck: {you.deck.length}</span>
          </div>

          {/* --- Player Hand --- */}
          <div className="flex justify-center gap-1 flex-wrap py-1">
            {you.hand.map(card => (
              <div
                key={card.uid}
                draggable={canAct && card.energyCost <= yourEnergy}
                onDragStart={e => { e.dataTransfer.setData('cardUid', card.uid); setSelectedCard(card.uid); }}
                className={`transition-all ${
                  canAct && card.energyCost <= yourEnergy
                    ? 'hover:scale-110 hover:-translate-y-4 cursor-grab'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {renderCard(card, { size: 'md', interactive: true })}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ CHAT (side panel) ═══ */}
        {showChat && (
          <div className="w-56 bg-black/60 border-l border-gray-800 flex flex-col p-2 shrink-0">
            <p className="text-xs text-gray-500 font-bold mb-2">Chat</p>
            <div className="flex-1 overflow-y-auto space-y-1 mb-2">
              {messages.map((m, i) => (
                <div key={i} className="text-xs">
                  <span className={`font-bold ${m.playerName === playerName ? 'text-blue-400' : 'text-red-400'}`}>
                    {m.playerName}:
                  </span>
                  <span className="text-gray-300 ml-1">{m.message}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && chatInput.trim()) {
                    onChat(chatInput.trim());
                    setChatInput('');
                  }
                }}
                placeholder="Message..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-rift-blue"
              />
              <button
                onClick={() => { if (chatInput.trim()) { onChat(chatInput.trim()); setChatInput(''); }}}
                className="bg-rift-blue text-rift-dark px-2 py-1 rounded text-xs font-bold"
              >
                ↵
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ ACTION BAR ═══ */}
      <div className="bg-black/80 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
        {/* Left - actions contextuelles */}
        <div className="flex items-center gap-2">
          {selectedCard && canAct && (
            <button
              onClick={() => send({ type: 'PLAY_CARD', cardId: selectedCard })}
              className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg text-sm animate-pulse"
            >
              ▶ Jouer la carte
            </button>
          )}
          {selectedAttacker && canAct && (
            gameState.turnState === 'showdown'
              ? gameState.battlefield.opponentUnits.map((card: GameCard) => (
                <button
                  key={card.uid}
                  onClick={() => send({ type: 'BLOCK', attackerId: card.uid, blockerId: selectedAttacker })}
                  className="px-3 py-2 bg-red-500 text-white font-bold rounded-lg text-sm"
                >
                  Bloquer {card.name.split(',')[0]}
                </button>
              ))
              : <button
                  onClick={() => send({ type: 'DECLARE_SHOWDOWN' })}
                  className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg text-sm"
                >
                  ⚔️ Attaquer
                </button>
          )}
        </div>

        {/* Right - phases */}
        <div className="flex items-center gap-2">
          {isYourTurn && gameState.phase === 'channel' && (
            <button onClick={() => send({ type: 'CHANNEL_RUNE' })} className="px-3 py-2 bg-purple-600 text-white font-bold rounded-lg text-sm">
              Canaliser
            </button>
          )}
          {isYourTurn && gameState.phase !== 'action' && (
            <button onClick={() => send({ type: 'SKIP_TO_ACTION' })} className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm">
              Passer →
            </button>
          )}
          {isYourTurn && (
            <button
              onClick={() => send({ type: gameState.phase === 'action' ? 'END_TURN' : 'NEXT_PHASE' })}
              className={`px-5 py-2 font-bold rounded-lg text-sm ${
                gameState.phase === 'action'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {gameState.phase === 'action' ? 'Finir le tour' : 'Phase →'}
            </button>
          )}
          {!isYourTurn && (
            <span className="text-xs text-gray-500 italic">En attente de {opponentName}...</span>
          )}
        </div>
      </div>

      {/* ═══ CARD PREVIEW (hover) ═══ */}
      {hoveredCard && (
        <div className="fixed bottom-24 left-4 w-48 bg-rift-dark-secondary border border-gray-700 rounded-xl p-3 shadow-2xl z-50 pointer-events-none">
          <p className="font-bold text-sm mb-1">{hoveredCard.name}</p>
          <p className="text-xs text-gray-400 mb-2">{hoveredCard.type} · {hoveredCard.domain}</p>
          {hoveredCard.rules && <p className="text-xs text-gray-300 italic">{hoveredCard.rules}</p>}
          <div className="flex gap-3 mt-2 text-xs">
            <span className="text-blue-400">⚡{hoveredCard.energyCost}</span>
            {hoveredCard.might > 0 && <span className="text-red-400">⚔{hoveredCard.might}</span>}
            {hoveredCard.power > 0 && <span className="text-green-400">🛡{hoveredCard.power}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
