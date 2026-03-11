'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GameClient } from '../components/GameClient';
import { initializeGame, initializeGameWithDeck, STARTER_DECKS } from '../engine';
import { getLocalDecks } from '../../lib/local-storage';
import type { GameState } from '../engine';

function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const starterId = searchParams.get('starterId');
  const deckId = searchParams.get('deckId');

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      let state: GameState;

      if (starterId && STARTER_DECKS[starterId]) {
        const deck = STARTER_DECKS[starterId];
        state = initializeGame(deck.domain, 'Cunning', starterId);
      } else if (deckId) {
        const saved = getLocalDecks();
        const deck = saved.find((d: any) => d.id === deckId);
        if (!deck) {
          setError('Deck introuvable. Retourne à la sélection.');
          return;
        }
        state = initializeGameWithDeck(deck.domain as any, deck);
      } else {
        // Aucun param → deck par défaut
        state = initializeGame('Fury', 'Cunning', 'draven-aggro');
      }

      setGameState(state);
    } catch (e) {
      setError('Erreur lors du chargement de la partie.');
      console.error(e);
    }
  }, [starterId, deckId]);

  if (error) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0a0c14', color: '#e8eaf0',
      fontFamily: "'Segoe UI', system-ui, sans-serif", gap: 16,
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <p style={{ color: '#e74c3c', fontSize: 16 }}>{error}</p>
      <button onClick={() => router.push('/arena')}
        style={{
          padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
          fontWeight: 700, fontSize: 14, color: '#0a0c14',
          background: 'linear-gradient(135deg, #C89B3C, #F0C060)',
        }}>
        ← Retour à l'arène
      </button>
    </div>
  );

  if (!gameState) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0c14', flexDirection: 'column', gap: 16,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ fontSize: 36, animation: 'spin 1s linear infinite' }}>⚔️</div>
      <div style={{ color: '#C89B3C', fontSize: 15, fontWeight: 700 }}>Préparation du plateau…</div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );

  return <GameClient initialState={gameState} />;
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0c14',
      }}>
        <div style={{ color: '#C89B3C', fontSize: 16 }}>Chargement…</div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
