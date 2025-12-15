import { renderHook, act } from '@testing-library/react';
import { useAI } from '../../hooks/useAI';

// Mock fetch
global.fetch = jest.fn();

describe('useAI Hook', () => {
    let mockEditor;
    let mockWrapper;
    let mockSelected;

    beforeEach(() => {
        fetch.mockClear();

        mockWrapper = {
            get: jest.fn((prop) => {
                if (prop === 'tagName') return 'body';
                if (prop === 'components') return { each: jest.fn(), length: 0 };
                return null;
            }),
            getId: jest.fn(() => 'wrapper-id'),
            getClasses: jest.fn(() => []),
            is: jest.fn(() => false),
            components: jest.fn(),
            setComponents: jest.fn(),
        };

        mockSelected = {
            get: jest.fn((prop) => {
                if (prop === 'tagName') return 'div';
                return null;
            }),
            getId: jest.fn(() => 'selected-id'),
            getClasses: jest.fn(() => ['selected-class']),
            toHTML: jest.fn(() => '<div>Selected</div>'),
            is: jest.fn(() => false),
            addStyle: jest.fn(),
            components: jest.fn(),
            append: jest.fn(),
            remove: jest.fn(),
            addClass: jest.fn(),
        };

        mockEditor = {
            getWrapper: jest.fn(() => mockWrapper),
            getSelected: jest.fn(() => null), // Default no selection
            setComponents: jest.fn(),
        };
    });

    test('should return initial state', () => {
        const { result } = renderHook(() => useAI());
        expect(result.current.isThinking).toBe(false);
        expect(typeof result.current.generateResponse).toBe('function');
    });

    test('should call API with wrapper context if no selection', async () => {
        const { result } = renderHook(() => useAI());

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Response' } }]
            })
        });

        await act(async () => {
            await result.current.generateResponse(
                mockEditor,
                "Generate a page",
                [],
                null,
                jest.fn(),
                jest.fn()
            );
        });

        expect(fetch).toHaveBeenCalled();
        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body.messages[0].content).toContain('ENTIRE PAGE (body wrapper)');
    });

    test('should execute tool generate_whole_page', async () => {
        const { result } = renderHook(() => useAI());

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        tool_calls: [{
                            function: {
                                name: 'generate_whole_page',
                                arguments: JSON.stringify({ html: '<div>New Page</div>' })
                            }
                        }]
                    }
                }]
            })
        });

        await act(async () => {
            await result.current.generateResponse(
                mockEditor,
                "Make a page",
                [],
                null,
                jest.fn(),
                jest.fn()
            );
        });

        expect(mockEditor.setComponents).toHaveBeenCalledWith('<div>New Page</div>');
    });

    test('should execute tool style_element on selected component', async () => {
        mockEditor.getSelected.mockReturnValue(mockSelected);
        const { result } = renderHook(() => useAI());

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        tool_calls: [{
                            function: {
                                name: 'style_element',
                                arguments: JSON.stringify({ css: { color: 'red' } })
                            }
                        }]
                    }
                }]
            })
        });

        await act(async () => {
            await result.current.generateResponse(
                mockEditor,
                "Make it red",
                [],
                mockSelected,
                jest.fn(),
                jest.fn()
            );
        });

        expect(mockSelected.addStyle).toHaveBeenCalledWith({ color: 'red' });
    });
});
