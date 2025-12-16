import { AI_TOOLS } from '../../utils/aiTools';

describe('AI Tools Definition', () => {
    test('should define key tools', () => {
        const toolNames = AI_TOOLS.map(t => t.function.name);
        expect(toolNames).toContain('style_element');
        expect(toolNames).toContain('update_inner_content');
        expect(toolNames).toContain('append_component');
        expect(toolNames).toContain('generate_whole_page');
        expect(toolNames).toContain('delete_component');
        expect(toolNames).toContain('add_class');
        expect(toolNames).toContain('search_image');
    });

    test('generate_whole_page should require html parameter', () => {
        const tool = AI_TOOLS.find(t => t.function.name === 'generate_whole_page');
        expect(tool.function.parameters.required).toContain('html');
    });

    test('add_class should require className parameter', () => {
        const tool = AI_TOOLS.find(t => t.function.name === 'add_class');
        expect(tool.function.parameters.required).toContain('className');
    });

    test('search_image should require query parameter', () => {
        const tool = AI_TOOLS.find(t => t.function.name === 'search_image');
        expect(tool).toBeDefined();
        expect(tool.function.parameters.required).toContain('query');
    });

    test('search_image should have optional color and orientation enums', () => {
        const tool = AI_TOOLS.find(t => t.function.name === 'search_image');
        expect(tool.function.parameters.properties.color.enum).toContain('blue');
        expect(tool.function.parameters.properties.color.enum).toContain('red');
        expect(tool.function.parameters.properties.orientation.enum).toContain('landscape');
        expect(tool.function.parameters.properties.orientation.enum).toContain('portrait');
    });
});
