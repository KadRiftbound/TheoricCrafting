'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PvPLobby } from './components/PvPLobby';
import { STARTER_DECKS } from './engine';
import { getLocalDecks } from '../lib/local-storage';

const DOMAIN_COLOR: Record<string, string> = {
  Fury: '#e74c3c', Hope: '#2ecc71', Glory: '#f1c40f', Cunning: '#3498db',
  Knowledge: '#9b59b6', Order: '#e67e22', Chaos: '#1abc9c', Colorless: '#7f8c8d',
};

function ArenaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckIdParam = searchParams.get('deckId');

  const [mode, setMode] = useState<'select' | 'pvp'>('select');
  const [selectedDeckId, setSelectedDeckId] = useState(deckIdParam || '');
  const [selectedStarterId, setSelectedStarterId] = useState('draven-aggro');
  const [savedDecks, setSavedDecks] = useState<any[]>([]);

  useEffect(() => { setSavedDecks(getLocalDecks()); }, []);

  const startPvE = () => {
    const params = new URLSearchParams();
    if (selectedDeckId) {
      params.set('deckId', selectedDeckId);
    } else {
      params.set('starterId', selectedStarterId);
    }
    router.push(`/arena/game?${params.toString()}`);
  };

  if (mode === 'pvp') return <PvPLobby />;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0d1117 0%, #0a0e1a 50%, #060c14 100%)',
      padding: '40px 16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#e8eaf0',
    }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚔️</div>
          <h1 style={{
            fontSize: 42, fontWeight: 900, margin: 0,
            background: 'linear-gradient(90deg, #C89B3C, #F0C060, #C89B3C)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: 2,
          }}>ARENA</h1>
          <p style={{ color: '#555', marginTop: 8, fontSize: 14 }}>Choisis ton deck et lance la partie</p>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* ── PvE ── */}
          <div style={{
            background: 'rgba(255,255,255,.03)', borderRadius: 16,
            border: '1px solid rgba(200,154,60,.2)', padding: 24,
            display: 'flex', flexDirection: 'column', gap: 18,
          }}>
            <div>
              <div style={{ fontSize: 32, marginBottom: 6 }}>🤖</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#C89B3C' }}>Contre l'IA</h2>
              <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Entraîne-toi à ton rythme</p>
            </div>

            {/* Decks de démarrage */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Decks de démarrage
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(STARTER_DECKS).map(([id, deck]) => {
                  const col = DOMAIN_COLOR[deck.domain] || '#888';
                  const active = selectedStarterId === id && !selectedDeckId;
                  return (
                    <button key={id} onClick={() => { setSelectedStarterId(id); setSelectedDeckId(''); }}
                      style={{
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        border: `1.5px solid ${active ? col : 'rgba(255,255,255,.08)'}`,
                        background: active ? `${col}18` : 'rgba(255,255,255,.02)',
                        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                      {deck.imageUrl ? (
                        <div style={{ width: 32, height: 40, borderRadius: 6, overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                          <img src={deck.imageUrl} alt={deck.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: 32, height: 40, borderRadius: 6, background: '#222', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 16, opacity: 0.3 }}>🃏</span>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#fff' : '#bbb' }}>{deck.name}</div>
                        <div style={{ fontSize: 10, color: '#555' }}>{deck.domain} · {deck.cards.length} cartes</div>
                      </div>
                      {active && <span style={{ marginLeft: 'auto', fontSize: 10, color: col, fontWeight: 700 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Decks sauvegardés */}
            {savedDecks.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Mes decks
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {savedDecks.map(d => {
                    const col = DOMAIN_COLOR[d.domain] || '#888';
                    const active = selectedDeckId === d.id;
                    return (
                      <button key={d.id} onClick={() => { setSelectedDeckId(d.id); setSelectedStarterId(''); }}
                        style={{
                          padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                          border: `1.5px solid ${active ? col : 'rgba(255,255,255,.08)'}`,
                          background: active ? `${col}18` : 'rgba(255,255,255,.02)',
                          transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: col, flexShrink: 0, boxShadow: active ? `0 0 8px ${col}` : 'none' }}/>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#fff' : '#bbb' }}>{d.name}</div>
                          <div style={{ fontSize: 10, color: '#555' }}>{d.domain} · {d.cards?.length ?? 0} cartes</div>
                        </div>
                        {active && <span style={{ marginLeft: 'auto', fontSize: 10, color: col, fontWeight: 700 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bouton lancer */}
            <button onClick={startPvE}
              style={{
                padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontWeight: 900, fontSize: 15, color: '#0a0c14', marginTop: 'auto',
                background: 'linear-gradient(135deg, #C89B3C, #F0C060)',
                boxShadow: '0 4px 20px rgba(200,154,60,.35)',
                transition: 'all .2s',
              }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = '0 6px 28px rgba(200,154,60,.55)')}
              onMouseOut={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(200,154,60,.35)')}>
              ⚔️ Lancer la partie
            </button>
          </div>

          {/* ── PvP ── */}
          <div style={{
            background: 'rgba(255,255,255,.03)', borderRadius: 16,
            border: '1px solid rgba(155,89,182,.2)', padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 12, right: 12, padding: '3px 10px',
              background: '#9b59b6', borderRadius: 20, fontSize: 10, fontWeight: 900, color: '#fff',
            }}>NOUVEAU</div>

            <div>
              <div style={{ fontSize: 32, marginBottom: 6 }}>⚔️</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#9b59b6' }}>Joueur vs Joueur</h2>
              <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Affronte un autre joueur en temps réel</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#666' }}>
              {[
                { icon: '✓', col: '#2ecc71', txt: 'Synchronisé en temps réel' },
                { icon: '✓', col: '#2ecc71', txt: 'Room privée avec code' },
                { icon: '✓', col: '#2ecc71', txt: 'Chat intégré' },
                { icon: '⚠', col: '#f1c40f', txt: 'Requiert le serveur PvP (port 3004)' },
              ].map(({ icon, col, txt }) => (
                <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: col, fontWeight: 700 }}>{icon}</span>
                  <span>{txt}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setMode('pvp')}
              style={{
                marginTop: 'auto', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontWeight: 900, fontSize: 15, color: '#fff',
                background: 'linear-gradient(135deg, #6c3483, #9b59b6)',
                boxShadow: '0 4px 20px rgba(155,89,182,.3)',
                transition: 'all .2s',
              }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = '0 6px 28px rgba(155,89,182,.5)')}
              onMouseOut={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(155,89,182,.3)')}>
              Rejoindre le PvP
            </button>
          </div>
        </div>

        {/* Règles */}
        <div style={{
          background: 'rgba(255,255,255,.02)', borderRadius: 12,
          border: '1px solid rgba(255,255,255,.06)', padding: '20px 24px',
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Rappel des règles
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 12, color: '#666' }}>
            {[
              ['🏆', 'Objectif', '#C89B3C', 'Marquer 8 points'],
              ['🔮', 'Rune', '#9b59b6', 'Canalise tes runes comme ressources'],
              ['🃏', 'Main', '#3498db', 'Pioche et joue tes cartes librement'],
              ['⚔️', 'Battlefield', '#e74c3c', 'Contrôler un BF = marquer des points'],
              ['💤', 'Exhaustion', '#e67e22', 'Les unités attaquantes s\'épuisent'],
              ['🖱️', 'Drag & Drop', '#2ecc71', 'Glisse les cartes partout sur le plateau'],
            ].map(([icon, label, col, desc]) => (
              <div key={label as string} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <div>
                  <span style={{ color: col as string, fontWeight: 700 }}>{label} — </span>
                  <span>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArenaPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0c14' }}>
        <div style={{ color: '#C89B3C', fontSize: 16 }}>Chargement…</div>
      </div>
    }>
      <ArenaContent />
    </Suspense>
  );
}
