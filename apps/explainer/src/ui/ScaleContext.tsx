import { createContext, useContext } from 'react';

/**
 * The on-screen scale of the content being drawn (1 = authored size). Labels
 * stamp it into `data-scale` so the text tests can check on-screen sizes.
 */
export const ScaleContext = createContext(1);

export const useContentScale = (): number => useContext(ScaleContext);
