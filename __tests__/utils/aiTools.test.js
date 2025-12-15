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
    });

    test('generate_whole_page should require html parameter', () => {
        const tool = AI_TOOLS.find(t => t.function.name === 'generate_whole_page');
        expect(tool.function.parameters.required).toContain('html');
    });

    test('add_class should require className parameter', () => {
        const tool = AI_TOOLS.find(t => t.function.name === 'add_class');
        expect(tool.function.parameters.required).toContain('className');
    });
});
