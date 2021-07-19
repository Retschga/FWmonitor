import { Request, Response, NextFunction } from 'express';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const awaitHandlerFactory = (middleware: AsyncRequestHandler) => {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await middleware(req, res, next);
        } catch (err) {
            next(err);
        }
    };
};
