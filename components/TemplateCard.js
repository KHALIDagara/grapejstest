'use client';
import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

export default function TemplateCard({ template, onSelect }) {
    const iframeRef = useRef(null);

    useEffect(() => {
        // Render sanitized HTML in iframe
        if (iframeRef.current && template.thumbnail_html) {
            const iframe = iframeRef.current;
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

            if (iframeDoc) {
                const sanitizedHTML = DOMPurify.sanitize(template.thumbnail_html, {
                    FORCE_BODY: true,
                    ADD_ATTR: ['style', 'class']
                });

                iframeDoc.open();
                iframeDoc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {
                                margin: 0;
                                padding: 0;
                                overflow: hidden;
                                transform-origin: top left;
                                transform: scale(0.25);
                                width: 400%;
                                height: 400%;
                            }
                        </style>
                    </head>
                    <body>${sanitizedHTML}</body>
                    </html>
                `);
                iframeDoc.close();
            }
        }
    }, [template.thumbnail_html]);

    const handleSelect = () => {
        console.log('[TemplateCard] Button clicked!', template.name);
        if (onSelect) {
            console.log('[TemplateCard] Calling onSelect');
            onSelect(template);
        } else {
            console.error('[TemplateCard] onSelect is undefined!');
        }
    };

    // Limit tags to 3
    const displayTags = template.tags ? template.tags.slice(0, 3) : [];

    return (
        <div className="template-card">
            {/* Preview */}
            <div className="template-preview">
                {template.thumbnail_html ? (
                    <iframe
                        ref={iframeRef}
                        title="Template preview"
                        sandbox="allow-same-origin"
                        className="template-iframe"
                    />
                ) : (
                    <div className="template-placeholder">
                        No Preview Available
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="template-info">
                <h3 className="template-name">{template.name}</h3>

                {template.description && (
                    <p className="template-description">{template.description}</p>
                )}

                {/* Tags */}
                {displayTags.length > 0 && (
                    <div className="template-tags">
                        {displayTags.map((tag, index) => (
                            <span
                                key={index}
                                data-testid={`template-tag-${index}`}
                                className="template-tag"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Select Button */}
                <button
                    onClick={handleSelect}
                    className="template-select-btn"
                >
                    Select Template
                </button>
            </div>
        </div>
    );
}
