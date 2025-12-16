
import { createClient } from '../utils/supabase/client';
import { supabaseService } from '../services/supabaseService';

// Define the mock structure inside the factory to avoid hoisting issues
jest.mock('../utils/supabase/client', () => {
    const mockSelect = jest.fn();
    const mockInsert = jest.fn();
    const mockUpsert = jest.fn();
    const mockEq = jest.fn();
    const mockSingle = jest.fn();
    const mockOrder = jest.fn();

    // Chainable
    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpsert.mockReturnThis();
    mockEq.mockReturnThis();
    mockOrder.mockReturnThis();
    mockSingle.mockResolvedValue({ data: {}, error: null });

    const mockFrom = jest.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        upsert: mockUpsert,
        eq: mockEq,
        single: mockSingle,
        order: mockOrder
    }));

    const mockAuth = {
        getUser: jest.fn(),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
    };

    const mockSupabase = {
        from: mockFrom,
        auth: mockAuth,
    };

    return {
        createClient: jest.fn(() => mockSupabase)
    };
});

describe('Supabase Integration Tests', () => {
    let mockSupabase;

    beforeAll(() => {
        // Get the mock instance that was returned
        // Since createClient is a jest.fn and was called by the service import,
        // we can grab the result. 
        // Note: service calls it once at top level.
        // But checking `createClient` calls:
        if (createClient.mock.results[0]) {
            mockSupabase = createClient.mock.results[0].value;
        } else {
            // Fallback if not called yet (should be called by import)
            mockSupabase = createClient();
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset default behaviors if needed
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
    });

    describe('Authentication Flows', () => {
        it('should initialize supabase client correctly', () => {
            createClient();
            expect(createClient).toHaveBeenCalled();
        });
    });

    describe('Data Persistence Service', () => {
        it('savePage should upsert data to "pages" table', async () => {
            const pageId = 'page-1';
            const pageData = { name: 'My Page', content: { foo: 'bar' } };
            const userId = 'test-user';

            // Mock auth user
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });

            // Mock upsert success
            const mockUpsertReturn = mockSupabase.from().upsert();
            mockUpsertReturn.select.mockReturnThis();
            mockUpsertReturn.single.mockResolvedValue({ data: { id: pageId }, error: null });

            await supabaseService.savePage(pageId, pageData);

            expect(mockSupabase.from).toHaveBeenCalledWith('pages');

            // Verify upsert was called with correct structure
            const upsertCall = mockUpsertReturn.upsert.mock.calls[0][0]; // Getting spy from the chain?
            // Wait, we can't easily access the inner spy created inside the factory unless we exposed it.
            // But we can access it via `mockSupabase.from().upsert` if it returns the SAME spy object.
            // In the factory: `const mockFrom = jest.fn(() => ({ ... }))`.
            // It returns a NEW object every time `from()` is called? 
            // My factory defined `const mockFrom = jest.fn(() => ({ ... }))`.
            // And inside that object, `upsert: mockUpsert`. 
            // `mockUpsert` is defined via closure but NOT exposed to us here directly.
            // So `mockSupabase.from().upsert` is a Jest Spy? Yes.
            // And `mockSupabase.from` calls return objects that use the SAME `mockUpsert` function? 
            // YES, because `mockFrom` closure captures `mockUpsert`.

            // So we can inspect `mockSupabase.from().upsert`?
            // `mockSupabase.from()` returns the object. `object.upsert` is the function.
            // Since `mockFrom` is consistent, `mockUpsert` is shared.

            // But how do we get a reference to `mockUpsert`?
            // `mockSupabase.from().upsert` gives us the function.
            // Is it the same function instance across calls? Yes.

            expect(mockSupabase.from().upsert).toHaveBeenCalledWith(expect.objectContaining({
                id: pageId,
                user_id: userId,
                name: 'My Page'
            }));
        });

        it('loadPage should select data from "pages" table', async () => {
            const pageId = 'page-1';

            // Mock chain
            // select -> eq -> single
            const mockEq = mockSupabase.from().select().eq;
            mockEq.mockReturnThis();
            const mockSingle = mockSupabase.from().select().single; // Wait, select() returns `this`.

            // The chain is: from().select().eq().single()
            // We need to ensure the mocks return `this` correctly which we did in factory.

            // Clean mocks
            jest.clearAllMocks();

            // Set expected return
            // Access inner single spy?
            // `mockSupabase.from().select().eq().single` is the spy.
            // But `select()` returns the object containing `eq`, etc.

            // We need to set the implementation of `single` for this call.
            // The factory `mockSingle` is shared.
            // So `mockSupabase.from().single` refers to `mockSingle`.
            // Wait, `from()` returns object with schema methods.
            // My factory has `single` on the root of `from()` return? Yes.
            // But `loadPage` does `.select().eq().single()`.
            // My factory `mockSelect` returns `this` (the object from `from`?). 
            // If `mockSelect.mockReturnThis()` is called on `mockSelect`, `this` is dependencies?
            // `mockSelect` is a property of the object returned by `from`.
            // When called as `obj.select()`, `this` is `obj`.
            // So yes, it returns the object with all methods.

            // So `mockSupabase.from().single` is the same spy as `mockSupabase.from().select().single`.

            // We can interact with it.
            const singleSpy = mockSupabase.from().single;
            singleSpy.mockResolvedValue({ data: { id: pageId, content: {} }, error: null });

            await supabaseService.loadPage(pageId);

            expect(mockSupabase.from).toHaveBeenCalledWith('pages');
            const eqSpy = mockSupabase.from().eq;
            expect(eqSpy).toHaveBeenCalledWith('id', pageId);
        });
    });
});
