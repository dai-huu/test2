import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { requireAuth, validateRequest } from '@sgtickets/common';
import { Ticket } from '../models/ticket';
import { TicketCreatedPublisher } from '../events/publishers/ticket-created-publisher';
import { natsWrapper } from '../nats-wrapper';
import { tracer } from '../tracer';

const router = express.Router();

router.post(
  '/api/tickets',
  requireAuth,
  [
    body('title').not().isEmpty().withMessage('Title is required'),
    body('price')
      .isFloat({ gt: 0 })
      .withMessage('Price must be greater than 0'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { title, price } = req.body;

    const ticket = Ticket.build({
      title,
      price,
      userId: req.currentUser!.id,
    });
    await ticket.save();
    const payload: any = {
      id: ticket.id,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId,
      version: ticket.version,
    };
    try {
      const span = (req as any).span;
      if (span) {
        const carrier: Record<string, string> = {};
        (tracer as any).inject(span.context(), 'text_map', carrier);
        payload._trace = carrier;
      }
    } catch (e) {}
    new TicketCreatedPublisher(natsWrapper.client).publish(payload);

    res.status(201).send(ticket);
  }
);

export { router as createTicketRouter };
