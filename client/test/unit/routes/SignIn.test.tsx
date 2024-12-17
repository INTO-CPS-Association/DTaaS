import * as React from 'react';
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignIn from 'route/auth/Signin';
import { useAuth } from 'react-oidc-context';
import { getValidationResults } from 'util/config'; // Globally mocked

jest.unmock('route/auth/Signin');
jest.mock('react-oidc-context');

describe('SignIn', () => {
    const signinRedirect = jest.fn();

    beforeEach(() => {
        (useAuth as jest.Mock).mockReturnValue({
            signinRedirect,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders config loading', async () => {
        // Create a promise that won't resolve immediately to simulate loading state
        let resolveValidation: (value: unknown) => void;
        const validationPromise = new Promise((resolve) => {
            resolveValidation = resolve;
        });

        (getValidationResults as jest.Mock).mockReturnValue(validationPromise);

        const renderResult = await act(async () =>
            render(
                <MemoryRouter>
                    <SignIn />
                </MemoryRouter>,
            ),
        );

        expect(
            renderResult.getByText('Verifying configuration'),
        ).toBeInTheDocument();
        expect(renderResult.getByRole('progressbar')).toBeInTheDocument();

        // Resolve the promise to allow the component to complete loading
        await act(async () => {
            resolveValidation({});
        });
    });

    it('renders the SignIn button', async () => {
        (getValidationResults as jest.Mock).mockReturnValue(
            Promise.resolve({}),
        );
        await act(async () => {
            render(
                <MemoryRouter>
                    <SignIn />
                </MemoryRouter>,
            );
        });
        await waitFor(() =>
            screen.getByRole('button', { name: /Sign In With GitLab/i }),
        );
        expect(
            screen.getByRole('button', { name: /Sign In With GitLab/i }),
        ).toBeInTheDocument();
    });

    it('renders the config problems', async () => {
        const res = {
            REACT_APP_URL: {
                error:
                    'An error occurred when fetching https://example.com: ReferenceError: fetch is not defined',
                status: undefined,
                value: 'https://example.com',
            },
        };
        (getValidationResults as jest.Mock).mockReturnValue(Promise.resolve(res));

        await act(async () => {
            render(
                <MemoryRouter>
                    <SignIn />
                </MemoryRouter>,
            );
        });

        await waitFor(() => {
            expect(screen.getByText(/Config validation failed/i)).toBeInTheDocument();
        });
    });

    it('handles button click', async () => {
        (getValidationResults as jest.Mock).mockReturnValue(
            Promise.resolve({}),
        );
        await act(async () => {
            render(
                <MemoryRouter>
                    <SignIn />
                </MemoryRouter>,
            );
        });
        await waitFor(() =>
            screen.getByRole('button', { name: /Sign In With GitLab/i }),
        );
        const signInButton = screen.getByRole('button', {
            name: /Sign In With GitLab/i,
        });
        fireEvent.click(signInButton);

        expect(signinRedirect).toHaveBeenCalled();
    });
});
