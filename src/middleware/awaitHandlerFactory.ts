import { Request, Response, NextFunction } from 'express';

export type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const awaitHandlerFactory = (middleware: AsyncRequestHandler) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await middleware(req, res, next);
        } catch (err) {
            next(err);
        }
    };
};