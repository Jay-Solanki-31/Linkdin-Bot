import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { aiQueue } from '../queue/ai.queue.js';
import { fetcherQueue } from '../queue/fetcher.queue.js';
import { linkedinQueue } from '../queue/linkedin.queue.js'

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(aiQueue, { readOnlyMode: false }),
    new BullMQAdapter(fetcherQueue, { readOnlyMode: false }),
    new BullMQAdapter(linkedinQueue, {readOnlyMode: false}),
  ],
  serverAdapter,
});

export default serverAdapter;
