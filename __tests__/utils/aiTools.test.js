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

    test('style_element should have css and optional recursive parameters', () => {
        const tool = AI_TOOLS.find(t => t.function.name === 'style_element');
        expect(tool.function.parameters.required).toContain('css');
        expect(tool.function.parameters.properties).toHaveProperty('recursive');
        expect(tool.function.parameters.properties.recursive.type).toBe('boolean');
    });

    test('add_class should require className parameter', () => {
        const tool = AI_TOOLS.find(t => t.function.name === 'add_class');
        expect(tool.function.parameters.required).toContain('className');
    });

    test('search_image should require query and apply_as parameters', () => {
        const tool = AI_TOOLS.find(t => t.function.name === 'search_image');
        expect(tool).toBeDefined();
        expect(tool.function.parameters.required).toContain('query');
        expect(tool.function.parameters.required).toContain('apply_as');
    });

    test('search_image should have valid option enums', () => {
        const tool = AI_TOOLS.find(t => t.function.name === 'search_image');
        expect(tool.function.parameters.properties.color.enum).toContain('blue');
        expect(tool.function.parameters.properties.orientation.enum).toContain('landscape');
        expect(tool.function.parameters.properties.apply_as.enum).toContain('background');
        expect(tool.function.parameters.properties.apply_as.enum).toContain('img_append');
        expect(tool.function.parameters.properties.apply_as.enum).toContain('img_replace');
    });
});
