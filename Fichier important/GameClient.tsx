'use client';

import { useState, useEffect, useRef } from 'react';
import {
  initializeGame,
  type GameState, type GameCard, type Rune, type Phase,
} from '../engine';

const DC: Record<string, string> = {
  Fury:'#e74c3c', Hope:'#2ecc71', Glory:'#f1c40f', Cunning:'#3498db',
  Knowledge:'#9b59b6', Order:'#e67e22', Chaos:'#1abc9c', Calm:'#00bcd4',
  Body:'#ff9800', Mind:'#e91e63', Void:'#ec4899', Colorless:'#7f8c8d',
};
const DE: Record<string, string> = {
  Fury:'🔥', Hope:'💚', Glory:'⭐', Cunning:'💧',
  Knowledge:'🔮', Order:'🟠', Chaos:'🌀', Calm:'🩵',
  Body:'🟡', Mind:'💗', Void:'🟣', Colorless:'⚪',
};
const RUNE_IMAGE: Record<string, string> = {
  'Fury':  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/09da06c69d07d4e72dde703737ef167472c715af-1488x2078.png',
  'Calm':  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0a0e8c3d16c2595e2f8efcc2b1466226539b506c-744x1039.png',
  'Mind':  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ecf8c8632c728520b51cd4bc79036677e96ebdfd-1488x2078.png',
  'Body':  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3b3c3c07626d6180457c849047e0228dc0d19539-744x1039.png',
  'Chaos': 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/daf23b0deaa5e1a5a5d310b59e9ad25d1bd70363-744x1039.png',
  'Order': 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0e4904221c3bbbfcfde1734bc414dbe97c67e295-1488x2078.png',
};
type BoardZone = 'my-bf1'|'my-bf2'|'my-base'|'my-runes'|'my-champion'|'my-legend'|'terrain-left'|'terrain-right'|'opp-bf1'|'opp-bf2'|'opp-base'|'opp-runes'|'opp-legend'|'opp-champion';

interface PlacedCard {
  uid: string;
  card?: GameCard;
  rune?: Rune;
  x: number; y: number;
  zone: BoardZone;
  tapped: boolean;
  faceDown: boolean;
  revealed: boolean;
}

type CtxItem = { label: string; action: () => void };
type CtxState = { x: number; y: number; items: CtxItem[] } | null;

// ── Carte visuelle ────────────────────────────────────────────────────────────
function CardVis({ card, w=72, h=100, tapped, faceDown, revealed, selected, backColor, onClick, onDoubleClick, onContextMenu, onDragStart, draggable, onMouseEnter, onMouseLeave }: {
  card: GameCard; w?: number; h?: number;
  tapped?: boolean; faceDown?: boolean; revealed?: boolean; selected?: boolean; backColor?: string;
  onClick?: () => void; onDoubleClick?: () => void; onContextMenu?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void; draggable?: boolean;
  onMouseEnter?: () => void; onMouseLeave?: () => void;
}) {
  const color = DC[card.domain]||'#7f8c8d';
  if (faceDown) {
    const bg = backColor==='red'
      ? 'linear-gradient(135deg,#3d0a0a,#1a0505)'
      : 'linear-gradient(135deg,#1a2744,#0d1520)';
    const border = backColor==='red' ? '#5a1010' : '#2a3a5a';
    return (
      <div onClick={onClick} draggable={draggable} onDragStart={onDragStart}
        style={{width:w,height:h,borderRadius:7,flexShrink:0,cursor:'pointer',
          background:bg,border:`2px solid ${border}`,
          transform:tapped?'rotate(90deg)':undefined,transition:'transform .2s',
          boxShadow:'0 2px 8px rgba(0,0,0,.7)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:backColor==='red'?'repeating-linear-gradient(45deg,rgba(180,20,20,.12) 0,rgba(180,20,20,.12) 1px,transparent 1px,transparent 8px),repeating-linear-gradient(-45deg,rgba(180,20,20,.12) 0,rgba(180,20,20,.12) 1px,transparent 1px,transparent 8px)':'repeating-linear-gradient(45deg,rgba(30,80,160,.12) 0,rgba(30,80,160,.12) 1px,transparent 1px,transparent 8px),repeating-linear-gradient(-45deg,rgba(30,80,160,.12) 0,rgba(30,80,160,.12) 1px,transparent 1px,transparent 8px)'}}/>
        <div style={{position:'absolute',inset:6,borderRadius:4,border:`1px solid ${backColor==='red'?'rgba(180,20,20,.3)':'rgba(30,80,160,.3)'}`}}/>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,opacity:.4}}>{backColor==='red'?'🔴':'⚔️'}</div>
      </div>
    );
  }
  return (
    <div draggable={draggable} onDragStart={onDragStart} onClick={onClick} onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      style={{width:w,height:h,borderRadius:7,flexShrink:0,position:'relative',overflow:'hidden',
        border:`2px solid ${selected?'#f1c40f':revealed?'#f1c40f80':color+'80'}`,
        boxShadow:selected?`0 0 0 2px #f1c40f,0 0 16px #f1c40f60`:`0 0 8px ${color}30,0 3px 10px rgba(0,0,0,.8)`,
        transform:tapped?'rotate(90deg)':selected?'scale(1.05)':undefined,
        opacity:card.isExhausted ? 0.5 : 1,cursor:draggable?'grab':'pointer',
        transition:'transform .15s ease',
        background:card.imageUrl?undefined:`linear-gradient(160deg,#0d1520,#060a0f)`}}>
      {card.imageUrl&&<img src={card.imageUrl} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
      <div style={{position:'absolute',inset:0,background:card.imageUrl?'linear-gradient(to bottom,rgba(0,0,0,0) 55%,rgba(0,0,0,.85) 100%)':`linear-gradient(160deg,${color}15 0%,transparent 60%)`}}/>
      <div style={{position:'absolute',top:3,left:3,zIndex:3,width:17,height:17,borderRadius:'50%',background:'#1a56db',border:'1.5px solid #3b82f6',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:8}}>{card.energyCost}</div>
      <div style={{position:'absolute',bottom:card.might>0||card.power>0?13:2,left:0,right:0,padding:'0 3px',zIndex:2,textAlign:'center',fontSize:7,fontWeight:700,color:'#fff',textShadow:'0 1px 3px #000,0 0 6px #000',lineHeight:1.2}}>{card.name.split(',')[0]}</div>
      {(card.might>0||card.power>0)&&<div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',justifyContent:'space-between',padding:'1px 4px',background:'rgba(0,0,0,.85)',fontSize:9,fontWeight:900,zIndex:2}}><span style={{color:'#e74c3c'}}>{card.might||''}</span><span style={{color:'#2ecc71'}}>{card.power>0?Math.max(0,card.power-card.damage):''}</span></div>}
      {revealed&&<div style={{position:'absolute',top:2,right:2,fontSize:8,background:'#f1c40f',color:'#000',borderRadius:3,padding:'0 3px',fontWeight:900,zIndex:4}}>👁</div>}
    </div>
  );
}

// ── Rune-carte visuelle ───────────────────────────────────────────────────────
function RuneCardVis({ rune, w=72, h=100, tapped, faceDown, selected, onClick, onContextMenu, onDragStart, draggable, onMouseEnter, onMouseLeave }: {
  rune: Rune; w?: number; h?: number;
  tapped?: boolean; faceDown?: boolean; selected?: boolean;
  onClick?: () => void; onContextMenu?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void; draggable?: boolean;
  onMouseEnter?: () => void; onMouseLeave?: () => void;
}) {
  const color = DC[rune.domain]||'#7f8c8d';
  const emoji = DE[rune.domain]||'🔮';
  const imgUrl = RUNE_IMAGE[rune.domain];
  if (faceDown) return (
    <div onClick={onClick} draggable={draggable} onDragStart={onDragStart}
      style={{width:w,height:h,borderRadius:7,flexShrink:0,cursor:'pointer',
        background:'linear-gradient(135deg,#1a2744,#0d1520)',border:'2px solid #2a3a5a',
        transform:tapped?'rotate(90deg)':undefined,transition:'transform .2s'}}/>
  );
  return (
    <div draggable={draggable} onDragStart={onDragStart} onClick={onClick}
      onContextMenu={onContextMenu} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      style={{width:w,height:h,borderRadius:7,flexShrink:0,position:'relative',overflow:'hidden',
        border:`2px solid ${selected?'#f1c40f':tapped?color+'80':rune.isExhausted?'#1e2535':color}`,
        boxShadow:rune.isExhausted?'none':`0 0 14px ${color}55,0 3px 10px rgba(0,0,0,.8)`,
        transform:tapped?'rotate(90deg)':undefined,
        opacity:rune.isExhausted ? 0.4 : 1,cursor:draggable?'grab':'pointer',
        transition:'transform .15s ease',
        background:imgUrl?undefined:`radial-gradient(ellipse at center,${color}22 0%,#080a14 70%)`}}>
      {imgUrl
        ? <img src={imgUrl} alt={rune.domain} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:rune.isExhausted ? 0.4 : 1}}/>
        : <>
            <div style={{position:'absolute',inset:0,background:`repeating-linear-gradient(45deg,${color}08 0,${color}08 2px,transparent 2px,transparent 10px)`}}/>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:38,opacity:.75,userSelect:'none'}}>{emoji}</div>
          </>
      }
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0) 60%,rgba(0,0,0,.75) 100%)'}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'3px 4px',textAlign:'center',fontSize:7,fontWeight:900,color,letterSpacing:.5}}>{rune.domain.toUpperCase()}</div>
      {tapped&&<div style={{position:'absolute',top:2,left:2,fontSize:8,background:`${color}cc`,color:'#000',borderRadius:3,padding:'0 3px',fontWeight:900,zIndex:4}}>PAYÉ</div>}
    </div>
  );
}

