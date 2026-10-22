import React, { useState, useRef, useEffect } from 'react';
import tagsData from '../data/tags.json';
import { X, ChevronDown, Search } from 'lucide-react';

const MAX_TAGS = 5;

export const TagSelector = ({ selectedTags, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(tagsData.categories[0].name);
  const dropdownRef = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length >= MAX_TAGS) return;
      onChange([...selectedTags, tag]);
    }
  };

  const removeTag = (tag) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  // Filtra tags de acordo com a busca e categoria ativa
  const filteredCategories = search.trim()
    ? tagsData.categories
        .map((cat) => ({
          ...cat,
          tags: cat.tags.filter((t) => t.toLowerCase().includes(search.toLowerCase())),
        }))
        .filter((cat) => cat.tags.length > 0)
    : tagsData.categories;

  const activeCategory_data = filteredCategories.find((c) => c.name === activeCategory) || filteredCategories[0];

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Tags selecionadas */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          minHeight: '48px',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border-glass)'}`,
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center',
          transition: 'border-color 0.2s',
        }}
      >
        {selectedTags.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', userSelect: 'none' }}>
            Selecione até {MAX_TAGS} tags...
          </span>
        )}
        {selectedTags.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(139, 92, 246, 0.25)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              color: '#c4b5fd',
              borderRadius: '20px',
              padding: '2px 10px 2px 10px',
              fontSize: '0.82rem',
              fontWeight: '600',
            }}
          >
            {tag}
            <span
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.7, marginLeft: '2px' }}
            >
              <X size={12} />
            </span>
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </span>
      </div>

      {/* Contador */}
      <div style={{ fontSize: '0.78rem', color: selectedTags.length >= MAX_TAGS ? 'var(--danger)' : 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
        {selectedTags.length}/{MAX_TAGS} tags selecionadas
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--glass-bg, rgba(20,20,35,0.97))',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-sm)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '420px',
          overflow: 'hidden',
        }}>
          {/* Busca */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                flex: 1,
              }}
            />
          </div>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Categorias (sidebar) */}
            <div style={{
              width: '140px',
              flexShrink: 0,
              borderRight: '1px solid var(--border-glass)',
              overflowY: 'auto',
              padding: '6px 0',
            }}>
              {filteredCategories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={(e) => { e.stopPropagation(); setActiveCategory(cat.name); setSearch(''); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '8px 12px',
                    background: activeCategory === cat.name ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    border: 'none',
                    borderLeft: activeCategory === cat.name ? '3px solid var(--primary)' : '3px solid transparent',
                    color: activeCategory === cat.name ? '#c4b5fd' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: activeCategory === cat.name ? '700' : '400',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Tags da categoria ativa */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignContent: 'flex-start' }}>
              {(search.trim() ? filteredCategories.flatMap((c) => c.tags) : (activeCategory_data?.tags || [])).map((tag) => {
                const isSelected = selectedTags.includes(tag);
                const isDisabled = !isSelected && selectedTags.length >= MAX_TAGS;
                return (
                  <button
                    key={tag}
                    onClick={(e) => { e.stopPropagation(); toggleTag(tag); }}
                    disabled={isDisabled}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      border: isSelected ? '1px solid rgba(139, 92, 246, 0.7)' : '1px solid rgba(255,255,255,0.1)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.04)',
                      color: isSelected ? '#c4b5fd' : isDisabled ? 'rgba(255,255,255,0.2)' : 'var(--text-secondary)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? '700' : '400',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isSelected && '✓ '}{tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
