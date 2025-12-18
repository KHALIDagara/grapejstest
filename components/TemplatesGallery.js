'use client';
import { useState, useEffect, useCallback } from 'react';
import { getTemplates, searchTemplates } from '@/services/templatesService';
import TemplateCard from './TemplateCard';

export default function TemplatesGallery({ onSelectTemplate }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDebounceTimer, setSearchDebounceTimer] = useState(null);

    // Fetch all templates on mount
    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getTemplates();
                setTemplates(data);
            } catch (err) {
                setError(err.message || 'Failed to load templates');
            } finally {
                setLoading(false);
            }
        };

        fetchTemplates();
    }, []);

    // Debounced search handler
    const handleSearch = useCallback((query) => {
        // Clear previous timer
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }

        // Set new timer
        const timer = setTimeout(async () => {
            if (query.trim() === '') {
                // Empty query: fetch all templates
                setSearching(true);
                try {
                    const data = await getTemplates();
                    setTemplates(data);
                    setError(null);
                } catch (err) {
                    setError(err.message || 'Failed to load templates');
                } finally {
                    setSearching(false);
                }
            } else {
                // Non-empty query: search
                setSearching(true);
                try {
                    const data = await searchTemplates(query);
                    setTemplates(data);
                    setError(null);
                } catch (err) {
                    setError(err.message || 'Search failed');
                } finally {
                    setSearching(false);
                }
            }
        }, 1000); // 1 second debounce

        setSearchDebounceTimer(timer);
    }, [searchDebounceTimer]);

    const handleSearchInputChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        handleSearch(value);
    };

    const handleSelectTemplate = (template) => {
        if (onSelectTemplate) {
            onSelectTemplate(template);
        }
    };

    return (
        <div className="templates-gallery">
            {/* Search Bar */}
            <div className="templates-search">
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    className="templates-search-input"
                />
            </div>

            {/* Loading State */}
            {loading && (
                <div className="templates-loading">
                    <p>Loading templates...</p>
                </div>
            )}

            {/* Searching State */}
            {searching && !loading && (
                <div className="templates-searching">
                    <p>Searching...</p>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="templates-error">
                    <p>Error: {error}</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && templates.length === 0 && (
                <div className="templates-empty">
                    <p>No templates found.</p>
                </div>
            )}

            {/* Templates Grid */}
            {!loading && !error && templates.length > 0 && (
                <div className="templates-grid">
                    {templates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onSelect={handleSelectTemplate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
