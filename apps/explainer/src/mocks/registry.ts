/** ContentKey → mock component. The timeline names content; this draws it. */
import type { ComponentType } from 'react';
import type { ContentKey } from '../timeline/actors';
import { DeadlineEngine } from './money/DeadlineEngine';
import { FineNode } from './money/FineNode';
import { PaySilo } from './money/PaySilo';
import { ChatSilo } from './pact/ChatSilo';
import { PoolNode } from './pact/PoolNode';
import { PayoutScreen } from './pot/PayoutScreen';
import { PhoneDashboard } from './pot/PhoneDashboard';
import { PotNode } from './pot/PotNode';
import type { MockProps } from './shared/types';
import { CheckInTile, FinesTile, PoolTile, PotTile } from './tiles';
import { CheckInNode } from './tracker/CheckInNode';
import { LiveCheckIn } from './tracker/LiveCheckIn';
import { SheetSilo } from './tracker/SheetSilo';

export const MOCKS: Record<ContentKey, ComponentType<MockProps>> = {
  'chat-silo': ChatSilo,
  'sheet-silo': SheetSilo,
  'pay-silo': PaySilo,
  'pool-node': PoolNode,
  'checkin-node': CheckInNode,
  'fine-node': FineNode,
  'pot-node': PotNode,
  'live-checkin': LiveCheckIn,
  'deadline-engine': DeadlineEngine,
  'phone-dashboard': PhoneDashboard,
  'pool-tile': PoolTile,
  'checkin-tile': CheckInTile,
  'fines-tile': FinesTile,
  'pot-tile': PotTile,
  'payout-screen': PayoutScreen,
};