// ── Preview carte ──────────────────────────────────────────────────────────────
function CardPreview({ card }: { card: GameCard }) {
  const color = DC[card.domain]||'#7f8c8d';
  return (
    <div style={{position:'fixed',bottom:220,left:10,width:185,zIndex:9999,pointerEvents:'none',borderRadius:12,background:`linear-gradient(160deg,#0d1520,#060810)`,border:`1.5px solid ${color}50`,boxShadow:`0 0 30px rgba(0,0,0,.95),0 0 15px ${color}20`}}>
      <div style={{padding:10}}>
        <div style={{fontWeight:900,fontSize:12,marginBottom:2,color}}>{card.name}</div>
        <div style={{fontSize:9,color:'#888',marginBottom:5}}>{card.type} · {card.domain}</div>
        {card.rules&&<div style={{fontSize:10,color:'#ccc',fontStyle:'italic',lineHeight:1.4,borderTop:'1px solid rgba(255,255,255,.07)',paddingTop:5,marginBottom:5}}>{card.rules}</div>}
        <div style={{display:'flex',gap:10,fontSize:10,borderTop:'1px solid rgba(255,255,255,.07)',paddingTop:5}}>
          <span style={{color:'#3b82f6',fontWeight:700}}>⚡{card.energyCost}</span>
          {card.might>0&&<span style={{color:'#e74c3c',fontWeight:700}}>⚔{card.might}</span>}
          {card.power>0&&<span style={{color:'#2ecc71',fontWeight:700}}>🛡{card.power}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Context menu ───────────────────────────────────────────────────────────────
function CtxMenu({ x, y, items, onClose }: { x:number;y:number;items:CtxItem[];onClose:()=>void }) {
  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:998}} onClick={onClose}/>
      <div style={{position:'fixed',zIndex:999,minWidth:195,borderRadius:10,overflow:'hidden',left:Math.min(x,window.innerWidth-215),top:Math.min(y,window.innerHeight-260),background:'#0c0e18',border:'1px solid rgba(255,255,255,.12)',boxShadow:'0 8px 40px rgba(0,0,0,.95)'}}>
        {items.map((it,i)=>(
          <button key={i} onClick={()=>{it.action();onClose();}} style={{display:'block',width:'100%',textAlign:'left',padding:'9px 14px',fontSize:13,color:'#ddd',background:'none',border:'none',cursor:'pointer',borderBottom:i<items.length-1?'1px solid rgba(255,255,255,.06)':'none'}}
            onMouseOver={e=>(e.currentTarget.style.background='rgba(255,255,255,.06)')}
            onMouseOut={e=>(e.currentTarget.style.background='none')}>
            {it.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ── Modal deck principal ───────────────────────────────────────────────────────
function DeckModal({ deck, title, onClose, onTakeCard, onShuffle }: {
  deck: GameCard[]; title: string; onClose: () => void;
  onTakeCard?: (uid: string) => void; onShuffle?: () => void;
}) {
  const [hov, setHov] = useState<GameCard|null>(null);
  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:1000}} onClick={onClose}/>
      <div style={{position:'fixed',top:'8%',left:'50%',transform:'translateX(-50%)',width:'min(720px,94vw)',maxHeight:'78vh',zIndex:1001,borderRadius:14,overflow:'hidden',background:'#0c0e18',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 20px 60px rgba(0,0,0,.95)',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
          <div style={{fontWeight:900,fontSize:15}}>{title} <span style={{color:'#555',fontSize:12}}>({deck.length} cartes)</span></div>
          <div style={{display:'flex',gap:8}}>
            {onShuffle&&<button onClick={onShuffle} style={{padding:'5px 12px',borderRadius:7,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,color:'#fff',background:'rgba(52,152,219,.3)'}}>🔀 Mélanger</button>}
            <button onClick={onClose} style={{padding:'5px 12px',borderRadius:7,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,color:'#fff',background:'rgba(255,255,255,.08)'}}>✕</button>
          </div>
        </div>
        <div style={{overflowY:'auto',padding:12,display:'flex',flexWrap:'wrap',gap:8}}>
          {deck.length===0&&<div style={{color:'#444',fontSize:13,padding:20}}>Deck vide</div>}
          {deck.map((card,i)=>(
            <div key={card.uid} style={{position:'relative'}} onMouseEnter={()=>setHov(card)} onMouseLeave={()=>setHov(null)}>
              <CardVis card={card} w={70} h={98}/>
              <div style={{textAlign:'center',fontSize:9,color:'#555',marginTop:2}}>#{i+1}</div>
              {onTakeCard&&<button onClick={()=>{onTakeCard(card.uid);onClose();}} style={{position:'absolute',bottom:18,left:0,right:0,margin:'0 4px',padding:'2px 0',borderRadius:4,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,color:'#fff',background:'rgba(46,204,113,.75)'}}>✋ En main</button>}
            </div>
          ))}
        </div>
      </div>
      {hov&&<div style={{position:'fixed',bottom:20,right:20,zIndex:1010,pointerEvents:'none'}}><CardPreview card={hov}/></div>}
    </>
  );
}

// ── Modal top-N ────────────────────────────────────────────────────────────────
function TopNModal({ deck, n, onClose, onTakeCard }: { deck:GameCard[];n:number;onClose:()=>void;onTakeCard:(uid:string)=>void }) {
  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:1000}} onClick={onClose}/>
      <div style={{position:'fixed',top:'14%',left:'50%',transform:'translateX(-50%)',width:'min(720px,92vw)',zIndex:1001,borderRadius:14,overflow:'hidden',background:'#0c0e18',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 20px 60px rgba(0,0,0,.95)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
          <div style={{fontWeight:900,fontSize:14}}>Top {n} du deck</div>
          <button onClick={onClose} style={{padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',color:'#fff',background:'rgba(255,255,255,.08)',fontSize:12}}>✕</button>
        </div>
        <div style={{padding:12,display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
          {deck.slice(0,n).map((card,i)=>(
            <div key={card.uid} style={{textAlign:'center',position:'relative'}}>
              <CardVis card={card} w={68} h={95}/>
              <div style={{fontSize:9,color:'#555',marginTop:2}}>#{i+1}</div>
              <button onClick={()=>{onTakeCard(card.uid);onClose();}} style={{position:'absolute',bottom:18,left:0,right:0,margin:'0 4px',padding:'2px 0',borderRadius:4,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,color:'#fff',background:'rgba(46,204,113,.75)'}}>✋ En main</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Discard pile visuel ──────────────────────────────────────────────────────
function DiscardPile({ cards, label, side, onContextMenu, onDrop }: {
  cards: GameCard[]; label: string; side: 'player'|'opponent';
  onContextMenu: (e: React.MouseEvent) => void;
  onDrop?: (uid: string) => void;
}) {
  const top = cards[0];
  const color = side==='player' ? '#3498db' : '#e74c3c';
  const [over, setOver] = useState(false);
  return (
    <div onContextMenu={onContextMenu}
      onDragOver={e=>{e.preventDefault();if(onDrop)setOver(true);}}
      onDragLeave={()=>setOver(false)}
      onDrop={e=>{
        e.preventDefault();setOver(false);
        if(!onDrop)return;
        const uid=e.dataTransfer.getData('cardUid')||e.dataTransfer.getData('placedUid');
        if(uid) onDrop(uid);
      }}
      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'context-menu',flexShrink:0,userSelect:'none',
        opacity:over?0.7:1,transition:'opacity .15s',
        outline:over?`2px dashed ${color}`:'none',borderRadius:8,padding:2}}>
      <div style={{position:'relative',width:60,height:84}}>
        {cards.length>1&&<div style={{position:'absolute',top:-2,left:-2,width:60,height:84,borderRadius:6,background:'rgba(0,0,0,.4)',border:`1px solid ${color}20`}}/>}
        {top
          ? <div style={{position:'absolute',inset:0,borderRadius:6,overflow:'hidden',border:`1.5px solid ${color}40`,boxShadow:`0 0 8px ${color}20`}}>
              {top.imageUrl
                ? <img src={top.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',opacity:.85}}/>
                : <div style={{width:'100%',height:'100%',background:'linear-gradient(160deg,'+(DC[top.domain]||'#333')+'20,#0d1520)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🗑</div>
              }
              <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.7) 100%)'}}/>
              <div style={{position:'absolute',bottom:2,left:0,right:0,textAlign:'center',fontSize:7,color:'#aaa',fontWeight:700}}>{top.name.split(',')[0]}</div>
            </div>
          : <div style={{width:60,height:84,borderRadius:6,border:`1.5px dashed ${color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,opacity:.3}}>🗑</div>
        }
        {cards.length>0&&<div style={{position:'absolute',top:-5,right:-5,background:color,borderRadius:'50%',width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:'#fff',border:'2px solid #0d1b2a'}}>{cards.length}</div>}
      </div>
      <span style={{fontSize:8,color:color+'80',fontWeight:700,letterSpacing:.5}}>{label}</span>
    </div>
  );
}

// ── Spell Stack (zone droite, milieu écran) ───────────────────────────────────
function SpellStackZone({ cards, onDiscard }: { cards: GameCard[]; onDiscard: (uid:string)=>void }) {
  const [hovCard, setHovCard] = useState<GameCard|null>(null);
  if (cards.length===0) return null;
  const MAX_VISIBLE = 4;
  const visible = cards.slice(0, MAX_VISIBLE);
  return (
    <>
      <div style={{position:'fixed',right:20,top:'50%',transform:'translateY(-50%)',zIndex:200,
        display:'flex',flexDirection:'column',alignItems:'flex-end',pointerEvents:'none'}}>
        {/* Label */}
        <div style={{fontSize:9,fontWeight:800,color:'rgba(241,196,15,.55)',letterSpacing:1.5,marginBottom:6,
          textTransform:'uppercase',textAlign:'right',
          textShadow:'0 0 10px rgba(241,196,15,.3)'}}>
          ✨ Pile de sorts · {cards.length}
        </div>
        {/* Cartes empilées */}
        <div style={{position:'relative',width:156,height:218+((visible.length-1)*6)}}>
          {[...visible].reverse().map((card, ri) => {
            const i = visible.length - 1 - ri; // index réel (0 = top)
            const isTop = i === 0;
            const offset = i * 6;
            return (
              <div key={card.uid}
                style={{position:'absolute',top:offset,left:offset/2,pointerEvents:'auto',
                  zIndex:visible.length - i,
                  filter:isTop?'none':'brightness(0.55)',
                  transition:'all .2s'}}
                onMouseEnter={()=>isTop&&setHovCard(card)}
                onMouseLeave={()=>setHovCard(null)}
                onContextMenu={e=>{
                  if(!isTop) return;
                  e.preventDefault();
                  onDiscard(card.uid);
                }}>
                {card.imageUrl
                  ? <img src={card.imageUrl} alt={card.name}
                      style={{width:146,borderRadius:10,display:'block',
                        boxShadow:isTop
                          ?`0 0 24px rgba(241,196,15,.35),0 6px 20px rgba(0,0,0,.9),inset 0 0 0 1.5px rgba(241,196,15,.25)`
                          :'0 2px 8px rgba(0,0,0,.7)'}}/>
                  : <div style={{width:146,height:204,borderRadius:10,
                      background:'linear-gradient(160deg,'+(DC[card.domain]||'#333')+'25,#0d1520)',
                      border:isTop?'1.5px solid '+(DC[card.domain]||'#888')+'90':'1.5px solid #1a1a2e',
                      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,padding:12}}>
                      <div style={{fontSize:30}}>{DE[card.domain]||'✨'}</div>
                      <div style={{fontSize:10,fontWeight:900,color:isTop?'#fff':'#555',textAlign:'center',lineHeight:1.3}}>{card.name}</div>
                    </div>
                }
                {/* Badge nom + type sur la top card */}
                {isTop&&<div style={{position:'absolute',bottom:0,left:0,right:0,
                  background:'linear-gradient(transparent,rgba(0,0,0,.85))',
                  borderBottomLeftRadius:10,borderBottomRightRadius:10,padding:'20px 6px 6px'}}>
                  <div style={{fontSize:8,fontWeight:800,color:'#f1c40f',textAlign:'center',
                    textShadow:'0 1px 4px rgba(0,0,0,.8)',lineHeight:1.3,letterSpacing:.3}}>
                    {card.name.length>18?card.name.slice(0,17)+'…':card.name}
                  </div>
                </div>}
                {/* Bouton défausser — top card uniquement */}
                {isTop&&<button
                  onClick={e=>{e.stopPropagation();onDiscard(card.uid);}}
                  title="Défausser ce sort"
                  style={{position:'absolute',top:5,right:5,width:22,height:22,borderRadius:'50%',
                    border:'1.5px solid rgba(231,76,60,.6)',cursor:'pointer',
                    background:'rgba(20,8,8,.85)',color:'#e74c3c',
                    fontSize:11,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',
                    backdropFilter:'blur(4px)',transition:'all .15s',zIndex:10}}
                  onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background='rgba(231,76,60,.8)';(e.currentTarget as HTMLElement).style.color='#fff';}}
                  onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background='rgba(20,8,8,.85)';(e.currentTarget as HTMLElement).style.color='#e74c3c';}}>
                  ✕
                </button>}
              </div>
            );
          })}
        </div>
        {cards.length > MAX_VISIBLE&&(
          <div style={{marginTop:6,fontSize:9,color:'rgba(241,196,15,.4)',fontWeight:700}}>
            +{cards.length - MAX_VISIBLE} sous la pile
          </div>
        )}
      </div>
      {/* Preview au hover */}
      {hovCard&&(
        <div style={{position:'fixed',right:180,top:'50%',transform:'translateY(-50%)',zIndex:201,pointerEvents:'none'}}>
          <CardPreview card={hovCard}/>
        </div>
      )}
    </>
  );
}

// ── Modal discard ─────────────────────────────────────────────────────────────
function DiscardModal({ cards, title, onClose, onTakeToHand, onPlayToBF }: {
  cards: GameCard[]; title: string; onClose: ()=>void;
  onTakeToHand: (uid:string)=>void;
  onPlayToBF: (uid:string)=>void;
}) {
  const [hov, setHov] = useState<GameCard|null>(null);
  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:1000}} onClick={onClose}/>
      <div style={{position:'fixed',top:'8%',left:'50%',transform:'translateX(-50%)',width:'min(740px,94vw)',maxHeight:'78vh',
        zIndex:1001,borderRadius:14,overflow:'hidden',background:'#0c0e18',
        border:'1px solid rgba(231,76,60,.2)',boxShadow:'0 20px 60px rgba(0,0,0,.95)',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
          <div style={{fontWeight:900,fontSize:15}}>🗑 {title} <span style={{color:'#555',fontSize:12}}>({cards.length} cartes)</span></div>
          <button onClick={onClose} style={{padding:'5px 12px',borderRadius:7,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,color:'#fff',background:'rgba(255,255,255,.08)'}}>✕</button>
        </div>
        <div style={{overflowY:'auto',padding:12,display:'flex',flexWrap:'wrap',gap:8}}>
          {cards.length===0&&<div style={{color:'#444',fontSize:13,padding:20}}>Défausse vide</div>}
          {[...cards].reverse().map((card,i)=>(
            <div key={card.uid} style={{position:'relative'}} onMouseEnter={()=>setHov(card)} onMouseLeave={()=>setHov(null)}>
              <CardVis card={card} w={72} h={100}/>
              <div style={{display:'flex',gap:2,marginTop:3}}>
                <button onClick={()=>{onTakeToHand(card.uid);onClose();}}
                  style={{flex:1,padding:'3px 2px',borderRadius:4,border:'none',cursor:'pointer',fontSize:8,fontWeight:700,color:'#fff',background:'rgba(46,204,113,.7)'}}>✋ Main</button>
                <button onClick={()=>{onPlayToBF(card.uid);onClose();}}
                  style={{flex:1,padding:'3px 2px',borderRadius:4,border:'none',cursor:'pointer',fontSize:8,fontWeight:700,color:'#fff',background:'rgba(52,152,219,.7)'}}>▶ Plateau</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {hov&&<div style={{position:'fixed',bottom:20,right:20,zIndex:1010,pointerEvents:'none'}}><CardPreview card={hov}/></div>}
    </>
  );
}

// ── Deck pile visuel ───────────────────────────────────────────────────────────
function DeckPile({ count, color, onClick, onContextMenu, title, label }: {
  count:number; color:string; onClick?:()=>void; onContextMenu?:(e:React.MouseEvent)=>void; title?:string; label?:string;
}) {
  const [hov, setHov] = useState(false);
  const W=88, H=122;
  return (
    <div onClick={onClick} onContextMenu={onContextMenu} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} title={title}
      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:onClick?'pointer':'default',flexShrink:0,userSelect:'none'}}>
      {/* Pile effet 3D avec dos de carte */}
      <div style={{position:'relative',width:W,height:H}}>
        {/* Cartes derrière (effet pile) */}
        {count>2&&<div style={{position:'absolute',top:-3,left:-3,width:W,height:H,borderRadius:7,background:'linear-gradient(135deg,#1a2744,#0d1520)',border:'1.5px solid #1e2d4a'}}/>}
        {count>1&&<div style={{position:'absolute',top:-1.5,left:-1.5,width:W,height:H,borderRadius:7,background:'linear-gradient(135deg,#1e2e50,#0f1a2e)',border:'1.5px solid #243659'}}/>}
        {/* Carte du dessus — vrai dos */}
        <div style={{position:'absolute',inset:0,borderRadius:7,overflow:'hidden',
          border:`1.5px solid ${hov&&onClick?color:color+'40'}`,
          boxShadow:hov&&onClick?`0 0 18px ${color}60,0 4px 16px rgba(0,0,0,.8)`:`0 4px 12px rgba(0,0,0,.7)`,
          transition:'all .2s',
          background:'linear-gradient(135deg,#0f1520 0%,#1a2744 50%,#0d1520 100%)'}}>
          {/* Motif dos de carte */}
          <div style={{position:'absolute',inset:0,
            background:`repeating-linear-gradient(45deg,${color}18 0,${color}18 1px,transparent 1px,transparent 8px),repeating-linear-gradient(-45deg,${color}18 0,${color}18 1px,transparent 1px,transparent 8px)`}}/>
          {/* Bordure intérieure dorée */}
          <div style={{position:'absolute',inset:6,borderRadius:4,border:`1px solid ${color}35`}}/>
          {/* Logo central */}
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:`radial-gradient(circle,${color}40,${color}10)`,border:`1.5px solid ${color}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>⚔️</div>
            <span style={{fontSize:15,fontWeight:900,color:hov&&onClick?color:color+'cc',textShadow:`0 0 8px ${color}80`}}>{count}</span>
          </div>
        </div>
      </div>
      {label&&<span style={{fontSize:9,color:color+'80',fontWeight:700,letterSpacing:.5}}>{label}</span>}
    </div>
  );
}

// ── Zone de plateau (drop target) ─────────────────────────────────────────────
function ZoneEl({ id, label, color, onDrop, children, maxW }: {
  id: BoardZone; label: string; color: string;
  onDrop: (uid:string, x:number, y:number, zone:BoardZone)=>void;
  children?: React.ReactNode;
  maxW?: number;
}) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} style={{flex:1,position:'relative',borderRadius:6,minHeight:0,maxWidth:maxW,
      border:`1.5px solid ${over?color+'90':'rgba(255,255,255,.12)'}`,
      background:over?`${color}08`:'rgba(0,0,0,.15)',transition:'all .15s',overflow:'visible'}}
      onDragOver={e=>{e.preventDefault();setOver(true);}}
      onDragLeave={()=>setOver(false)}
      onDrop={e=>{
        e.preventDefault();setOver(false);
        const uid=e.dataTransfer.getData('placedUid')||e.dataTransfer.getData('cardUid')||e.dataTransfer.getData('runeUid');
        if(!uid||!ref.current)return;
        const r=ref.current.getBoundingClientRect();
        const x=Math.max(5,Math.min(88,((e.clientX-r.left)/r.width)*100));
        const y=Math.max(5,Math.min(82,((e.clientY-r.top)/r.height)*100));
        onDrop(uid,x,y,id);
      }}>
      <div style={{position:'absolute',top:4,left:7,fontSize:8,fontWeight:700,color:`${color}45`,letterSpacing:1,textTransform:'uppercase',pointerEvents:'none',userSelect:'none'}}>{label}</div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export function GameClient({ initialState }: { initialState?: GameState }) {

  // ── Init : extraire légende + champion de chaque deck, les retirer du deck normal ──
  const [gs, setGs] = useState<GameState>(() => {
    const s = initialState || initializeGame();
    const stripSpecials = (deck: GameCard[]) =>
      deck.filter(c => c.type !== 'Champion'); // Legend n'est pas une carte dans le deck
    return {
      ...s,
      player: {
        ...s.player,
        hand: [],
        base: [],
        deck: stripSpecials(s.player.deck),
      },
      opponent: {
        ...s.opponent,
        hand: Array.from({length:5},(_,i)=>s.opponent.hand[i]||s.opponent.deck[i]).filter(Boolean),
        deck: stripSpecials(s.opponent.deck),
      },
    };
  });

  // ── Placed initialisé avec légende + champion déjà sur leurs zones ──
  const [placed, setPlaced] = useState<PlacedCard[]>(() => {
    const s = initialState || initializeGame();
    const initial: PlacedCard[] = [];
    
    // Champion: vient de player.champion (carte)
    if (s.player.champion) {
      const champCard: GameCard = {
        ...s.player.champion,
        uid: s.player.champion.uid || `champ-${s.player.id}`,
        zone: 'championZone',
        isExhausted: false,
        damage: 0,
        canAttack: false,
        tapped: false,
        keywords: [],
      };
      initial.push({ uid: champCard.uid, card: champCard, x: 50, y: 50, zone: 'my-champion', tapped: false, faceDown: false, revealed: false });
    }
    
    // Legend: vient de player.legend (objet, pas une carte) - créer une carte factice
    if (s.player.legend) {
      const legCard: GameCard = {
        uid: `legend-${s.player.id}`,
        id: s.player.legend.name.toLowerCase().replace(/\s+/g, '-'),
        name: s.player.legend.name,
        type: 'Champion' as const, // Utiliser Champion pour l'affichage
        domain: s.player.legend.domain,
        energyCost: 0,
        powerCost: 0,
        might: 0,
        power: 0,
        rules: s.player.legend.ability,
        rarity: 'Champion' as const,
        zone: 'legendZone',
        isExhausted: false,
        damage: 0,
        canAttack: false,
        tapped: false,
        keywords: [],
      };
      initial.push({ uid: legCard.uid, card: legCard, x: 50, y: 50, zone: 'my-legend', tapped: false, faceDown: false, revealed: false });
    }
    
    // Même chose pour l'adversaire
    if (s.opponent.champion) {
      const champCard: GameCard = {
        ...s.opponent.champion,
        uid: s.opponent.champion.uid || `champ-${s.opponent.id}`,
        zone: 'championZone',
        isExhausted: false,
        damage: 0,
        canAttack: false,
        tapped: false,
        keywords: [],
      };
      initial.push({ uid: champCard.uid, card: champCard, x: 50, y: 50, zone: 'opp-champion', tapped: false, faceDown: false, revealed: false });
    }
    
    if (s.opponent.legend) {
      const legCard: GameCard = {
        uid: `legend-${s.opponent.id}`,
        id: s.opponent.legend.name.toLowerCase().replace(/\s+/g, '-'),
        name: s.opponent.legend.name,
        type: 'Champion' as const,
        domain: s.opponent.legend.domain,
        energyCost: 0,
        powerCost: 0,
        might: 0,
        power: 0,
        rules: s.opponent.legend.ability,
        rarity: 'Champion' as const,
        zone: 'legendZone',
        isExhausted: false,
        damage: 0,
        canAttack: false,
        tapped: false,
        keywords: [],
      };
      initial.push({ uid: legCard.uid, card: legCard, x: 50, y: 50, zone: 'opp-legend', tapped: false, faceDown: false, revealed: false });
    }
    
    return initial;
  });
  const [hov, setHov] = useState<GameCard|null>(null);
  const [bigPreview, setBigPreview] = useState<GameCard|null>(null);
  const [ctx, setCtx] = useState<CtxState>(null);
  const [bandCollapsed, setBandCollapsed] = useState(false);
  const [deckModal, setDeckModal] = useState(false);
  const [topN, setTopN] = useState<number|null>(null);
  const [discardModal, setDiscardModal] = useState<'player'|'opponent'|null>(null);
  const [spellStack, setSpellStack] = useState<GameCard[]>([]);
  const [equippedGear, setEquippedGear] = useState<Record<string, GameCard[]>>({});
  const [gearPicker, setGearPicker] = useState<{gear:GameCard, fromZone:'hand'|'board', uid?:string}|null>(null);
  const [gearHoldTarget, setGearHoldTarget] = useState<string|null>(null);
  const [gearHoldPct, setGearHoldPct] = useState(0);
  const hovTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const gearHoldTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const gearHoldInterval = useRef<ReturnType<typeof setInterval>|null>(null);

  // Cacher navbar du site + confirmation quitter
  useEffect(() => {
    // Masquer la navbar globale pour avoir tout l'espace
    const nav = document.querySelector('nav') as HTMLElement | null;
    const header = document.querySelector('header') as HTMLElement | null;
    if (nav) nav.style.display = 'none';
    if (header) header.style.display = 'none';
    document.body.style.overflow = 'hidden';
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => {
      if (nav) nav.style.display = '';
      if (header) header.style.display = '';
      document.body.style.overflow = '';
      window.removeEventListener('beforeunload', handler);
    };
  }, []);

  // Passer le tour : réactive toutes les runes payées + pioche 1 carte
  // Handlers discard
  const takeFromDiscard = (uid: string) => {
    const card = gs.player.trash.find(c=>c.uid===uid);
    if(!card) return;
    setGs(s=>({...s,player:{...s.player,trash:s.player.trash.filter(c=>c.uid!==uid),hand:[...s.player.hand,{...card,zone:'hand' as const}]}}));
  };
  const playFromDiscard = (uid: string) => {
    const card = gs.player.trash.find(c=>c.uid===uid);
    if(!card) return;
    setGs(s=>({...s,player:{...s.player,trash:s.player.trash.filter(c=>c.uid!==uid)}}));
    setPlaced(ps=>{
      const nc:PlacedCard={uid:card.uid,card,x:50,y:50,zone:'my-bf1',tapped:false,faceDown:false,revealed:false};
      return [...ps,nc];
    });
  };
  const dismissSpell = (uid: string) => {
    const card = spellStack.find(c=>c.uid===uid);
    setSpellStack(s=>s.filter(c=>c.uid!==uid));
    if(card) setGs(s=>({...s,player:{...s.player,trash:[...s.player.trash,card]}}));
  };

  const discardCard = (uid: string) => {
    const toTrash = (c: GameCard): GameCard => ({...c, zone: 'trash' as const});
    // From player hand
    const fromHand = gs.player.hand.find(c=>c.uid===uid);
    if(fromHand) {
      const cardToTrash = {...fromHand, zone: 'trash' as const};
      setGs(s=>({...s,player:{...s.player,hand:s.player.hand.filter(c=>c.uid!==uid),trash:[...s.player.trash,cardToTrash]}}));
      return;
    }
    // From player deck
    const fromDeck = gs.player.deck.find(c=>c.uid===uid);
    if(fromDeck) {
      const cardToTrash = {...fromDeck, zone: 'trash' as const};
      setGs(s=>({...s,player:{...s.player,deck:s.player.deck.filter(c=>c.uid!==uid),trash:[...s.player.trash,cardToTrash]}}));
      return;
    }
    // From placed on board
    const fromPlaced = placed.find(p=>p.uid===uid);
    if(fromPlaced && fromPlaced.card) {
      delP(uid);
      const cardToTrash = {...fromPlaced.card, zone: 'trash' as const};
      setGs(s=>({...s,player:{...s.player,trash:[...s.player.trash,cardToTrash]}}));
      return;
    }
  };

  const passerTour = () => {
    setGs(s => {
      // 1. Piocher 1 carte
      if (s.player.deck.length === 0) return {...s, turn: s.turn + 1};
      const [drawn, ...rest] = s.player.deck;
      return {
        ...s,
        turn: s.turn + 1,
        player: {...s.player, deck: rest, hand: [...s.player.hand, {...drawn, zone: 'hand' as const}]},
      };
    });
    // Réactiver les runes placed (state séparé)
    setPlaced(ps => ps.map(p => p.rune ? {...p, tapped: false, rune: {...p.rune!, isExhausted: false}} : p));
  };

  // Hover 2s → grande preview (annulé si clic)
  const startHovTimer = (card: GameCard) => {
    if (hovTimer.current) clearTimeout(hovTimer.current);
    hovTimer.current = setTimeout(() => setBigPreview(card), 2000);
  };
  const cancelHovTimer = () => {
    if (hovTimer.current) { clearTimeout(hovTimer.current); hovTimer.current = null; }
  };
  const cancelHovTimerOnClick = () => {
    cancelHovTimer();
    setBigPreview(null);
  };

  const updP = (uid:string, p:Partial<PlacedCard>) => setPlaced(ps=>ps.map(x=>x.uid===uid?{...x,...p}:x));
  const delP = (uid:string) => setPlaced(ps=>ps.filter(x=>x.uid!==uid));
  const placedIn = (z:BoardZone) => placed.filter(p=>p.zone===z);

  // ─── Drop universel ────────────────────────────────────────────────────────
  // ─── Auto-layout : redistribue les cartes d'une zone en grille propre ──────
  // Reflow : centré côte à côte, chevauchement seulement si débordement
  const reflow = (cards: PlacedCard[]): PlacedCard[] => {
    const n = cards.length;
    if (n === 0) return cards;
    const CARD_W_PCT = 14; // largeur d'une carte en % de la zone (≈ sans chevauchement jusqu'à ~6 cartes)
    const totalNeeded = n * CARD_W_PCT;
    let step: number;
    let startX: number;
    if (totalNeeded <= 90) {
      // Pas de chevauchement : répartition centrée
      const totalW = n * CARD_W_PCT;
      startX = (100 - totalW) / 2 + CARD_W_PCT / 2;
      step = CARD_W_PCT;
    } else {
      // Chevauchement : on compresse pour tenir dans 88%
      startX = 8;
      step = n > 1 ? (88 - 8) / (n - 1) : 0;
    }
    return cards.map((pc, i) => ({
      ...pc,
      x: startX + i * step,
      y: 50,
    }));
  };

  const handleDrop = (uid:string, x:number, y:number, zone:BoardZone) => {
    const isMoving = !!placed.find(p=>p.uid===uid);

    const addAndReflow = (newCard: PlacedCard, prevPlaced: PlacedCard[]) => {
      // Retirer la carte de son ancienne zone si déplacement
      const without = prevPlaced.filter(p=>p.uid!==uid);
      // Ajouter dans la nouvelle zone
      const withNew = [...without, newCard];
      // Reflow uniquement la zone cible
      const otherZones = withNew.filter(p=>p.zone!==zone);
      const thisZone = reflow(withNew.filter(p=>p.zone===zone));
      return [...otherZones, ...thisZone];
    };

    // Carte déjà sur le plateau → changer de zone + reflow des deux zones
    if (isMoving) {
      setPlaced(ps => {
        const pc = ps.find(p=>p.uid===uid);
        if (!pc) return ps;
        const oldZone = pc.zone;
        if (oldZone === zone) return ps; // même zone = pas de changement
        const without = ps.filter(p=>p.uid!==uid);
        const isBFZone = (z: string) => z==='my-bf1'||z==='my-bf2'||z==='opp-bf1'||z==='opp-bf2'||z==='my-base'||z==='opp-base';
        const isUnit = pc.card && pc.card.type !== 'Spell' && !pc.rune;
        const moved = {...pc, zone, tapped: (isUnit && isBFZone(zone)) ? false : pc.tapped};
        const otherZones = without.filter(p=>p.zone!==zone && p.zone!==oldZone);
        const newZoneCards = reflow([...without.filter(p=>p.zone===zone), moved]);
        const oldZoneCards = reflow(without.filter(p=>p.zone===oldZone));
        return [...otherZones, ...newZoneCards, ...oldZoneCards];
      });
      return;
    }

    // Depuis main joueur
    const fromHand = gs.player.hand.find(c=>c.uid===uid);
    if (fromHand) {
      setGs(s=>({...s,player:{...s.player,hand:s.player.hand.filter(c=>c.uid!==uid)}}));
      setPlaced(ps=>addAndReflow({uid,card:fromHand,x,y,zone,tapped:false,faceDown:false,revealed:false}, ps));
      return;
    }
    // Depuis deck joueur
    const fromDeck = gs.player.deck.find(c=>c.uid===uid);
    if (fromDeck) {
      setGs(s=>({...s,player:{...s.player,deck:s.player.deck.filter(c=>c.uid!==uid)}}));
      setPlaced(ps=>addAndReflow({uid,card:fromDeck,x,y,zone,tapped:false,faceDown:false,revealed:false}, ps));
      return;
    }
    // Depuis deck de rune joueur → pose comme rune-carte
    const fromRune = gs.player.runeDeck.find(r=>r.uid===uid);
    if (fromRune) {
      setGs(s=>({...s,player:{...s.player,runeDeck:s.player.runeDeck.filter(r=>r.uid!==uid)}}));
      setPlaced(ps=>addAndReflow({uid,rune:fromRune,x,y,zone,tapped:false,faceDown:false,revealed:false}, ps));
      return;
    }
  };

  // ─── Clic sur placed = toggle tapped ──────────────────────────────────────
  const tapPlaced = (uid:string) => updP(uid,{tapped:!placed.find(p=>p.uid===uid)?.tapped});

  // ─── Context menu placed ──────────────────────────────────────────────────
  const ctxPlaced = (e:React.MouseEvent, pc:PlacedCard) => {
    e.preventDefault();
    cancelHovTimer();
    const items:CtxItem[] = [];
    if (pc.rune) {
      // Options rune
      items.push({label: pc.tapped?'↺ Récupérer':'💰 Payer', action:()=>updP(pc.uid,{tapped:!pc.tapped,rune:{...pc.rune!,isExhausted:!pc.tapped}})});
      items.push({label:'🔄 Recycler sous le deck', action:()=>{
        setGs(s=>({...s,player:{...s.player,runeDeck:[pc.rune!,...s.player.runeDeck]}}));
        delP(pc.uid);
      }});
      items.push({label:'↩ Retour deck rune', action:()=>{
        setGs(s=>({...s,player:{...s.player,runeDeck:[...s.player.runeDeck,pc.rune!]}}));
        delP(pc.uid);
      }});
    } else {
      // Options carte
      items.push({label: pc.tapped?'↺ Remettre vertical':'↻ Tourner', action:()=>updP(pc.uid,{tapped:!pc.tapped})});
      items.push({label: pc.faceDown?'👁 Face visible':'🙈 Face cachée', action:()=>updP(pc.uid,{faceDown:!pc.faceDown})});
      items.push({label: pc.revealed ? '🫣 Cacher' : `👁 Montrer à l'adv.`, action:()=>updP(pc.uid,{revealed:!pc.revealed})});
      if (pc.card) {
        items.push({label:'✋ Retour en main', action:()=>{
          setGs(s=>({...s,player:{...s.player,hand:[...s.player.hand,{...pc.card!,zone:'hand' as const}]}}));
          delP(pc.uid);
        }});
        items.push({label:'📥 Sous le deck', action:()=>{
          setGs(s=>({...s,player:{...s.player,deck:[pc.card!,...s.player.deck]}}));
          delP(pc.uid);
        }});
        items.push({label:'🔍 Voir en grand', action:()=>setBigPreview(pc.card!)});
        items.push({label:'🗑 Défausser', action:()=>{
          setGs(s=>({...s,player:{...s.player,trash:[...s.player.trash,pc.card!]}}));
          delP(pc.uid);
        }});
      }
    }
    if(pc.card && pc.card.type==='Gear') {
      items.push({label:'⚙️ Équiper', action:()=>setGearPicker({gear:pc.card!, fromZone:'board', uid:pc.uid})});
    }
    items.push({label:'❌ Bannir', action:()=>delP(pc.uid)});
    setCtx({x:e.clientX,y:e.clientY,items});
  };

  // ─── Clic droit main ─────────────────────────────────────────────────────
  const playFromHand = (card: GameCard) => {
    setGs(s=>({...s,player:{...s.player,hand:s.player.hand.filter(c=>c.uid!==card.uid),trash:[...s.player.trash,card]}}));
    if(card.type==='Spell') setSpellStack(s=>[card,...s]);
  };

  const ctxHand = (e:React.MouseEvent, card:GameCard) => {
    e.preventDefault();
    const items: CtxItem[] = [
      {label:'🔍 Voir en grand', action:()=>setBigPreview(card)},
      {label:'🙈 Poser face cachée en BF1', action:()=>{
        setGs(s=>({...s,player:{...s.player,hand:s.player.hand.filter(c=>c.uid!==card.uid)}}));
        setPlaced(ps=>[...ps,{uid:card.uid,card,x:30,y:50,zone:'my-bf1',tapped:false,faceDown:true,revealed:false}]);
      }},
    ];
    if(card.type==='Spell') {
      items.push({label:'✨ Jouer le Spell', action:()=>playFromHand(card)});
    }
    if(card.type==='Gear') {
      items.push({label:'⚙️ Équiper', action:()=>setGearPicker({gear:card, fromZone:'hand'})});
    }
    items.push({label:'📥 Sous le deck', action:()=>setGs(s=>({...s,player:{...s.player,hand:s.player.hand.filter(c=>c.uid!==card.uid),deck:[card,...s.player.deck]}}))});
    items.push({label:'🗑 Défausser', action:()=>playFromHand(card)});
    items.push({label:'❌ Bannir', action:()=>setGs(s=>({...s,player:{...s.player,hand:s.player.hand.filter(c=>c.uid!==card.uid),banished:[...(s.player.banished||[]),card]}}))});
    setCtx({x:e.clientX,y:e.clientY,items});
  };

  // ─── Équiper un Gear sur une unité ──────────────────────────────────────────
  const cancelGearHold = () => {
    if (gearHoldTimer.current) { clearTimeout(gearHoldTimer.current); gearHoldTimer.current = null; }
    if (gearHoldInterval.current) { clearInterval(gearHoldInterval.current); gearHoldInterval.current = null; }
    setGearHoldTarget(null);
    setGearHoldPct(0);
  };
  const equipGear = (targetUid: string) => {
    if (!gearPicker) return;
    cancelGearHold();
    const { gear, fromZone, uid } = gearPicker;
    if (fromZone === 'hand') {
      setGs(s=>({...s,player:{...s.player,hand:s.player.hand.filter(c=>c.uid!==gear.uid)}}));
    } else if (fromZone === 'board' && uid) {
      setPlaced(ps=>ps.filter(p=>p.uid!==uid));
    }
    setEquippedGear(eg=>({...eg, [targetUid]: [...(eg[targetUid]||[]), gear]}));
    setGearPicker(null);
  };
  const startGearHold = (targetUid: string) => {
    if (!gearPicker) return;
    cancelGearHold();
    setGearHoldTarget(targetUid);
    setGearHoldPct(0);
    const start = Date.now();
    const dur = 1500;
    gearHoldInterval.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / dur) * 100);
      setGearHoldPct(pct);
    }, 30);
    gearHoldTimer.current = setTimeout(() => {
      equipGear(targetUid);
    }, dur);
  };

  // ─── Pioche 1 carte ───────────────────────────────────────────────────────
  const drawOne = () => {
    if(!gs.player.deck.length)return;
    const c=gs.player.deck[0];
    setGs(s=>({...s,player:{...s.player,deck:s.player.deck.slice(1),hand:[...s.player.hand,{...c,zone:'hand' as const}]}}));
  };

  // ─── Canaliser 1 rune → zone rune comme carte ────────────────────────────
  const canaliserRune = () => {
    if(!gs.player.runeDeck.length)return;
    const rune=gs.player.runeDeck[0];
    setGs(s=>({...s,player:{...s.player,runeDeck:s.player.runeDeck.slice(1)}}));
    setPlaced(ps=>{
      const newCard: PlacedCard = {uid:rune.uid,rune,x:50,y:50,zone:'my-runes',tapped:false,faceDown:false,revealed:false};
      const others = ps.filter(p=>p.zone!=='my-runes');
      const zoneCards = reflow([...ps.filter(p=>p.zone==='my-runes'), newCard]);
      return [...others, ...zoneCards];
    });
  };

  // ─── Deck actions ─────────────────────────────────────────────────────────
  const shuffleDeck=()=>setGs(s=>({...s,player:{...s.player,deck:[...s.player.deck].sort(()=>Math.random()-.5)}}));
  const takeFromDeck=(uid:string)=>{
    const c=gs.player.deck.find(x=>x.uid===uid);
    if(!c)return;
    setGs(s=>({...s,player:{...s.player,deck:s.player.deck.filter(x=>x.uid!==uid),hand:[...s.player.hand,{...c,zone:'hand' as const}]}}));
  };

  // ─── Taille dynamique des cartes sur plateau selon nb de cartes dans la zone ─
  const zoneCardSize = (zone: BoardZone): {w:number, h:number} => {
    const n = placedIn(zone).length;
    // Base: 122×170 × 0.92 × 0.82 = 92×128
    const base = {w: 92, h: 128};
    if (n <= 3)  return base;
    if (n <= 5)  return {w: 75,  h: 106};
    if (n <= 7)  return {w: 62,  h: 86};
    if (n <= 10) return {w: 50,  h: 70};
    return              {w: 39,  h: 54};
  };

  // ─── Rendu d'une PlacedCard ───────────────────────────────────────────────
  const rPC = (pc:PlacedCard) => {
    const {w, h} = zoneCardSize(pc.zone);
    const isGearTarget = !!gearPicker && !!pc.card && pc.card.type!=='Spell' && pc.card.type!=='Gear' && !pc.rune
      && (pc.zone==='my-bf1'||pc.zone==='my-bf2'||pc.zone==='my-base'||pc.zone==='my-champion'||pc.zone==='my-legend'||pc.zone==='opp-bf1'||pc.zone==='opp-bf2'||pc.zone==='opp-base'||pc.zone==='opp-champion'||pc.zone==='opp-legend');
    const isHoldTarget = gearHoldTarget===pc.uid;
    return (
      <div key={pc.uid}
        style={{position:'absolute',left:`${pc.x}%`,top:`${pc.y}%`,transform:'translate(-50%,-50%)',
          zIndex:isGearTarget?20:10,cursor:isGearTarget?'crosshair':'grab',
          display:'flex',flexDirection:'column',alignItems:'center',gap:2,
          outline:isGearTarget?(isHoldTarget?'2px solid rgba(241,196,15,1)':'2px solid rgba(241,196,15,0.55)'):'none',
          borderRadius:9,
          filter:isGearTarget&&!isHoldTarget?'drop-shadow(0 0 6px rgba(241,196,15,0.5))':'none',
          transition:'filter 0.15s,outline 0.15s'}}
        draggable={!gearPicker}
        onDragStart={e=>{e.dataTransfer.setData('placedUid',pc.uid);}}
        onMouseEnter={()=>{
          if(isGearTarget) startGearHold(pc.uid);
          else if(pc.card) startHovTimer(pc.card);
        }}
        onMouseLeave={()=>{
          if(isGearTarget) cancelGearHold();
          else cancelHovTimer();
        }}
        onMouseDown={isGearTarget ? undefined : cancelHovTimerOnClick}
        onClick={isGearTarget ? ()=>equipGear(pc.uid) : undefined}
        onContextMenu={e=>ctxPlaced(e,pc)}>
        {isHoldTarget&&(
          <svg style={{position:'absolute',top:-8,left:-8,width:w+16,height:h+16,zIndex:30,pointerEvents:'none'}} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(241,196,15,.15)" strokeWidth="6"/>
            <circle cx="50" cy="50" r="46" fill="none" stroke="#f1c40f" strokeWidth="6"
              strokeDasharray={2*Math.PI*46}
              strokeDashoffset={2*Math.PI*46*(1-gearHoldPct/100)}
              strokeLinecap="round"
              style={{transform:'rotate(-90deg)',transformOrigin:'50% 50%',transition:'stroke-dashoffset .03s linear'}}/>
          </svg>
        )}
        {pc.card
          ?<CardVis card={pc.card} w={w} h={h} tapped={pc.tapped} faceDown={pc.faceDown} revealed={pc.revealed} onClick={()=>tapPlaced(pc.uid)}/>
          :pc.rune
            ?<RuneCardVis rune={pc.rune} w={w} h={h} tapped={pc.tapped} faceDown={pc.faceDown} onClick={()=>tapPlaced(pc.uid)}/>
            :null}
        {(equippedGear[pc.uid]||[]).length>0&&(
          <div style={{display:'flex',gap:2,marginTop:1,flexWrap:'wrap',justifyContent:'center',maxWidth:w}}>
            {(equippedGear[pc.uid]||[]).map(g=>(
              <div key={g.uid} title={g.name}
                style={{width:Math.round(w*0.32),height:Math.round(w*0.45),borderRadius:3,overflow:'hidden',flexShrink:0,
                  border:'1px solid rgba(241,196,15,.6)',boxShadow:'0 0 4px rgba(241,196,15,.3)',cursor:'pointer'}}
                onContextMenu={e=>{e.stopPropagation();e.preventDefault();setCtx({x:e.clientX,y:e.clientY,items:[
                  {label:`⚙️ ${g.name}`,action:()=>{}},
                  {label:'🔍 Voir en grand',action:()=>setBigPreview(g)},
                  {label:'✋ Récupérer en main',action:()=>{
                    setEquippedGear(eg=>{const n={...eg};n[pc.uid]=(n[pc.uid]||[]).filter(x=>x.uid!==g.uid);return n;});
                    setGs(s=>({...s,player:{...s.player,hand:[...s.player.hand,{...g,zone:'hand' as const}]}}));
                  }},
                  {label:'🗑 Défausser',action:()=>{
                    setEquippedGear(eg=>{const n={...eg};n[pc.uid]=(n[pc.uid]||[]).filter(x=>x.uid!==g.uid);return n;});
                    setGs(s=>({...s,player:{...s.player,trash:[...s.player.trash,g]}}));
                  }},
                ]});}}>
                {g.imageUrl
                  ?<img src={g.imageUrl} alt={g.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  :<div style={{width:'100%',height:'100%',background:'linear-gradient(135deg,'+(DC[g.domain]||'#888')+'30,#0a0c14)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10}}>⚙️</div>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{height:'100vh',width:'100vw',overflow:'hidden',display:'flex',flexDirection:'column',color:'#e8eaf0',fontFamily:"'Segoe UI',system-ui,sans-serif",background:'#0d1b2a'}}>

      {/* ══ MOITIÉ HAUTE — ADVERSAIRE ══ */}
      <div style={{flex:'0 0 46%',display:'flex',flexDirection:'column',minHeight:0,background:'linear-gradient(180deg,#1a0a00 0%,#2a1400 100%)',borderBottom:'2px solid rgba(231,76,60,.2)'}}>

        {/* Bande haute adverse : DeckRune à DROITE (symétrie bas-gauche joueur) */}
        <div style={{flexShrink:0,height:181,display:'flex',alignItems:'stretch',padding:'4px 6px',gap:5,background:'rgba(60,38,10,.9)',borderBottom:'1px solid rgba(200,154,60,.3)'}}>

          {/* GAUCHE : Légende + Champion adverse — coin haut-gauche, symétrique bas-droit joueur */}
          <div style={{flexShrink:0,display:'flex',gap:4,alignItems:'center',justifyContent:'center',paddingRight:4,borderRight:'1px solid rgba(255,255,255,.06)'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div style={{position:'relative',width:90,height:126}}>
                <ZoneEl id="opp-legend" label="" color="#e67e22" onDrop={handleDrop}>
                  {placedIn('opp-legend').map(rPC)}
                  {placedIn('opp-legend').length===0&&(
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,opacity:.2,pointerEvents:'none'}}>⭐</div>
                  )}
                </ZoneEl>
              </div>
              <span style={{fontSize:8,color:'rgba(230,126,34,.7)',fontWeight:700,letterSpacing:.5}}>LÉGENDE</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div style={{position:'relative',width:90,height:126}}>
                <ZoneEl id="opp-champion" label="" color="#f1c40f" onDrop={handleDrop}>
                  {placedIn('opp-champion').map(rPC)}
                  {placedIn('opp-champion').length===0&&(
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,opacity:.2,pointerEvents:'none'}}>👑</div>
                  )}
                </ZoneEl>
              </div>
              <span style={{fontSize:8,color:'rgba(241,196,15,.7)',fontWeight:700,letterSpacing:.5}}>CHAMPION</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 2px'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#e74c3c',textShadow:'0 0 10px #e74c3c60'}}>{gs.opponent.score}</div>
            </div>
          </div>

          {/* Base adverse */}
          <ZoneEl id="opp-base" label="Base" color="#e74c3c" onDrop={handleDrop} maxW={800}>
            {placedIn('opp-base').map(rPC)}
            {gs.opponent.base.map((c,i)=>(
              <div key={c.uid} style={{position:'absolute',left:`${8+i*18}%`,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
                <CardVis card={c} w={56} h={78}/>
              </div>
            ))}
          </ZoneEl>

          {/* Zone rune adverse */}
          <ZoneEl id="opp-runes" label="Zone de rune" color="#9b59b6" onDrop={handleDrop} maxW={420}>
            {placedIn('opp-runes').map(rPC)}
          </ZoneEl>

          {/* DROITE : Deck rune adverse */}
          <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,paddingLeft:4,borderLeft:'1px solid rgba(255,255,255,.06)'}}>
            <DeckPile count={gs.opponent.runeDeck.length} color="#9b59b6" label="Runes"/>
          </div>
        </div>

        {/* BF adversaire — prend toute la hauteur restante */}
        <div style={{flex:1,display:'flex',gap:2,padding:'4px 6px 6px',minHeight:0,position:'relative'}}>
          <ZoneEl id="opp-bf1" label="Battlefield 1" color="#e74c3c" onDrop={handleDrop}>
            {placedIn('opp-bf1').map(rPC)}
            {gs.battlefield.opponentUnits.filter(c=>!placed.find(p=>p.uid===c.uid)).map((c,i)=>(
              <div key={c.uid} style={{position:'absolute',left:`${12+i*22}%`,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
                <CardVis card={c} w={76} h={106}/>
              </div>
            ))}
          </ZoneEl>
          <ZoneEl id="opp-bf2" label="Battlefield 2" color="#e74c3c" onDrop={handleDrop}>
            {placedIn('opp-bf2').map(rPC)}
          </ZoneEl>
        </div>
      </div>

      {/* ══ LIGNE DE SÉPARATION fine + numéro de tour ══ */}
      <div style={{flexShrink:0,height:4,background:'rgba(0,0,0,.7)',position:'relative',zIndex:6}}>
        <div style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',fontSize:9,color:'rgba(255,255,255,.18)',fontWeight:700,background:'rgba(0,0,0,.6)',padding:'0 8px',borderRadius:4}}>T{gs.turn}</div>
      </div>

      {/* ══ MOITIÉ BASSE — JOUEUR ══ */}
      <div style={{flex:'0 0 46%',display:'flex',flexDirection:'column',minHeight:0,background:'linear-gradient(180deg,#001828 0%,#002038 100%)',borderTop:'2px solid rgba(52,152,219,.2)'}}>

        {/* BF joueur — en haut */}
        <div style={{flex:1,display:'flex',gap:2,padding:'6px 6px 4px',minHeight:0,position:'relative'}}>
          <ZoneEl id="my-bf1" label="Battlefield 1" color="#3498db" onDrop={handleDrop}>
            {placedIn('my-bf1').map(rPC)}
            {gs.battlefield.playerUnits.filter(c=>!placed.find(p=>p.uid===c.uid)).map((c,i)=>(
              <div key={c.uid} style={{position:'absolute',left:`${12+i*22}%`,top:'50%',transform:'translateY(-50%)'}}
                draggable onDragStart={e=>e.dataTransfer.setData('cardUid',c.uid)}
                onMouseEnter={()=>setHov(c)} onMouseLeave={()=>setHov(null)}>
                <CardVis card={c} w={76} h={106} draggable/>
              </div>
            ))}
          </ZoneEl>
          <ZoneEl id="my-bf2" label="Battlefield 2" color="#3498db" onDrop={handleDrop}>
            {placedIn('my-bf2').map(rPC)}
          </ZoneEl>
        </div>

        {/* Bande basse joueur : poignée + contenu */}
        <div style={{flexShrink:0,display:'flex',flexDirection:'column',background:'rgba(0,20,45,.97)',borderTop:'1px solid rgba(52,152,219,.2)',position:'relative',zIndex:50}}>
          {/* Poignée */}
          <div onClick={()=>setBandCollapsed(s=>!s)}
            style={{flexShrink:0,height:16,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
              background:'rgba(200,154,60,.08)',borderBottom:'1px solid rgba(200,154,60,.15)',userSelect:'none',gap:6}}>
            <div style={{width:32,height:3,borderRadius:2,background:'rgba(200,154,60,.4)'}}/>
            <span style={{fontSize:9,fontWeight:900,color:'rgba(200,154,60,.5)',letterSpacing:1}}>{bandCollapsed?'▲':'▼'}</span>
            <div style={{width:32,height:3,borderRadius:2,background:'rgba(200,154,60,.4)'}}/>
          </div>

          {/* Contenu bande joueur */}
          <div style={{height:bandCollapsed?0:181,overflow:'hidden',transition:'height .25s ease',
            display:'flex',alignItems:'stretch',padding:bandCollapsed?0:'4px 6px',gap:5}}>

            {/* GAUCHE : Deck rune joueur */}
            <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,paddingRight:4,borderRight:'1px solid rgba(255,255,255,.06)'}}>
              <DeckPile count={gs.player.runeDeck.length} color="#9b59b6" label="Runes"
                title="Clic = canaliser · Clic droit = options"
                onClick={canaliserRune}
                onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,items:[
                  {label:'🔮 Canaliser 1 rune',    action: canaliserRune},
                  {label:'🔮🔮 Canaliser 3 runes', action: ()=>{canaliserRune();canaliserRune();canaliserRune();}},
                  {label:'🔀 Mélanger deck rune',  action: ()=>setGs(s=>({...s,player:{...s.player,runeDeck:[...s.player.runeDeck].sort(()=>Math.random()-.5)}}))},
                ]});}}
              />
            </div>

            {/* Zone rune joueur */}
            <ZoneEl id="my-runes" label="Zone de rune" color="#9b59b6" onDrop={handleDrop} maxW={420}>
              {placedIn('my-runes').map(rPC)}
            </ZoneEl>

            {/* Base joueur */}
            <ZoneEl id="my-base" label="Base" color="#2ecc71" onDrop={handleDrop} maxW={800}>
              {placedIn('my-base').map(rPC)}
              {gs.player.base.filter(c=>!placed.find(p=>p.uid===c.uid)).map((c,i)=>(
                <div key={c.uid}
                  style={{position:'absolute',left:`${8+i*18}%`,top:'50%',transform:'translateY(-50%)',zIndex:2}}
                  draggable onDragStart={e=>e.dataTransfer.setData('cardUid',c.uid)}
                  onMouseEnter={()=>setHov(c)} onMouseLeave={()=>setHov(null)}
                  onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,items:[
                    {label:'✋ En main',action:()=>setGs(s=>({...s,player:{...s.player,base:s.player.base.filter(c2=>c2.uid!==c.uid),hand:[...s.player.hand,{...c,zone:'hand' as const}]}}))},
                  ]});}}>
                  <CardVis card={c} w={56} h={78} draggable/>
                </div>
              ))}
            </ZoneEl>

            {/* DROITE : Score + Légende + Champion joueur — coin bas-droit, symétrique haut-gauche adverse */}
            <div style={{flexShrink:0,display:'flex',gap:4,alignItems:'center',justifyContent:'center',paddingLeft:4,borderLeft:'1px solid rgba(255,255,255,.06)'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 2px'}}>
                <div style={{fontSize:16,fontWeight:900,color:'#3498db',textShadow:'0 0 10px #3498db60'}}>{gs.player.score}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <div style={{position:'relative',width:90,height:126}}>
                  <ZoneEl id="my-legend" label="" color="#e67e22" onDrop={handleDrop}>
                    {placedIn('my-legend').map(rPC)}
                    {placedIn('my-legend').length===0&&(
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,opacity:.2,pointerEvents:'none'}}>⭐</div>
                    )}
                  </ZoneEl>
                </div>
                <span style={{fontSize:8,color:'rgba(230,126,34,.8)',fontWeight:700,letterSpacing:.5}}>LÉGENDE</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <div style={{position:'relative',width:90,height:126}}>
                  <ZoneEl id="my-champion" label="" color="#f1c40f" onDrop={handleDrop}>
                    {placedIn('my-champion').map(rPC)}
                    {placedIn('my-champion').length===0&&(
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,opacity:.2,pointerEvents:'none'}}>👑</div>
                    )}
                  </ZoneEl>
                </div>
                <span style={{fontSize:8,color:'rgba(241,196,15,.8)',fontWeight:700,letterSpacing:.5}}>CHAMPION</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══ TERRAINS FLOTTANTS — fixed, centrés sur la jonction des deux moitiés ══ */}
      {/* Terrain gauche — au-dessus de opp-bf1 / my-bf1 */}
      <div style={{position:'fixed',top:'46%',left:'25%',transform:'translate(-50%,-50%)',zIndex:80,display:'flex',flexDirection:'column',alignItems:'center',gap:2,pointerEvents:'auto'}}>
        <span style={{fontSize:7,fontWeight:900,color:'rgba(139,92,246,.8)',letterSpacing:.8,textShadow:'0 0 6px rgba(139,92,246,.4)'}}>TERRAIN</span>
        <div style={{width:70,height:98,position:'relative',borderRadius:8,border:'1.5px dashed rgba(139,92,246,.5)',background:'rgba(4,4,12,.85)',backdropFilter:'blur(4px)',boxShadow:'0 0 14px rgba(139,92,246,.2),0 4px 16px rgba(0,0,0,.7)',overflow:'hidden',flexShrink:0}}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();const uid=e.dataTransfer.getData('cardUid')||e.dataTransfer.getData('placedUid');if(uid)handleDrop(uid,50,50,'terrain-left');}}>
          {placedIn('terrain-left').length===0&&(
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,opacity:.2,pointerEvents:'none'}}>🌿</div>
          )}
          {placedIn('terrain-left').map(pc=>pc.card
            ?<div key={pc.uid} style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)'}} draggable onDragStart={e=>e.dataTransfer.setData('placedUid',pc.uid)} onContextMenu={e=>ctxPlaced(e,pc)} onClick={()=>tapPlaced(pc.uid)}>
              <CardVis card={pc.card} w={68} h={95} tapped={pc.tapped} faceDown={pc.faceDown} revealed={pc.revealed}/>
            </div>
            :null
          )}
        </div>
      </div>

      {/* Terrain droit — au-dessus de opp-bf2 / my-bf2 */}
      <div style={{position:'fixed',top:'46%',left:'75%',transform:'translate(-50%,-50%)',zIndex:80,display:'flex',flexDirection:'column',alignItems:'center',gap:2,pointerEvents:'auto'}}>
        <span style={{fontSize:7,fontWeight:900,color:'rgba(139,92,246,.8)',letterSpacing:.8,textShadow:'0 0 6px rgba(139,92,246,.4)'}}>TERRAIN</span>
        <div style={{width:70,height:98,position:'relative',borderRadius:8,border:'1.5px dashed rgba(139,92,246,.5)',background:'rgba(4,4,12,.85)',backdropFilter:'blur(4px)',boxShadow:'0 0 14px rgba(139,92,246,.2),0 4px 16px rgba(0,0,0,.7)',overflow:'hidden',flexShrink:0}}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();const uid=e.dataTransfer.getData('cardUid')||e.dataTransfer.getData('placedUid');if(uid)handleDrop(uid,50,50,'terrain-right');}}>
          {placedIn('terrain-right').length===0&&(
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,opacity:.2,pointerEvents:'none'}}>🌿</div>
          )}
          {placedIn('terrain-right').map(pc=>pc.card
            ?<div key={pc.uid} style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)'}} draggable onDragStart={e=>e.dataTransfer.setData('placedUid',pc.uid)} onContextMenu={e=>ctxPlaced(e,pc)} onClick={()=>tapPlaced(pc.uid)}>
              <CardVis card={pc.card} w={68} h={95} tapped={pc.tapped} faceDown={pc.faceDown} revealed={pc.revealed}/>
            </div>
            :null
          )}
        </div>
      </div>

      {/* ══ DECK + DÉFAUSSE ADVERSAIRE — fixed haut-GAUCHE, bien visible ══ */}
      <div style={{position:'fixed',top:10,left:10,zIndex:150,display:'flex',flexDirection:'column',alignItems:'flex-start',gap:4}}>
        <div style={{fontSize:7,color:'rgba(231,76,60,.5)',fontWeight:700,letterSpacing:.5}}>{gs.opponent.name}</div>
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <DeckPile count={gs.opponent.deck.length} color="#c0392b" label="Deck"/>
          <DiscardPile cards={gs.opponent.trash} label="Défausse" side="opponent"
            onContextMenu={e=>{e.preventDefault();setDiscardModal('opponent');}}
            onDrop={(uid)=>{console.log('Drop to opponent discard:',uid);}}/>
        </div>
      </div>

      {/* ══ DECK + DÉFAUSSE JOUEUR — fixed bas-DROITE, bien visible ══ */}
      <div style={{position:'fixed',bottom:10,right:10,zIndex:250,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <DiscardPile cards={gs.player.trash} label="Défausse" side="player"
            onContextMenu={e=>{e.preventDefault();setDiscardModal('player');}}
            onDrop={discardCard}/>
          <DeckPile count={gs.player.deck.length} color="#3498db" label="Deck"
            title="Clic gauche = piocher · Clic droit = options"
            onClick={drawOne}
            onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,items:[
              {label:'🃏 Piocher 1 carte', action: drawOne},
              {label:'🔀 Mélanger',         action: shuffleDeck},
              {label:'👁 Voir le deck',      action: ()=>setDeckModal(true)},
              {label:'🔢 Top 3 cartes',      action: ()=>setTopN(3)},
            ]});}}
          />
        </div>
      </div>



      {/* ══ MAIN ADVERSE — fixed top, éventail vers le bas, face cachée ══ */}
      <div style={{position:'fixed',top:0,left:'50%',transform:'translateX(-50%)',zIndex:100,display:'flex',justifyContent:'center',alignItems:'flex-start',pointerEvents:'none',paddingTop:4}}>
        {gs.opponent.hand.map((card,idx)=>{
          const total=gs.opponent.hand.length;
          const mid=(total-1)/2;
          const rot=(idx-mid)*4;
          const lift=Math.abs(idx-mid)*7;
          return (
            <div key={card.uid} style={{transform:`rotate(${180+rot}deg) translateY(calc(58% - ${lift}px))`,transformOrigin:'top center',marginLeft:idx>0?-20:0,zIndex:idx+1,flexShrink:0}}>
              <CardVis card={card} w={72} h={100} faceDown backColor='red'/>
            </div>
          );
        })}
      </div>

      {/* ══ MAIN JOUEUR — fixed bottom, éventail vers le haut ══ */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',zIndex:200,display:'flex',justifyContent:'center',alignItems:'flex-end',paddingBottom:0,gap:0}}>
        {gs.player.hand.length===0&&<span style={{fontSize:11,color:'rgba(255,255,255,.15)',marginBottom:8}}>Main vide — pioche une carte</span>}
        {gs.player.hand.map((card,idx)=>{
          const total=gs.player.hand.length;
          const mid=(total-1)/2;
          const rot=(idx-mid)*4;
          const lift=Math.abs(idx-mid)*8;
          return (
            <div key={card.uid}
              style={{transform:`translateY(calc(58% - ${lift}px)) rotate(${rot}deg)`,transformOrigin:'bottom center',transition:'transform .12s',marginLeft:idx>0?-35:0,zIndex:idx+1,flexShrink:0}}
              onMouseEnter={()=>startHovTimer(card)} onMouseLeave={cancelHovTimer} onMouseDown={cancelHovTimerOnClick}>
              <CardVis card={card} w={130} h={182} draggable
                onDragStart={e=>e.dataTransfer.setData('cardUid',card.uid)}
                onContextMenu={e=>ctxHand(e,card)}
                onClick={cancelHovTimerOnClick}
                onDoubleClick={()=>{
                  if(card.type==='Spell') playFromHand(card);
                }}/>
              {card.type==='Spell'&&<div style={{
                position:'absolute',bottom:'44%',left:'50%',transform:'translateX(-50%)',
                pointerEvents:'none',zIndex:5,
                background:'rgba(241,196,15,.9)',color:'#0a0c14',
                fontSize:8,fontWeight:900,borderRadius:4,padding:'2px 6px',
                letterSpacing:.5,whiteSpace:'nowrap',
                boxShadow:'0 0 8px rgba(241,196,15,.5)',
              }}>✨ 2× JOUER</div>}
            </div>
          );
        })}
      </div>

      {/* Logo retour accueil */}
      <a href="/" onClick={e=>{if(!window.confirm(`Quitter l'arène ? La partie en cours sera perdue.`))e.preventDefault();}}
        style={{position:'fixed',top:10,left:12,zIndex:9990,display:'flex',alignItems:'center',gap:6,textDecoration:'none',
          background:'rgba(0,0,0,.7)',border:'1px solid rgba(200,154,60,.3)',borderRadius:20,padding:'4px 10px',
          backdropFilter:'blur(4px)',transition:'all .2s'}}
        onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(200,154,60,.8)';}}
        onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(200,154,60,.3)';}}>
        <span style={{fontSize:16}}>⚔️</span>
        <span style={{fontSize:11,fontWeight:700,color:'#C89B3C',letterSpacing:.5}}>ACCUEIL</span>
      </a>

      {/* ══ OVERLAYS ══ */}
      {hov&&<CardPreview card={hov}/>}
      {ctx&&<CtxMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={()=>setCtx(null)}/>}
      {deckModal&&<DeckModal deck={gs.player.deck} title="Ton deck" onClose={()=>setDeckModal(false)} onTakeCard={takeFromDeck} onShuffle={shuffleDeck}/>}
      {topN&&<TopNModal deck={gs.player.deck} n={topN} onClose={()=>setTopN(null)} onTakeCard={uid=>{takeFromDeck(uid);}}/>}

      {/* Grande preview carte (hover 2s) — image seule centrée */}
      {bigPreview&&(
        <>
          <div style={{position:'fixed',inset:0,zIndex:9994,background:'rgba(0,0,0,.8)',backdropFilter:'blur(4px)'}}
            onClick={()=>setBigPreview(null)}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:9995,pointerEvents:'none'}}>
            {bigPreview.imageUrl
              ? <img src={bigPreview.imageUrl} alt={bigPreview.name} style={{height:'75vh',maxWidth:'90vw',borderRadius:16,boxShadow:'0 0 80px rgba(0,0,0,.95),0 0 40px '+(DC[bigPreview.domain]||'#888')+'50',objectFit:'contain'}}/>
              : <div style={{width:300,height:420,borderRadius:16,background:'linear-gradient(160deg,'+(DC[bigPreview.domain]||'#333')+'30,#0d1520)',border:'2px solid '+(DC[bigPreview.domain]||'#888')+'80',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:24}}>
                  <div style={{fontSize:48}}>{DE[bigPreview.domain]||'🃏'}</div>
                  <div style={{fontWeight:900,fontSize:20,color:'#fff',textAlign:'center'}}>{bigPreview.name}</div>
                  {bigPreview.rules&&<div style={{fontSize:13,color:'#ccc',fontStyle:'italic',lineHeight:1.5,textAlign:'center'}}>{bigPreview.rules}</div>}
                </div>
            }
          </div>
        </>
      )}

      {/* Bouton passer le tour — fixed gauche milieu */}
      <div style={{position:'fixed',left:14,top:'50%',transform:'translateY(-50%)',zIndex:300}}>
        <button onClick={passerTour}
          style={{padding:'12px 10px',borderRadius:12,border:'2px solid rgba(200,154,60,.7)',
            cursor:'pointer',fontSize:13,fontWeight:900,
            background:'linear-gradient(180deg,#1a1200,#2d1f00)',
            color:'#F0C060',letterSpacing:.3,
            boxShadow:'0 0 14px rgba(200,154,60,.3)',
            transition:'all .15s',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}
          onMouseOver={e=>{const t=e.currentTarget as HTMLElement;t.style.borderColor='#F0C060';t.style.boxShadow='0 0 28px rgba(200,154,60,.7)';}}
          onMouseOut={e=>{const t=e.currentTarget as HTMLElement;t.style.borderColor='rgba(200,154,60,.7)';t.style.boxShadow='0 0 14px rgba(200,154,60,.3)';}}>
          <span style={{fontSize:18}}>⚔️</span>
          <span style={{fontSize:9,fontWeight:900,letterSpacing:.5}}>PASSER LE TOUR</span>
        </button>
      </div>

      {/* Bandeau mode équipement Gear */}
      {gearPicker&&(
        <div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',zIndex:2000,
          background:'rgba(10,8,2,.92)',border:'1.5px solid rgba(241,196,15,.7)',
          borderRadius:30,padding:'8px 20px',display:'flex',alignItems:'center',gap:10,
          boxShadow:'0 0 24px rgba(241,196,15,.3)',backdropFilter:'blur(6px)'}}>
          <span style={{fontSize:16}}>⚙️</span>
          <div style={{fontSize:12,fontWeight:800,color:'#f1c40f',letterSpacing:.3}}>
            {gearPicker.gear.name}
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.55)',fontWeight:500}}>
            — cliquez sur une unité ou maintenez 1.5s
          </div>
          <button onClick={()=>{setGearPicker(null);cancelGearHold();}}
            style={{marginLeft:4,padding:'2px 8px',borderRadius:20,border:'1px solid rgba(255,255,255,.2)',
              cursor:'pointer',background:'rgba(255,255,255,.08)',color:'#fff',fontSize:11}}>
            Annuler
          </button>
        </div>
      )}

      {/* Spell stack — droite, milieu écran */}
      <SpellStackZone cards={spellStack} onDiscard={dismissSpell}/>

      {/* Modals discard */}
      {discardModal==='player'&&(
        <DiscardModal cards={gs.player.trash} title="Ta défausse" onClose={()=>setDiscardModal(null)}
          onTakeToHand={takeFromDiscard} onPlayToBF={playFromDiscard}/>
      )}
      {discardModal==='opponent'&&(
        <DiscardModal cards={gs.opponent.trash} title="Défausse adverse" onClose={()=>setDiscardModal(null)}
          onTakeToHand={()=>{}} onPlayToBF={()=>{}}/>
      )}

    </div>
  );
}
